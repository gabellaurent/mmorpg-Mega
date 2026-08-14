// Arquivo Principal - Orquestrador do MMORPG
import '../style.css';
import { spriteGen } from './engine/spriteGenerator.js';
import { GameMap } from './engine/map.js';
import { Player } from './engine/player.js';
import { Renderer } from './engine/renderer.js';
import { MonsterManager } from './engine/monsterManager.js';
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
    
    this.localPlayer = null;
    this.remotePlayers = new Map();
    this.network = null;
    this.hud = null;

    this.keysPressed = {};
    this.lastStepTime = 0;
    this.lastAttackTime = 0;

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

    this.hud.addChatMessage('Sistema', '🌟 Você se conectou ao mapa! Mova-se com WASD e aperte <strong>ESPAÇO</strong> para atacar os Rats nos 4 cantos do mapa!', true);
  }

  // Realiza um ataque físico contra qualquer Rat adjacente (1 tile de distância)
  performAttack() {
    if (!this.localPlayer) return;
    const now = performance.now();
    if (now - this.lastAttackTime < 450) return; // Cooldown de 450ms
    this.lastAttackTime = now;

    let targetRat = null;
    let minDistance = 999;

    // Buscar monstro vivo mais próximo em até 1 tile
    this.monsterManager.monsters.forEach(rat => {
      if (rat.isDead) return;
      const dist = Math.max(Math.abs(rat.gridX - this.localPlayer.gridX), Math.abs(rat.gridY - this.localPlayer.gridY));
      if (dist <= 1 && dist < minDistance) {
        minDistance = dist;
        targetRat = rat;
      }
    });

    if (targetRat) {
      // Dano do Ataque do Jogador (8 a 16 HP)
      const dmg = Math.floor(Math.random() * 9) + 8;
      const died = targetRat.takeDamage(dmg);

      // Mostrar número de dano flutuante em vermelho sobre o Rat
      this.monsterManager.addFloatingText(`-${dmg}`, targetRat.gridX, targetRat.gridY, '#f56565');

      // Transmitir evento de dano no Rat em tempo real para todos os outros jogadores!
      this.network.sendMonsterHit(targetRat.id, dmg, this.localPlayer.name);

      if (died) {
        // Monstro Derrotado! Conceder EXP para quem desferiu o golpe final
        const gainedXp = 25;
        const leveledUp = this.localPlayer.addXp(gainedXp);
        this.monsterManager.addFloatingText(`+${gainedXp} EXP`, this.localPlayer.gridX, this.localPlayer.gridY, '#9f7aea');

        if (leveledUp) {
          this.hud.addChatMessage('Sistema', `✨ <strong>LEVEL UP!</strong> Você alcançou o Nível ${this.localPlayer.level}! Sua vida foi restaurada!`, true);
        } else {
          this.hud.addChatMessage('Sistema', `⚔️ Você derrotou o <strong>${targetRat.name}</strong> e ganhou +${gainedXp} EXP!`, true);
        }

        // Transmitir evento de agendamento de Respawn
        const ratId = targetRat.id;
        setTimeout(() => {
          targetRat.respawn();
          this.network.sendMonsterRespawn(ratId);
          this.hud.addChatMessage('Sistema', `⚠️ Um <strong>${targetRat.name}</strong> renasceu nos cantos do mapa!`, true);
        }, 8000);
      }

      this.hud.updatePlayerStats();
    } else {
      // Golpe no ar
      this.monsterManager.addFloatingText(`miss`, this.localPlayer.gridX, this.localPlayer.gridY, '#a0aec0');
    }
  }

  // Recebe dano causado por OUTRO jogador a um Rat
  handleRemoteMonsterHit(payload) {
    const rat = this.monsterManager.monsters.get(payload.ratId);
    if (!rat || rat.isDead) return;

    const died = rat.takeDamage(payload.damage);

    // Exibir número de dano vermelho na tela do outro jogador!
    this.monsterManager.addFloatingText(`-${payload.damage}`, rat.gridX, rat.gridY, '#f56565');

    if (died && this.hud) {
      this.hud.addChatMessage('Sistema', `⚔️ <strong>${payload.attackerName}</strong> derrotou o <strong>${rat.name}</strong>!`, true);
    }
  }

  // Recebe notificação de respawn de um Rat
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
    window.addEventListener('keydown', (e) => {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        this.performAttack();
      } else {
        this.keysPressed[e.key] = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key !== ' ' && e.code !== 'Space') {
        this.keysPressed[e.key] = false;
      }
    });
  }

  processInput(now) {
    if (!this.localPlayer || this.localPlayer.isMoving) return;

    if (now - this.lastStepTime < CONFIG.STEP_DURATION_MS - 20) return;

    let dx = 0;
    let dy = 0;
    let dir = null;

    if (this.keysPressed['ArrowUp'] || this.keysPressed['w'] || this.keysPressed['W']) {
      dy = -1;
      dir = 'north';
    } else if (this.keysPressed['ArrowDown'] || this.keysPressed['s'] || this.keysPressed['S']) {
      dy = 1;
      dir = 'south';
    } else if (this.keysPressed['ArrowLeft'] || this.keysPressed['a'] || this.keysPressed['A']) {
      dx = -1;
      dir = 'west';
    } else if (this.keysPressed['ArrowRight'] || this.keysPressed['d'] || this.keysPressed['D']) {
      dx = 1;
      dir = 'east';
    }

    if (dir && (dx !== 0 || dy !== 0)) {
      const nextX = this.localPlayer.gridX + dx;
      const nextY = this.localPlayer.gridY + dy;

      if (this.gameMap.isWalkable(nextX, nextY)) {
        this.localPlayer.moveTo(nextX, nextY, dir);
        this.lastStepTime = now;

        this.network.sendMove(nextX, nextY, dir);
        this.hud.updatePlayerStats();
      } else {
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
      this.renderer.render(this.gameMap, this.localPlayer, this.remotePlayers, this.monsterManager);
    }

    requestAnimationFrame((n) => this.gameLoop(n));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameEngine();
});
