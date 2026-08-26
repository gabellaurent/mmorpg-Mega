import { spriteGen } from './engine/spriteGenerator.js';
import { GameMap } from './engine/map.js';
import { Player } from './engine/player.js';
import { Renderer } from './engine/renderer.js';
import { MonsterManager } from './engine/monsterManager.js';
import { NpcManager } from './engine/npcManager.js';
import { ItemManager } from './engine/itemManager.js';
import { NetworkManager } from './services/networkManager.js';
import { AuthUI } from './ui/authUI.js';
import { HudUI } from './ui/hudUI.js';
import { CONFIG } from './config.js';
import { RadialMenu } from './ui/radialMenu.js';
import { Pathfinder } from './engine/pathfinder.js';
import { CorpseManager } from './engine/corpseManager.js';

class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new Renderer(this.canvas);
    this.gameMap = new GameMap();
    this.monsterManager = new MonsterManager(this.gameMap);
    this.npcManager = new NpcManager(this.gameMap);
    this.itemManager = new ItemManager(this.gameMap);
    this.corpseManager = new CorpseManager(this.gameMap);
    
    this.localPlayer = null;
    this.remotePlayers = new Map();
    this.network = null;
    this.hud = null;
    this.radialMenu = null;

    this.keysPressed = {};
    this.lastStepTime = 0;
    this.lastAttackTime = 0;

    this.isPointerDown = false;
    this.pointerTarget = null;
    this.lockedTargetId = null; // ID do Monstro com mira travada (Estilo Tibia)

    this.init();
  }

  init() {
    spriteGen.init();
    this.renderer.resize();
    window.addEventListener('resize', () => this.renderer.resize());

    new AuthUI((characterData) => this.startGame(characterData));
  }

  startGame(characterData) {
    this.localPlayer = new Player({
      name: characterData.name,
      spriteId: characterData.spriteId,
      x: characterData.x,
      y: characterData.y,
      level: 1,
      hp: 100,
      maxHp: 100
    });

    this.radialMenu = new RadialMenu((action) => {
      if (action === 'inventory') this.hud.toggleInventory();
      else if (action === 'map') this.hud.toggleMap();
      else if (action === 'status') this.hud.toggleStatus();
      else if (action === 'chat') {
        this.hud.toggleChat(true);
        const input = document.getElementById('chat-input');
        if (input) input.focus();
      }
    });

    this.network = new NetworkManager(
      this.localPlayer,
      (remoteData) => this.handleRemotePlayerUpdate(remoteData),
      (remoteId) => this.handleRemotePlayerLeave(remoteId),
      (chatPayload) => this.handleChatMessage(chatPayload),
      (hitPayload) => this.handleRemoteMonsterHit(hitPayload),
      (respawnPayload) => this.handleRemoteMonsterRespawn(respawnPayload),
      (itemPayload) => this.itemManager.addGroundItem(itemPayload),
      (pickupPayload) => this.itemManager.removeGroundItem(pickupPayload.id)
    );
    this.network.onCorpseSpawn = (corpseData) => this.corpseManager.spawnCorpse(corpseData);
    this.network.onCorpseMove = (payload) => this.corpseManager.moveCorpse(payload.corpseId, payload.gridX, payload.gridY);
    this.network.onMonsterMove = (payload) => this.monsterManager.handleRemoteMonsterMove(payload);
    this.network.onPlayerDamage = (payload) => this.handleRemotePlayerDamage(payload);
    this.currentMapId = 'map-1';
    this.network.connect('map-1');
    this.hydrateWorldState('map-1');

    this.hud = new HudUI(
      this.localPlayer,
      (text) => {
        this.localPlayer.setChatBubble(text);
        this.network.sendChat(text);
      },
      () => {
        this.renderer.showGridOverlay = !this.renderer.showGridOverlay;
      },
      () => {},
      (slotIndex) => this.handleUseItem(slotIndex),
      (slotIndex) => this.handleDropItem(slotIndex)
    );

    this.gameStartTime = Date.now();
    this.setupControls();
    requestAnimationFrame((now) => this.gameLoop(now));

    this.hud.addChatMessage('Sistema', '🌟 <strong>Zero-HUD Ativo:</strong> Clique/Toque no seu <strong>Personagem</strong>, ou pressione <strong>[Tab]</strong> / <strong>[I]</strong> para abrir a Roda Radial (Bolsa, Mapa, Status, Chat)!', true);
  }

  async hydrateWorldState(mapId = 'map-1') {
    if (this.corpseManager && this.network) {
      await this.corpseManager.loadFromDatabase(this.network, mapId);
    }
    if (this.monsterManager && this.network) {
      await this.monsterManager.loadFromDatabase(this.network, mapId);
    }
  }

  performAttack(explicitTarget = null) {
    if (!this.localPlayer) return;
    const now = performance.now();
    if (now - this.lastAttackTime < 800) return;

    let targetRat = explicitTarget;

    if (!targetRat && this.lockedTargetId) {
      targetRat = this.monsterManager.monsters.get(this.lockedTargetId);
      if (targetRat && targetRat.isDead) {
        targetRat = null;
        this.lockedTargetId = null;
      }
    }

    if (targetRat && !targetRat.isDead) {
      const dist = Math.max(Math.abs(targetRat.gridX - this.localPlayer.gridX), Math.abs(targetRat.gridY - this.localPlayer.gridY));
      const maxRange = this.getMaxAttackRange();
      if (dist <= maxRange) {
        this.lastAttackTime = now;
        const dmg = Math.floor(Math.random() * 9) + 8;
        const died = targetRat.takeDamage(dmg);

        this.monsterManager.addFloatingText(`-${dmg}`, targetRat.gridX, targetRat.gridY, '#f56565');
        this.network.sendMonsterHit(targetRat.id, dmg, targetRat.hp, this.localPlayer.name);

        if (died) {
          this.lockedTargetId = null;
          const gainedXp = 25;
          const leveledUp = this.localPlayer.addXp(gainedXp);
          this.monsterManager.addFloatingText(`+${gainedXp} EXP`, this.localPlayer.gridX, this.localPlayer.gridY, '#9f7aea');

          // Gerar loot do monstro para ser armazenado DENTRO do corpo!
          const monsterLoot = [
            { itemId: 'gold', quantity: Math.floor(Math.random() * 8) + 3 }
          ];

          if (Math.random() < 0.45) {
            monsterLoot.push({ itemId: 'health_potion', quantity: 1, itemConfig: CONFIG.ITEMS['health_potion'] });
          }
          if (Math.random() < 0.25) {
            monsterLoot.push({ itemId: 'rat_tail', quantity: 1, itemConfig: CONFIG.ITEMS['rat_tail'] });
          }

          const corpseData = {
            ownerName: targetRat.name,
            entityType: 'monster',
            gridX: targetRat.gridX,
            gridY: targetRat.gridY,
            loot: monsterLoot,
            createdAt: Date.now()
          };

          const spawnedCorpse = this.corpseManager.spawnCorpse(corpseData);
          if (this.network) {
            this.network.sendCorpseSpawn(spawnedCorpse);
            this.network.saveCorpseToDatabase(spawnedCorpse, this.currentMapId || 'map-1');
            const respawnTime = Date.now() + 8000;
            this.network.saveMonsterStateToDatabase(targetRat.id, true, respawnTime, this.currentMapId || 'map-1');
          }

          this.hud.addChatMessage('Sistema', `💀 <strong>${targetRat.name}</strong> morreu! Clique no corpo para saquear os itens.`, true);

          if (leveledUp) {
            this.hud.addChatMessage('Sistema', `✨ <strong>LEVEL UP!</strong> Você alcançou o Nível ${this.localPlayer.level}! Sua vida foi restaurada!`, true);
          } else {
            this.hud.addChatMessage('Sistema', `⚔️ Você derrotou o <strong>${targetRat.name}</strong> e ganhou +${gainedXp} EXP!`, true);
          }

          const ratId = targetRat.id;
          setTimeout(() => {
            targetRat.respawn();
            if (this.network) {
              this.network.sendMonsterRespawn(ratId);
              this.network.saveMonsterStateToDatabase(ratId, false, 0, this.currentMapId || 'map-1');
            }
            this.hud.addChatMessage('Sistema', `⚠️ Um <strong>${targetRat.name}</strong> renasceu nos cantos do mapa!`, true);
          }, 8000);
        }

        this.hud.updatePlayerStats();
      }
    }
  }

  handleUseItem(slotIndex) {
    if (!this.localPlayer) return;
    const result = this.localPlayer.useItem(slotIndex);
    if (!result) return;

    if (result.success) {
      this.monsterManager.addFloatingText(`+${result.healed} HP`, this.localPlayer.gridX, this.localPlayer.gridY, '#48bb78');
      this.hud.addChatMessage('Sistema', `🍷 Você consumiu <strong>${result.itemConfig.name}</strong> e recuperou <strong>+${result.healed} HP</strong>!`, true);
      this.hud.updatePlayerStats();
    } else if (result.reason) {
      this.hud.addChatMessage('Sistema', `⚠️ ${result.reason}`, true);
    }
  }

  handleDropItem(slotIndex) {
    if (!this.localPlayer) return;
    const removed = this.localPlayer.removeItem(slotIndex, 1);
    if (!removed) return;

    const groundItemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const groundItemData = {
      id: groundItemId,
      itemId: removed.itemId,
      quantity: removed.quantity,
      gridX: this.localPlayer.gridX,
      gridY: this.localPlayer.gridY
    };

    this.itemManager.addGroundItem(groundItemData);
    if (this.network) {
      this.network.sendItemSpawn(groundItemData);
    }
    const itemConfig = CONFIG.ITEMS[removed.itemId];
    const itemName = itemConfig ? itemConfig.name : removed.itemId;
    this.hud.addChatMessage('Sistema', `🎒 Você descartou <strong>${itemName}</strong> no chão.`, true);
    this.hud.updatePlayerStats();
  }

  handleRemoteMonsterHit(payload) {
    const rat = this.monsterManager.monsters.get(payload.ratId);
    if (!rat || rat.isDead) return;

    if (payload.currentHp !== undefined) {
      rat.hp = payload.currentHp;
      if (rat.hp <= 0) rat.isDead = true;
    } else {
      rat.takeDamage(payload.damage);
    }

    this.monsterManager.addFloatingText(`-${payload.damage}`, rat.gridX, rat.gridY, '#f56565');

    if (rat.isDead && this.hud) {
      this.hud.addChatMessage('Sistema', `⚔️ <strong>${payload.attackerName}</strong> derrotou o <strong>${rat.name}</strong>!`, true);
    }
  }

  handleRemotePlayerDamage(payload) {
    if (payload.playerId === this.localPlayer.id) return;
    const rPlayer = this.remotePlayers.get(payload.playerId);
    if (rPlayer) {
      if (payload.currentHp !== undefined) {
        rPlayer.hp = payload.currentHp;
      } else {
        rPlayer.hp = Math.max(0, rPlayer.hp - payload.damage);
      }
      if (this.monsterManager) {
        this.monsterManager.addFloatingText(`-${payload.damage}`, rPlayer.gridX, rPlayer.gridY, '#f56565');
      }
    }
  }

  handleRemoteMonsterRespawn(payload) {
    const rat = this.monsterManager.monsters.get(payload.ratId);
    if (rat) {
      rat.respawn();
    }
  }

  handleRemotePlayerUpdate(data) {
    if (data.id === this.localPlayer.id) return;

    let rPlayer = this.remotePlayers.get(data.id);
    if (!rPlayer) {
      rPlayer = new Player({
        id: data.id,
        name: data.name,
        spriteId: data.spriteId || 'knight',
        x: data.x,
        y: data.y,
        level: data.level || 1,
        hp: data.hp || 100
      });
      this.remotePlayers.set(data.id, rPlayer);
      if (this.hud) {
        this.hud.addChatMessage('Sistema', `👋 <strong>${data.name}</strong> entrou no mapa!`, true);
      }
    } else {
      if (rPlayer.gridX !== data.x || rPlayer.gridY !== data.y) {
        rPlayer.moveTo(data.x, data.y, data.direction || rPlayer.direction);
      } else {
        rPlayer.direction = data.direction || rPlayer.direction;
      }
    }

    if (this.hud) {
      this.hud.updateOnlineList(this.remotePlayers);
    }
  }

  handleRemotePlayerLeave(id) {
    const rPlayer = this.remotePlayers.get(id);
    if (rPlayer) {
      if (this.hud) {
        this.hud.addChatMessage('Sistema', `🏃 <strong>${rPlayer.name}</strong> saiu do mundo.`, true);
      }
      this.remotePlayers.delete(id);
      if (this.hud) {
        this.hud.updateOnlineList(this.remotePlayers);
      }
    }
  }

  handleChatMessage(payload) {
    if (payload.id === this.localPlayer.id) {
      this.hud.addChatMessage(payload.sender, payload.text);
      return;
    }

    const rPlayer = this.remotePlayers.get(payload.id);
    if (rPlayer) {
      rPlayer.setChatBubble(payload.text);
    }
    if (this.hud) {
      this.hud.addChatMessage(payload.sender, payload.text);
    }
  }

  getGridCoordsFromClient(clientX, clientY) {
    if (!this.renderer) return null;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    // Posição do ponteiro relativa aos limites do canvas na tela (pixels CSS)
    const canvasPixelX = clientX - rect.left;
    const canvasPixelY = clientY - rect.top;

    // Escalonamento para a resolução interna real do Canvas HTML5 (pixels de jogo)
    const internalX = (canvasPixelX / rect.width) * this.canvas.width;
    const internalY = (canvasPixelY / rect.height) * this.canvas.height;

    // Adicionar a posição real da câmera (cameraX e cameraY) para precisão absoluta, mesmo nas bordas do mapa!
    const clickWorldX = this.renderer.cameraX + internalX;
    const clickWorldY = this.renderer.cameraY + internalY;

    const tileSize = CONFIG.TILE_SIZE;

    return {
      worldX: clickWorldX,
      worldY: clickWorldY,
      gridX: Math.floor(clickWorldX / tileSize),
      gridY: Math.floor(clickWorldY / tileSize)
    };
  }

  setupControls() {
    window.addEventListener('keydown', (e) => {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

      if (e.key === 'Tab') {
        e.preventDefault();
        if (this.radialMenu) {
          this.radialMenu.toggle();
        }
        return;
      }

      const moveKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D', ' ', 'Space'];
      if (moveKeys.includes(e.key) || e.code === 'Space') {
        e.preventDefault();
        return; // Desativa barra de espaço e setas
      }
    });

    // Gestos de Toque no Celular (Toque Longo de 0.4s ou 3 Dedos para abrir Menu Radial)
    let touchHoldTimer = null;

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 3) {
        e.preventDefault();
        if (this.radialMenu) {
          this.radialMenu.toggle(e.touches[0].clientX, e.touches[0].clientY);
        }
        return;
      }

      if (e.touches.length === 1) {
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        touchHoldTimer = setTimeout(() => {
          if (this.radialMenu) {
            this.radialMenu.open(touchX, touchY);
          }
        }, 450);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', () => {
      if (touchHoldTimer) clearTimeout(touchHoldTimer);
    });

    this.canvas.addEventListener('touchmove', () => {
      if (touchHoldTimer) clearTimeout(touchHoldTimer);
    });

    // Desativar menu de contexto do botão direito no jogo
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (e.target && (e.target.closest('.inventory-card') || e.target.closest('.action-bar-card') || e.target.closest('.hud-card') || e.target.closest('#auth-container'))) {
        return;
      }
      this.handleRightClick(e.clientX, e.clientY);
    });

    // Variáveis de rastreamento de Arraste (Drag & Drop) de Corpos e Itens
    let dragStartCoords = null;
    let draggedCorpse = null;

    // Atualização dinâmica do Cursor do Mouse no Canvas (Mãozinha / Garrinha ao Arrastar)
    this.canvas.addEventListener('pointermove', (e) => {
      const coords = this.getGridCoordsFromClient(e.clientX, e.clientY);
      if (!coords || !this.corpseManager || !this.localPlayer) return;

      if (draggedCorpse) {
        this.canvas.style.cursor = 'grabbing';
      } else {
        const corpseUnderMouse = this.corpseManager.getCorpseAt(coords.gridX, coords.gridY);
        if (corpseUnderMouse) {
          const distToPlayer = Math.max(Math.abs(corpseUnderMouse.gridX - this.localPlayer.gridX), Math.abs(corpseUnderMouse.gridY - this.localPlayer.gridY));
          if (distToPlayer <= 1.5) {
            this.canvas.style.cursor = 'grab';
            return;
          }
        }
        this.canvas.style.cursor = 'crosshair';
      }
    });

    // Captura de Toque / Clique Esquerdo EXCLUSIVAMENTE dentro do Canvas do Jogo
    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (this.gameStartTime && Date.now() - this.gameStartTime < 600) return;

      const coords = this.getGridCoordsFromClient(e.clientX, e.clientY);
      if (!coords) return;

      dragStartCoords = coords;
      if (this.corpseManager) {
        draggedCorpse = this.corpseManager.getCorpseAt(coords.gridX, coords.gridY);
        if (draggedCorpse) {
          const distToPlayer = Math.max(Math.abs(draggedCorpse.gridX - this.localPlayer.gridX), Math.abs(draggedCorpse.gridY - this.localPlayer.gridY));
          if (distToPlayer <= 1.5) {
            this.canvas.style.cursor = 'grabbing';
          }
        }
      } else {
        draggedCorpse = null;
      }

      // 0. Toque / Clique Direto no Próprio Personagem (Restrito ao Quadro Exato do GRID)!
      if (this.localPlayer && this.localPlayer.gridX === coords.gridX && this.localPlayer.gridY === coords.gridY) {
        if (this.radialMenu) {
          this.radialMenu.toggle(e.clientX, e.clientY);
        }
        return;
      }

      // 0.5. Toque / Clique em NPC Comerciante (Abrir Loja de Poções/Armas se o Jogador estiver perto)
      if (this.npcManager && this.hud && this.localPlayer) {
        const npc = this.npcManager.getNpcAt(coords.gridX, coords.gridY);
        if (npc && (npc.type === 'merchant' || npc.id.startsWith('merchant_'))) {
          const distToPlayer = Math.max(Math.abs(npc.gridX - this.localPlayer.gridX), Math.abs(npc.gridY - this.localPlayer.gridY));
          if (distToPlayer <= 2.5) {
            if (touchHoldTimer) clearTimeout(touchHoldTimer);
            if (this.localPlayer) this.localPlayer.clearPath();
            if (this.radialMenu) this.radialMenu.close();
            npc.setChatBubble(`Bem-vindo à minha loja! 🛍️`);
            const shopId = this.hud.shops[npc.id] ? npc.id : 'merchant_magic';
            this.hud.openShop(shopId, this.monsterManager);
            dragStartCoords = null;
            draggedCorpse = null;
            return;
          }
        }
      }

      // 1. Toque em Monstro Vivo (Restrito ao Quadro Exato do GRID onde o Monstro está)!
      let clickedRat = null;

      if (this.monsterManager) {
        this.monsterManager.monsters.forEach(rat => {
          if (!rat.isDead && rat.gridX === coords.gridX && rat.gridY === coords.gridY) {
            clickedRat = rat;
          }
        });
      }

      if (clickedRat) {
        if (touchHoldTimer) clearTimeout(touchHoldTimer);
        if (this.localPlayer) this.localPlayer.clearPath();

        if (this.lockedTargetId === clickedRat.id) {
          // Clique no monstro já selecionado -> Destrava a mira e cancela o ataque!
          this.lockedTargetId = null;
          this.hud.addChatMessage('Sistema', `🛑 Mira destravada de <strong>${clickedRat.name}</strong>.`, true);
        } else {
          // Clique em novo monstro -> Trava a mira e inicia ataque!
          this.lockedTargetId = clickedRat.id;
          const dist = Math.max(Math.abs(clickedRat.gridX - this.localPlayer.gridX), Math.abs(clickedRat.gridY - this.localPlayer.gridY));
          this.hud.addChatMessage('Sistema', `🎯 <strong>MIRA TRAVADA:</strong> <strong>${clickedRat.name}</strong> selecionado!`, true);
        }
        return;
      }
    });

    // Evento PointerUp: Processar Clique Simples (Caminhar/Saquear) ou Arraste (Drag & Drop de Corpos)
    this.canvas.addEventListener('pointerup', (e) => {
      if (e.button !== 0) return;
      if (this.gameStartTime && Date.now() - this.gameStartTime < 600) return;
      this.canvas.style.cursor = 'crosshair';

      if (!dragStartCoords || !this.localPlayer) {
        dragStartCoords = null;
        draggedCorpse = null;
        return;
      }

      const endCoords = this.getGridCoordsFromClient(e.clientX, e.clientY);
      if (!endCoords) {
        dragStartCoords = null;
        draggedCorpse = null;
        return;
      }

      // CASO A: O ponteiro foi arrastado e solto em um quadro DIFERENTE -> Ação de Drag & Drop de Corpo!
      if (endCoords.gridX !== dragStartCoords.gridX || endCoords.gridY !== dragStartCoords.gridY) {
        if (draggedCorpse && this.corpseManager) {
          const distToPlayer = Math.max(Math.abs(draggedCorpse.gridX - this.localPlayer.gridX), Math.abs(draggedCorpse.gridY - this.localPlayer.gridY));
          const dragDist = Math.max(Math.abs(endCoords.gridX - dragStartCoords.gridX), Math.abs(endCoords.gridY - dragStartCoords.gridY));
          const isWalkable = this.gameMap ? this.gameMap.isWalkable(endCoords.gridX, endCoords.gridY) : true;

          // Regra de Arraste: Jogador perto do corpo (<= 1.5), destino adjacente ao corpo (<= 1.5) e terreno livre
          if (distToPlayer <= 1.5 && dragDist <= 1.5 && isWalkable) {
            const corpseId = draggedCorpse.id;
            const newX = endCoords.gridX;
            const newY = endCoords.gridY;

            this.corpseManager.moveCorpse(corpseId, newX, newY);

            if (this.network) {
              this.network.sendCorpseMove(corpseId, newX, newY);
              this.network.updateCorpsePositionInDatabase(corpseId, newX, newY);
            }

            if (this.monsterManager) {
              this.monsterManager.addFloatingText('🧲 Arrastou', newX, newY, '#63b3ed');
            }
            this.hud.addChatMessage('Sistema', '🧲 Você arrastou um corpo no chão!', true);
          }
        }
      }
      // CASO B: Clique Simples (soltou no MESMO quadro onde clicou) -> Caminhar, Saquear ou Abrir Loja!
      else {
        // Se houver um NPC Comerciante no quadro clicado: Abrir Loja!
        if (this.npcManager && this.hud && this.localPlayer) {
          const npc = this.npcManager.getNpcAt(endCoords.gridX, endCoords.gridY);
          if (npc && (npc.type === 'merchant' || npc.id.startsWith('merchant_'))) {
            const distToPlayer = Math.max(Math.abs(npc.gridX - this.localPlayer.gridX), Math.abs(npc.gridY - this.localPlayer.gridY));
            if (distToPlayer <= 2.5) {
              if (this.localPlayer) this.localPlayer.clearPath();
              npc.setChatBubble(`Bem-vindo à minha loja! 🛍️`);
              const shopId = this.hud.shops[npc.id] ? npc.id : 'merchant_magic';
              this.hud.openShop(shopId, this.monsterManager);
              dragStartCoords = null;
              draggedCorpse = null;
              return;
            }
          }
        }

        // Se houver um corpo no quadro clicado: saquear se estiver adjacente
        if (this.corpseManager) {
          const corpse = this.corpseManager.getCorpseAt(endCoords.gridX, endCoords.gridY);
          if (corpse) {
            const dist = Math.max(Math.abs(corpse.gridX - this.localPlayer.gridX), Math.abs(corpse.gridY - this.localPlayer.gridY));
            if (dist <= 1.5) {
              const result = this.corpseManager.lootCorpse(corpse.id, this.localPlayer);
              if (result.success) {
                if (this.network) {
                  this.network.updateCorpseInDatabase(corpse.id, corpse.loot);
                }
                const lootedNames = result.lootedItems.map(i => i.itemId === 'gold' ? `+${i.quantity} Ouro` : (CONFIG.ITEMS[i.itemId]?.name || i.itemId)).join(', ');
                this.monsterManager.addFloatingText(`+${lootedNames}`, corpse.gridX, corpse.gridY, '#f6e05e');
                this.hud.addChatMessage('Sistema', `🎒 Você abriu o corpo de <strong>${corpse.ownerName}</strong> e encontrou: <strong>${lootedNames}</strong>!`, true);
                this.hud.updatePlayerStats();
              }
            }
          }
        }

        // Caminhada Point-and-Click até o quadro desejado
        const path = Pathfinder.findPath(
          this.localPlayer.gridX,
          this.localPlayer.gridY,
          endCoords.gridX,
          endCoords.gridY,
          (x, y) => !this.isTileOccupiedByEntity(x, y, this.localPlayer.id)
        );

        if (path && path.length > 0) {
          this.localPlayer.setPath(path);
        }
      }

      dragStartCoords = null;
      draggedCorpse = null;
    });
  }

  getMaxAttackRange() {
    if (!this.localPlayer) return 1;
    const spriteId = this.localPlayer.spriteId;
    if (spriteId === 'paladin') return 5;
    if (spriteId === 'mage') return 4;
    return 1;
  }

  handleRightClick(clientX, clientY) {
    if (!this.localPlayer || !this.monsterManager || !this.renderer) return;

    const coords = this.getGridCoordsFromClient(clientX, clientY);
    if (!coords) return;

    let clickedRat = null;
    let minDistance = 999;

    this.monsterManager.monsters.forEach(rat => {
      if (!rat.isDead && rat.gridX === coords.gridX && rat.gridY === coords.gridY) {
        clickedRat = rat;
      }
    });

    if (clickedRat) {
      if (this.lockedTargetId === clickedRat.id) {
        this.lockedTargetId = null;
        this.hud.addChatMessage('Sistema', `🛑 Mira destravada de <strong>${clickedRat.name}</strong>.`, true);
      } else {
        this.lockedTargetId = clickedRat.id;
        const dist = Math.max(Math.abs(clickedRat.gridX - this.localPlayer.gridX), Math.abs(clickedRat.gridY - this.localPlayer.gridY));
        this.hud.addChatMessage('Sistema', `🎯 <strong>MIRA TRAVADA:</strong> <strong>${clickedRat.name}</strong> selecionado a ${dist} quadros de distância!`, true);
      }
    } else {
      if (this.lockedTargetId) {
        this.lockedTargetId = null;
        this.hud.addChatMessage('Sistema', '🛑 Mira destravada.', true);
      }
    }
  }

  getDirectionFromPointer(target) {
    if (!target) return null;

    const centerX = target.rectWidth / 2;
    const centerY = target.rectHeight / 2;

    const dx = target.x - centerX;
    const dy = target.y - centerY;

    if (Math.hypot(dx, dy) < 15) return null;

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'east' : 'west';
    } else {
      return dy > 0 ? 'south' : 'north';
    }
  }

  switchMap(targetMapId, targetX, targetY) {
    if (!this.localPlayer) return;

    this.lockedTargetId = null;
    this.remotePlayers.clear();
    if (this.hud) {
      this.hud.updateOnlineList(this.remotePlayers);
    }

    this.gameMap = new GameMap(targetMapId);
    this.monsterManager = new MonsterManager(this.gameMap);
    this.npcManager = new NpcManager(this.gameMap);
    this.itemManager = new ItemManager(this.gameMap);
    this.corpseManager = new CorpseManager(this.gameMap);
    this.currentMapId = targetMapId;

    this.localPlayer.gridX = targetX;
    this.localPlayer.gridY = targetY;
    this.localPlayer.renderX = targetX * CONFIG.TILE_SIZE;
    this.localPlayer.renderY = targetY * CONFIG.TILE_SIZE;
    this.localPlayer.startX = this.localPlayer.renderX;
    this.localPlayer.startY = this.localPlayer.renderY;
    this.localPlayer.targetX = this.localPlayer.renderX;
    this.localPlayer.targetY = this.localPlayer.renderY;
    this.localPlayer.isMoving = false;
    this.localPlayer.clearPath();

    if (this.network) {
      this.network.connect(targetMapId);
    }
    this.hydrateWorldState(targetMapId);

    if (this.hud) {
      this.hud.updatePlayerStats();
      if (targetMapId === 'map-2') {
        this.hud.addChatMessage('Sistema', '🌲 Você entrou na <strong>Floresta do Sul</strong>! Cuidado com os ratos selvagens pela vegetação!', true);
      } else {
        this.hud.addChatMessage('Sistema', '🏰 Você retornou à <strong>Vila Principal</strong>!', true);
      }
    }
  }

  isTileOccupiedByEntity(gridX, gridY, excludeEntityId = null) {
    if (!this.gameMap || !this.gameMap.isWalkable(gridX, gridY)) {
      return true;
    }

    if (this.npcManager && this.npcManager.isNpcAt(gridX, gridY)) {
      return true;
    }

    if (this.remotePlayers) {
      for (const [id, rPlayer] of this.remotePlayers) {
        if (id !== excludeEntityId && rPlayer.gridX === gridX && rPlayer.gridY === gridY) {
          return true;
        }
      }
    }

    if (this.localPlayer && excludeEntityId !== this.localPlayer.id) {
      if (this.localPlayer.gridX === gridX && this.localPlayer.gridY === gridY) {
        return true;
      }
    }

    if (this.monsterManager) {
      for (const [mId, rat] of this.monsterManager.monsters) {
        if (mId !== excludeEntityId && !rat.isDead && rat.gridX === gridX && rat.gridY === gridY) {
          return true;
        }
      }
    }

    return false;
  }

  processInput(now) {
    if (!this.localPlayer) return;

    // Execução passo a passo da rota Point-and-Click
    if (!this.localPlayer.isMoving && this.localPlayer.path && this.localPlayer.path.length > 0) {
      const nextTile = this.localPlayer.path.shift();
      const dir = Pathfinder.getDirectionBetween(this.localPlayer.gridX, this.localPlayer.gridY, nextTile.x, nextTile.y);

      const transition = this.gameMap.getTransition(nextTile.x, nextTile.y);
      if (transition) {
        this.localPlayer.clearPath();
        this.switchMap(transition.targetMapId, transition.targetX, transition.targetY);
        return;
      }

      if (!this.isTileOccupiedByEntity(nextTile.x, nextTile.y, this.localPlayer.id)) {
        this.localPlayer.moveTo(nextTile.x, nextTile.y, dir);
        this.network.sendMove(nextTile.x, nextTile.y, dir);
        this.hud.updatePlayerStats();
      } else {
        this.localPlayer.clearPath();
        this.localPlayer.direction = dir;
        this.network.sendMove(this.localPlayer.gridX, this.localPlayer.gridY, dir);
      }
    }
  }

  gameLoop(now) {
    this.processInput(now);

    if (this.localPlayer) {
      this.localPlayer.update(now);
    }

    this.remotePlayers.forEach(rp => {
      rp.update(now);
    });

    if (this.npcManager) {
      this.npcManager.update(now);
    }

    // Checar coleta de itens no chão ao passar por cima
    if (this.itemManager && this.localPlayer) {
      this.itemManager.checkPickups(this.localPlayer, (item) => {
        if (this.network) {
          this.network.sendItemPickup(item.id);
        }
        const itemName = item.itemConfig ? item.itemConfig.name : item.itemId;
        if (item.itemId === 'gold') {
          this.monsterManager.addFloatingText(`+${item.quantity} Gold`, this.localPlayer.gridX, this.localPlayer.gridY, '#ecc94b');
          this.hud.addChatMessage('Sistema', `🪙 Você coletou <strong>+${item.quantity} Moedas de Ouro</strong>!`, true);
        } else {
          this.monsterManager.addFloatingText(`+1 ${itemName}`, this.localPlayer.gridX, this.localPlayer.gridY, '#cbd5e0');
          this.hud.addChatMessage('Sistema', `🎒 Você coletou <strong>${itemName}</strong>!`, true);
        }
        this.hud.updatePlayerStats();
      });
    }

    // Auto-Ataque com Mira Travada no Monstro (Estilo Tibia)
    if (this.lockedTargetId && this.localPlayer) {
      const targetRat = this.monsterManager.monsters.get(this.lockedTargetId);
      if (targetRat && !targetRat.isDead) {
        const dist = Math.max(Math.abs(targetRat.gridX - this.localPlayer.gridX), Math.abs(targetRat.gridY - this.localPlayer.gridY));
        const maxRange = this.getMaxAttackRange();
        if (dist <= maxRange) {
          this.performAttack(targetRat);
        }
      } else {
        this.lockedTargetId = null;
      }
    }

    if (this.monsterManager && this.localPlayer) {
      this.monsterManager.update(
        now, 
        this.localPlayer, 
        this.remotePlayers,
        (gx, gy, mId) => this.isTileOccupiedByEntity(gx, gy, mId),
        (damageTaken) => {
          this.localPlayer.hp = Math.max(0, this.localPlayer.hp - damageTaken);
          if (this.network) {
            this.network.sendPlayerDamage(damageTaken, this.localPlayer.hp);
          }
          this.hud.updatePlayerStats();
          if (this.localPlayer.hp <= 0) {
            if (this.corpseManager) {
              const playerCorpse = this.corpseManager.spawnCorpse({
                ownerName: this.localPlayer.name,
                entityType: 'player',
                gridX: this.localPlayer.gridX,
                gridY: this.localPlayer.gridY,
                loot: [],
                createdAt: Date.now()
              });
              if (this.network) {
                this.network.sendCorpseSpawn(playerCorpse);
                this.network.saveCorpseToDatabase(playerCorpse, this.currentMapId || 'map-1');
              }
            }

            this.localPlayer.hp = this.localPlayer.maxHp;
            this.localPlayer.gridX = 16;
            this.localPlayer.gridY = 16;
            this.localPlayer.renderX = 16 * CONFIG.TILE_SIZE;
            this.localPlayer.renderY = 16 * CONFIG.TILE_SIZE;
            this.localPlayer.clearPath();
            this.lockedTargetId = null;
            if (this.network) {
              this.network.sendMove(16, 16, 'south');
            }
            this.hud.updatePlayerStats();
            this.hud.addChatMessage('Sistema', '☠️ <strong>Você caiu em batalha!</strong> Seu corpo permanece no local enquanto você renasce na praça central...', true);
          }
        },
        this.network
      );
    }

    if (this.corpseManager) {
      this.corpseManager.update(now);
    }

    if (this.localPlayer) {
      this.renderer.updateCamera(this.localPlayer);
      this.renderer.render(this.gameMap, this.localPlayer, this.remotePlayers, this.monsterManager, this.npcManager, this.lockedTargetId, this.itemManager, this.corpseManager);
    }

    requestAnimationFrame((n) => this.gameLoop(n));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameEngine();
});
