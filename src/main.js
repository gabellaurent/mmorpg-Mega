// Arquivo Principal - Orquestrador do MMORPG
import { spriteGen } from './engine/spriteGenerator.js';
import { GameMap } from './engine/map.js';
import { Player } from './engine/player.js';
import { Renderer } from './engine/renderer.js';
import { MonsterManager } from './engine/monsterManager.js';
import { NpcManager } from './engine/npcManager.js';
import { NetworkManager } from './services/networkManager.js';
import { AuthUI } from './ui/authUI.js';
import { HudUI } from './ui/hudUI.js';
import { CONFIG } from './config.js';

class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new Renderer(this.canvas);
    this.gameMap = new GameMap();
    this.monsterManager = new MonsterManager(this.gameMap);
    this.npcManager = new NpcManager(this.gameMap);
    
    this.localPlayer = null;
    this.remotePlayers = new Map();
    this.network = null;
    this.hud = null;

    this.keysPressed = {};
    this.lastStepTime = 0;
    this.lastAttackTime = 0;

    this.isPointerDown = false;
    this.pointerTarget = null;

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

    this.network = new NetworkManager(
      this.localPlayer,
      (remoteData) => this.handleRemotePlayerUpdate(remoteData),
      (remoteId) => this.handleRemotePlayerLeave(remoteId),
      (chatPayload) => this.handleChatMessage(chatPayload),
      (hitPayload) => this.handleRemoteMonsterHit(hitPayload),
      (respawnPayload) => this.handleRemoteMonsterRespawn(respawnPayload)
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
      () => {
        this.performAttack();
      }
    );

    this.setupControls();
    requestAnimationFrame((now) => this.gameLoop(now));

    this.hud.addChatMessage('Sistema', '🌟 Você se conectou ao mapa! <strong>Clique ou toque na tela</strong> para andar (1 passo a cada 0.5s)! Pressione ESPAÇO para atacar!', true);
  }

  performAttack() {
    if (!this.localPlayer) return;
    const now = performance.now();
    if (now - this.lastAttackTime < 450) return;
    this.lastAttackTime = now;

    let targetRat = null;
    let minDistance = 999;

    this.monsterManager.monsters.forEach(rat => {
      if (rat.isDead) return;
      const dist = Math.max(Math.abs(rat.gridX - this.localPlayer.gridX), Math.abs(rat.gridY - this.localPlayer.gridY));
      if (dist <= 1 && dist < minDistance) {
        minDistance = dist;
        targetRat = rat;
      }
    });

    if (targetRat) {
      const dmg = Math.floor(Math.random() * 9) + 8;
      const died = targetRat.takeDamage(dmg);

      this.monsterManager.addFloatingText(`-${dmg}`, targetRat.gridX, targetRat.gridY, '#f56565');
      this.network.sendMonsterHit(targetRat.id, dmg, this.localPlayer.name);

      if (died) {
        const gainedXp = 25;
        const leveledUp = this.localPlayer.addXp(gainedXp);
        this.monsterManager.addFloatingText(`+${gainedXp} EXP`, this.localPlayer.gridX, this.localPlayer.gridY, '#9f7aea');

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
    } else {
      this.monsterManager.addFloatingText(`miss`, this.localPlayer.gridX, this.localPlayer.gridY, '#a0aec0');
    }
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

  setupControls() {
    // Bloquear estritamente qualquer tentativa de movimentação via teclado (WASD / Setas)
    window.addEventListener('keydown', (e) => {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

      const moveKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D'];
      if (moveKeys.includes(e.key)) {
        e.preventDefault();
        return; // Impede completamente o movimento via teclado
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        this.performAttack();
      }
    });

    // Captura global de Toque / Clique em qualquer lugar da tela
    const updatePointerPos = (e) => {
      this.pointerTarget = {
        x: e.clientX,
        y: e.clientY
      };
    };

    window.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      
      // Ignorar cliques dentro de campos de entrada (chat input), formulários e botões de interface
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('.hud-card') || e.target.closest('#auth-container'))) {
        return;
      }

      this.isPointerDown = true;
      updatePointerPos(e);
      this.triggerStepFromPointer(performance.now());
    });

    window.addEventListener('pointermove', (e) => {
      if (this.isPointerDown) {
        updatePointerPos(e);
      }
    });

    const releasePointer = () => {
      this.isPointerDown = false;
      this.pointerTarget = null;
    };

    window.addEventListener('pointerup', releasePointer);
    window.addEventListener('pointercancel', releasePointer);
  }

  getDirectionFromPointer(target) {
    if (!target) return null;

    // O jogador está sempre posicionado no centro exato da janela (window.innerWidth / 2, window.innerHeight / 2)
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const dx = target.x - centerX;
    const dy = target.y - centerY;

    // Se o clique for muito próximo do próprio centro (< 15px), ignora
    if (Math.hypot(dx, dy) < 15) return null;

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'east' : 'west';
    } else {
      return dy > 0 ? 'south' : 'north';
    }
  }

  triggerStepFromPointer(now) {
    if (!this.localPlayer || this.localPlayer.isMoving) return;

    // Velocidade de caminhada delimitada a EXATAMENTE 1 passo a cada 0.5 segundos (500ms)
    if (now - this.lastStepTime < 500) return;

    const dir = this.getDirectionFromPointer(this.pointerTarget);
    if (!dir) return;

    let dx = 0;
    let dy = 0;
    if (dir === 'north') dy = -1;
    else if (dir === 'south') dy = 1;
    else if (dir === 'west') dx = -1;
    else if (dir === 'east') dx = 1;

    const nextX = this.localPlayer.gridX + dx;
    const nextY = this.localPlayer.gridY + dy;

    if (this.gameMap.isWalkable(nextX, nextY) && !this.npcManager.isNpcAt(nextX, nextY)) {
      this.localPlayer.moveTo(nextX, nextY, dir);
      this.lastStepTime = now;

      this.network.sendMove(nextX, nextY, dir);
      this.hud.updatePlayerStats();
    } else {
      this.localPlayer.direction = dir;
      this.network.sendMove(this.localPlayer.gridX, this.localPlayer.gridY, dir);
      this.lastStepTime = now;
    }
  }

  processInput(now) {
    if (this.isPointerDown && this.pointerTarget) {
      this.triggerStepFromPointer(now);
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

    if (this.monsterManager && this.localPlayer) {
      this.monsterManager.update(now, this.localPlayer, (damageTaken) => {
        this.localPlayer.hp = Math.max(0, this.localPlayer.hp - damageTaken);
        this.hud.updatePlayerStats();
        if (this.localPlayer.hp <= 0) {
          this.localPlayer.hp = this.localPlayer.maxHp;
          this.localPlayer.gridX = 16;
          this.localPlayer.gridY = 16;
          this.hud.addChatMessage('Sistema', '☠️ Você caiu em batalha! Renascendo na praça central...', true);
        }
      });
    }

    if (this.localPlayer) {
      this.renderer.updateCamera(this.localPlayer);
      this.renderer.render(this.gameMap, this.localPlayer, this.remotePlayers, this.monsterManager, this.npcManager);
    }

    requestAnimationFrame((n) => this.gameLoop(n));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameEngine();
});
