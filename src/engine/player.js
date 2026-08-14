// Representação do Jogador Local e Jogadores Remotos (Multiplayer)
import { CONFIG } from '../config.js';

export class Player {
  constructor(data) {
    this.id = data.id || 'player_' + Math.random().toString(36).substr(2, 9);
    this.name = data.name || 'Heroi';
    this.spriteId = data.spriteId || 'knight';
    
    // Posição no Grid (inteiros 0..31)
    this.gridX = data.x !== undefined ? data.x : 16;
    this.gridY = data.y !== undefined ? data.y : 16;

    // Posição de Renderização (em pixels para interpolação suave)
    this.renderX = this.gridX * CONFIG.TILE_SIZE;
    this.renderY = this.gridY * CONFIG.TILE_SIZE;

    // Origem e Destino da Interpolação
    this.startX = this.renderX;
    this.startY = this.renderY;
    this.targetX = this.renderX;
    this.targetY = this.renderY;

    // Estado de Movimento e Direção
    this.direction = data.direction || 'south'; // south, north, east, west
    this.isMoving = false;
    this.moveStartTime = 0;
    
    // Animação de Pernas
    this.animFrame = 0;
    this.lastAnimTime = 0;

    // Status do Personagem
    this.level = data.level || 1;
    this.hp = data.hp || 100;
    this.maxHp = data.maxHp || 100;

    // Balão de Chat Movel sobre a cabeça
    this.chatBubble = null;
    this.chatBubbleTimer = null;
  }

  // Inicia a movimentação para um novo tile (gridX, gridY)
  moveTo(newGridX, newGridY, direction) {
    this.direction = direction;

    this.startX = this.renderX;
    this.startY = this.renderY;
    
    this.gridX = newGridX;
    this.gridY = newGridY;

    this.targetX = newGridX * CONFIG.TILE_SIZE;
    this.targetY = newGridY * CONFIG.TILE_SIZE;

    this.isMoving = true;
    this.moveStartTime = performance.now();
  }

  // Atualiza a posição de renderização (LERP) a cada frame (60 FPS)
  update(now) {
    if (this.isMoving) {
      const elapsed = now - this.moveStartTime;
      const progress = Math.min(1, elapsed / CONFIG.STEP_DURATION_MS);

      // Interpolação linear (LERP)
      this.renderX = this.startX + (this.targetX - this.startX) * progress;
      this.renderY = this.startY + (this.targetY - this.startY) * progress;

      // Animação de pernas ao andar
      if (now - this.lastAnimTime > CONFIG.ANIMATION_FRAME_MS) {
        this.animFrame = (this.animFrame + 1) % 2 + 1; // Alterna entre frame 1 e 2
        this.lastAnimTime = now;
      }

      if (progress >= 1) {
        this.renderX = this.targetX;
        this.renderY = this.targetY;
        this.isMoving = false;
        this.animFrame = 0; // Idle
      }
    } else {
      this.animFrame = 0;
    }
  }

  // Exibe um balão de fala sobre o personagem
  setChatBubble(text) {
    this.chatBubble = text;
    if (this.chatBubbleTimer) clearTimeout(this.chatBubbleTimer);
    this.chatBubbleTimer = setTimeout(() => {
      this.chatBubble = null;
    }, 4000);
  }
}
