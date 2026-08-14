// Representação do Jogador Local e Jogadores Remotos (Multiplayer & XP)
import { CONFIG } from '../config.js';

export class Player {
  constructor(data) {
    this.id = data.id || 'player_' + Math.random().toString(36).substr(2, 9);
    this.name = data.name || 'Heroi';
    this.spriteId = data.spriteId || 'knight';
    
    // Posição no Grid
    this.gridX = data.x !== undefined ? data.x : 16;
    this.gridY = data.y !== undefined ? data.y : 16;

    // Posição de Renderização (em pixels para interpolação)
    this.renderX = this.gridX * CONFIG.TILE_SIZE;
    this.renderY = this.gridY * CONFIG.TILE_SIZE;

    this.startX = this.renderX;
    this.startY = this.renderY;
    this.targetX = this.renderX;
    this.targetY = this.renderY;

    this.direction = data.direction || 'south';
    this.isMoving = false;
    this.moveStartTime = 0;
    
    this.animFrame = 0;
    this.lastAnimTime = 0;

    // Status do Personagem & XP
    this.level = data.level || 1;
    this.hp = data.hp || 100;
    this.maxHp = data.maxHp || 100;

    this.xp = data.xp || 0;
    this.maxXp = this.level * 50; // XP necessária para subir de nível

    this.chatBubble = null;
    this.chatBubbleTimer = null;
  }

  // Adiciona XP e verifica se subiu de nível (Level Up!)
  addXp(amount) {
    this.xp += amount;
    if (this.xp >= this.maxXp) {
      this.level += 1;
      this.xp -= this.maxXp;
      this.maxXp = this.level * 50;
      this.maxHp += 20;
      this.hp = this.maxHp; // Cura ao subir de nível!
      return true; // Subiu de nível!
    }
    return false;
  }

  // Inicia a movimentação para um novo tile
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

  update(now) {
    if (this.isMoving) {
      const elapsed = now - this.moveStartTime;
      const progress = Math.min(1, elapsed / CONFIG.STEP_DURATION_MS);

      this.renderX = this.startX + (this.targetX - this.startX) * progress;
      this.renderY = this.startY + (this.targetY - this.startY) * progress;

      if (now - this.lastAnimTime > CONFIG.ANIMATION_FRAME_MS) {
        this.animFrame = (this.animFrame + 1) % 2 + 1;
        this.lastAnimTime = now;
      }

      if (progress >= 1) {
        this.renderX = this.targetX;
        this.renderY = this.targetY;
        this.isMoving = false;
        this.animFrame = 0;
      }
    } else {
      this.animFrame = 0;
    }
  }

  setChatBubble(text) {
    this.chatBubble = text;
    if (this.chatBubbleTimer) clearTimeout(this.chatBubbleTimer);
    this.chatBubbleTimer = setTimeout(() => {
      this.chatBubble = null;
    }, 4000);
  }
}
