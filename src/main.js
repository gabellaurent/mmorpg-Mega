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

class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new Renderer(this.canvas);
    this.gameMap = new GameMap();
    this.monsterManager = new MonsterManager(this.gameMap);
    this.npcManager = new NpcManager(this.gameMap);
    this.itemManager = new ItemManager(this.gameMap);
    
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
    this.network.connect('map-1');

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

    this.setupControls();
    requestAnimationFrame((now) => this.gameLoop(now));

    this.hud.addChatMessage('Sistema', '🌟 <strong>Zero-HUD Ativo:</strong> Tela 100% limpa! Pressione <strong>[I]</strong> (Bolsa), <strong>[M]</strong> (Mapa), <strong>[C]</strong> (Status), <strong>[Tab]</strong> ou Toque Longo no Celular para a Roda Radial!', true);
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
        this.network.sendMonsterHit(targetRat.id, dmg, this.localPlayer.name);

        if (died) {
          this.lockedTargetId = null;
          const gainedXp = 25;
          const leveledUp = this.localPlayer.addXp(gainedXp);
          this.monsterManager.addFloatingText(`+${gainedXp} EXP`, this.localPlayer.gridX, this.localPlayer.gridY, '#9f7aea');

          // Gerar loot do rato no chão e notificar rede
          const loot = this.itemManager.spawnMonsterLoot('rat', targetRat.gridX, targetRat.gridY, this.network);
          if (loot.length > 0) {
            const itemNames = loot.map(i => i.itemConfig.name).join(', ');
            this.hud.addChatMessage('Sistema', `💰 O monstro dropou: <strong>${itemNames}</strong>!`, true);
          }

          if (leveledUp) {
            this.hud.addChatMessage('Sistema', `✨ <strong>LEVEL UP!</strong> Você alcançou o Nível ${this.localPlayer.level}! Sua vida foi restaurada!`, true);
          } else {
            this.hud.addChatMessage('Sistema', `⚔️ Você derrotou o <strong>${targetRat.name}</strong> e ganhou +${gainedXp} EXP!`, true);
          }

          const ratId = targetRat.id;
          setTimeout(() => {
            targetRat.respawn();
            this.network.sendMonsterRespawn(ratId);
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

    const died = rat.takeDamage(payload.damage);
    this.monsterManager.addFloatingText(`-${payload.damage}`, rat.gridX, rat.gridY, '#f56565');

    if (died && this.hud) {
      this.hud.addChatMessage('Sistema', `⚔️ <strong>${payload.attackerName}</strong> derrotou o <strong>${rat.name}</strong>!`, true);
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
    if (!this.localPlayer || !this.renderer) return null;
    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const screenDx = clientX - centerX;
    const screenDy = clientY - centerY;

    const tileSize = CONFIG.TILE_SIZE;
    const worldViewWidth = this.renderer.viewportTilesX * tileSize;
    const worldViewHeight = this.renderer.viewportTilesY * tileSize;

    const worldDx = (screenDx / rect.width) * worldViewWidth;
    const worldDy = (screenDy / rect.height) * worldViewHeight;

    const clickWorldX = (this.localPlayer.renderX + tileSize / 2) + worldDx;
    const clickWorldY = (this.localPlayer.renderY + tileSize / 2) + worldDy;

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

    // Captura de Toque / Clique Esquerdo EXCLUSIVAMENTE dentro do Canvas do Jogo
    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;

      const coords = this.getGridCoordsFromClient(e.clientX, e.clientY);
      if (!coords) return;

      // 1. Toque em Monstro Vivo: Trava de Mira e Ataque Imediato por Toque!
      let clickedRat = null;
      let minDistance = 999;

      if (this.monsterManager) {
        this.monsterManager.monsters.forEach(rat => {
          if (rat.isDead) return;
          const sameTile = (rat.gridX === coords.gridX && rat.gridY === coords.gridY);
          const rx = rat.renderX + CONFIG.TILE_SIZE / 2;
          const ry = rat.renderY + CONFIG.TILE_SIZE / 2;
          const pixelDist = Math.hypot(coords.worldX - rx, coords.worldY - ry);

          if ((sameTile || pixelDist < CONFIG.TILE_SIZE * 1.2) && pixelDist < minDistance) {
            minDistance = pixelDist;
            clickedRat = rat;
          }
        });
      }

      if (clickedRat) {
        if (touchHoldTimer) clearTimeout(touchHoldTimer);
        this.lockedTargetId = clickedRat.id;
        if (this.localPlayer) this.localPlayer.clearPath();
        const dist = Math.max(Math.abs(clickedRat.gridX - this.localPlayer.gridX), Math.abs(clickedRat.gridY - this.localPlayer.gridY));
        this.hud.addChatMessage('Sistema', `🎯 <strong>MIRA TRAVADA:</strong> <strong>${clickedRat.name}</strong> selecionado!`, true);
        return;
      }

      // 2. Toque no Chão: Movimentação Point-and-Click (Busca de Caminho com Pathfinder)
      if (this.localPlayer) {
        const path = Pathfinder.findPath(
          this.localPlayer.gridX,
          this.localPlayer.gridY,
          coords.gridX,
          coords.gridY,
          (x, y) => !this.isTileOccupiedByEntity(x, y, this.localPlayer.id)
        );

        if (path && path.length > 0) {
          this.localPlayer.setPath(path);
        }
      }
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
      if (rat.isDead) return;

      const sameTile = (rat.gridX === coords.gridX && rat.gridY === coords.gridY);
      const rx = rat.renderX + CONFIG.TILE_SIZE / 2;
      const ry = rat.renderY + CONFIG.TILE_SIZE / 2;
      const pixelDist = Math.hypot(coords.worldX - rx, coords.worldY - ry);

      if ((sameTile || pixelDist < CONFIG.TILE_SIZE * 1.2) && pixelDist < minDistance) {
        minDistance = pixelDist;
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
        (gx, gy, mId) => this.isTileOccupiedByEntity(gx, gy, mId),
        (damageTaken) => {
          this.localPlayer.hp = Math.max(0, this.localPlayer.hp - damageTaken);
          this.hud.updatePlayerStats();
          if (this.localPlayer.hp <= 0) {
            this.localPlayer.hp = this.localPlayer.maxHp;
            this.localPlayer.gridX = 16;
            this.localPlayer.gridY = 16;
            this.hud.addChatMessage('Sistema', '☠️ Você caiu em batalha! Renascendo na praça central...', true);
          }
        }
      );
    }

    if (this.localPlayer) {
      this.renderer.updateCamera(this.localPlayer);
      this.renderer.render(this.gameMap, this.localPlayer, this.remotePlayers, this.monsterManager, this.npcManager, this.lockedTargetId, this.itemManager);
    }

    requestAnimationFrame((n) => this.gameLoop(n));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameEngine();
});
