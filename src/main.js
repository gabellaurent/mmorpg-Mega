// Arquivo Principal - Orquestrador do MMORPG
import { spriteGen } from './engine/spriteGenerator.js';
import { GameMap } from './engine/map.js';
import { Player } from './engine/player.js';
import { Renderer } from './engine/renderer.js';
import { NetworkManager } from './services/networkManager.js';
import { AuthUI } from './ui/authUI.js';
import { HudUI } from './ui/hudUI.js';
import { CONFIG } from './config.js';

class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new Renderer(this.canvas);
    this.gameMap = new GameMap();
    
    this.localPlayer = null;
    this.remotePlayers = new Map(); // id -> Player
    this.network = null;
    this.hud = null;

    this.keysPressed = {};
    this.lastStepTime = 0;

    this.init();
  }

  init() {
    // 1. Inicializar gerador procedural de sprites pixel-art
    spriteGen.init();

    // 2. Redimensionar Canvas
    this.renderer.resize();
    window.addEventListener('resize', () => this.renderer.resize());

    // 3. Exibir Modal de Login / Criação de Personagem
    new AuthUI((characterData) => this.startGame(characterData));
  }

  startGame(characterData) {
    // 1. Instanciar o Jogador Local
    this.localPlayer = new Player({
      name: characterData.name,
      spriteId: characterData.spriteId,
      x: characterData.x,
      y: characterData.y,
      level: 1,
      hp: 100,
      maxHp: 100
    });

    // 2. Inicializar Rede Realtime
    this.network = new NetworkManager(
      this.localPlayer,
      (remoteData) => this.handleRemotePlayerUpdate(remoteData),
      (remoteId) => this.handleRemotePlayerLeave(remoteId),
      (chatPayload) => this.handleChatMessage(chatPayload)
    );
    this.network.connect('map-1');

    // 3. Inicializar HUD
    this.hud = new HudUI(
      this.localPlayer,
      (text) => {
        this.localPlayer.setChatBubble(text);
        this.network.sendChat(text);
      },
      () => {
        this.renderer.showGridOverlay = !this.renderer.showGridOverlay;
      }
    );

    // 4. Configurar Captura de Teclado
    this.setupControls();

    // 5. Iniciar Loop de Animação 60FPS
    requestAnimationFrame((now) => this.gameLoop(now));

    this.hud.addChatMessage('Sistema', '🌟 Você se conectou ao mapa! Mova-se usando as setas ou WASD.', true);
  }

  // Tratamento de atualização de jogador remoto via Realtime
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
      // Se o jogador remoto se moveu para uma nova casa
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

  // Remoção de jogador desconectado
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

  // Recebimento de mensagens de chat
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

  // Captura de controles no teclado
  setupControls() {
    window.addEventListener('keydown', (e) => {
      // Não mover o personagem se o usuário estiver digitando no Chat
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

      this.keysPressed[e.key] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keysPressed[e.key] = false;
    });
  }

  // Processamento de Input por cada passo no Grid (Estilo Tibia)
  processInput(now) {
    if (!this.localPlayer || this.localPlayer.isMoving) return;

    // Throttle do próximo passo conforme CONFIG.STEP_DURATION_MS
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

      // Validação de Colisão com Terreno / Obstáculos
      if (this.gameMap.isWalkable(nextX, nextY)) {
        this.localPlayer.moveTo(nextX, nextY, dir);
        this.lastStepTime = now;

        // Transmitir novo movimento para a rede em tempo real
        this.network.sendMove(nextX, nextY, dir);

        // Atualizar coordenadas no HUD
        this.hud.updatePlayerStats();
      } else {
        // Se houver colisão, apenas vira a direção do personagem
        this.localPlayer.direction = dir;
        this.network.sendMove(this.localPlayer.gridX, this.localPlayer.gridY, dir);
      }
    }
  }

  // Loop de Animação e Renderização 60 FPS
  gameLoop(now) {
    // 1. Processar Teclado e Movimento do Jogador Local
    this.processInput(now);

    // 2. Atualizar animações e LERP de Posições
    if (this.localPlayer) {
      this.localPlayer.update(now);
    }

    this.remotePlayers.forEach(rp => {
      rp.update(now);
    });

    // 3. Atualizar Câmera e Renderizar
    if (this.localPlayer) {
      this.renderer.updateCamera(this.localPlayer);
      this.renderer.render(this.gameMap, this.localPlayer, this.remotePlayers);
    }

    requestAnimationFrame((n) => this.gameLoop(n));
  }
}

// Inicializar a Engine do Jogo
window.addEventListener('DOMContentLoaded', () => {
  new GameEngine();
});
