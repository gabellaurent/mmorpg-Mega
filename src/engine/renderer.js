// Motor de Renderização HTML5 Canvas 2D
import { CONFIG } from '../config.js';
import { spriteGen } from './spriteGenerator.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    // Viewport de Renderização Fixo em 8x8 Quadros (Conforme Imagem de Referência)
    this.viewportTilesX = 8;
    this.viewportTilesY = 8;

    this.cameraX = 0;
    this.cameraY = 0;
    this.showGridOverlay = false;

    this.resize();
  }

  resize() {
    const tileSize = CONFIG.TILE_SIZE;
    this.canvas.width = this.viewportTilesX * tileSize;   // 8 * 48 = 384px
    this.canvas.height = this.viewportTilesY * tileSize; // 8 * 48 = 384px
    this.ctx.imageSmoothingEnabled = false;
  }

  updateCamera(player) {
    const tileSize = CONFIG.TILE_SIZE;
    const viewWidth = this.viewportTilesX * tileSize;
    const viewHeight = this.viewportTilesY * tileSize;

    const mapPixelWidth = CONFIG.GRID_WIDTH * tileSize;
    const mapPixelHeight = CONFIG.GRID_HEIGHT * tileSize;

    const targetCamX = player.renderX + tileSize / 2 - viewWidth / 2;
    const targetCamY = player.renderY + tileSize / 2 - viewHeight / 2;

    this.cameraX += (targetCamX - this.cameraX) * 0.15;
    this.cameraY += (targetCamY - this.cameraY) * 0.15;

    this.cameraX = Math.max(0, Math.min(this.cameraX, mapPixelWidth - viewWidth));
    this.cameraY = Math.max(0, Math.min(this.cameraY, mapPixelHeight - viewHeight));
  }

  // Loop Principal de Renderização
  render(gameMap, localPlayer, remotePlayersMap, monsterManager, npcManager) {
    const ctx = this.ctx;
    const tileSize = CONFIG.TILE_SIZE;
    const viewWidth = this.viewportTilesX * tileSize;
    const viewHeight = this.viewportTilesY * tileSize;

    // 1. Limpar fundo
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    ctx.save();
    ctx.translate(-Math.floor(this.cameraX), -Math.floor(this.cameraY));
    ctx.imageSmoothingEnabled = false;

    const startCol = Math.max(0, Math.floor(this.cameraX / tileSize));
    const endCol = Math.min(CONFIG.GRID_WIDTH - 1, Math.ceil((this.cameraX + viewWidth) / tileSize));
    const startRow = Math.max(0, Math.floor(this.cameraY / tileSize));
    const endRow = Math.min(CONFIG.GRID_HEIGHT - 1, Math.ceil((this.cameraY + viewHeight) / tileSize));

    // PASSO 1: Terrenos Base
    for (let y = startRow; y <= endRow; y++) {
      for (let x = startCol; x <= endCol; x++) {
        const tile = gameMap.getTile(x, y);
        if (!tile) continue;

        const tileImg = spriteGen.get(tile.spriteKey);
        ctx.drawImage(tileImg, x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }

    // PASSO 2: Grade Guia
    if (this.showGridOverlay) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      for (let y = startRow; y <= endRow; y++) {
        for (let x = startCol; x <= endCol; x++) {
          ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
      }
    }

    // PASSO 3: Monstros (Rats)
    if (monsterManager) {
      monsterManager.monsters.forEach(rat => {
        if (!rat.isDead) {
          this.renderMonster(rat);
        }
      });
    }

    // PASSO 4: Entidades (Jogadores + NPCs)
    const allEntities = [
      { entity: localPlayer, type: 'player', isLocal: true },
      ...Array.from(remotePlayersMap.values()).map(p => ({ entity: p, type: 'player', isLocal: false }))
    ];

    if (npcManager) {
      npcManager.npcs.forEach(npc => {
        allEntities.push({ entity: npc, type: 'npc' });
      });
    }

    allEntities.sort((a, b) => a.entity.renderY - b.entity.renderY);

    allEntities.forEach(item => {
      if (item.type === 'player') {
        this.renderPlayer(item.entity, item.isLocal);
      } else if (item.type === 'npc') {
        this.renderNpc(item.entity);
      }
    });

    // PASSO 5: Copas das Árvores e Estrutura Superior do Portão Sul
    const canopyImg = spriteGen.get('tree_canopy');
    const canopySize = tileSize * 1.6;
    const canopyOffset = (canopySize - tileSize) / 2;

    for (let y = startRow; y <= endRow; y++) {
      for (let x = startCol; x <= endCol; x++) {
        const tile = gameMap.getTile(x, y);
        if (tile && tile.type === CONFIG.TILE_TYPES.TREE) {
          ctx.drawImage(
            canopyImg, 
            x * tileSize - canopyOffset, 
            y * tileSize - canopySize + tileSize / 1.5, 
            canopySize, 
            canopySize
          );
        }
      }
    }

    // Arco Superior do Portão Sul
    const gateY = (CONFIG.GRID_HEIGHT - 1) * tileSize;
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(14 * tileSize + 10, gateY - 6, 3 * tileSize + 28, 12);
    ctx.fillStyle = '#744210';
    ctx.fillRect(14 * tileSize + 12, gateY - 4, 3 * tileSize + 24, 8);
    ctx.fillStyle = '#d69e2e';
    ctx.fillRect(14 * tileSize + 12, gateY - 4, 3 * tileSize + 24, 2);

    // PASSO 6: Textos Flutuantes de Dano (ex: -14, +20 XP)
    if (monsterManager) {
      monsterManager.floatingTexts.forEach(ft => {
        ctx.save();
        ctx.globalAlpha = ft.opacity;
        ctx.font = 'bold 15px sans-serif';
        ctx.fillStyle = '#000000';
        ctx.fillText(ft.text, ft.x + 1, ft.y + 1); // Sombra do texto
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });
    }

    ctx.restore();
  }

  // Renderiza um NPC
  renderNpc(npc) {
    const ctx = this.ctx;
    const tileSize = CONFIG.TILE_SIZE;

    // Sombra Dourada do NPC
    const cx = npc.renderX + tileSize / 2;
    const cy = npc.renderY + tileSize / 2 + 10;
    ctx.fillStyle = 'rgba(236, 201, 75, 0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    const spritesheet = spriteGen.get(npc.spriteKey);
    if (spritesheet) {
      const dirCols = { south: 0, north: 1, east: 2, west: 3 };
      const colIndex = dirCols[npc.direction] !== undefined ? dirCols[npc.direction] : 0;
      const rowIndex = 0;

      const srcX = colIndex * tileSize;
      const srcY = rowIndex * tileSize;

      ctx.drawImage(
        spritesheet,
        srcX, srcY, tileSize, tileSize,
        Math.floor(npc.renderX), Math.floor(npc.renderY), tileSize, tileSize
      );
    }

    const headY = npc.renderY - 14;

    // Badge de Título
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    const badgeMetrics = ctx.measureText(npc.badgeText);
    const badgeW = badgeMetrics.width + 10;
    const badgeH = 14;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(cx - badgeW / 2, headY - 18, badgeW, badgeH);
    ctx.strokeStyle = npc.badgeColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - badgeW / 2, headY - 18, badgeW, badgeH);

    ctx.fillStyle = npc.badgeColor;
    ctx.fillText(npc.badgeText, cx, headY - 8);

    // Nome do NPC
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#000';
    ctx.fillText(npc.name, cx + 1, headY - 21);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(npc.name, cx, headY - 22);

    if (npc.chatBubble) {
      this.renderChatBubble(npc.chatBubble, cx, headY - 32);
    }
  }

  // Renderiza um Monstro (Rat) com Barra de Vida e Nome
  renderMonster(rat) {
    const ctx = this.ctx;
    const tileSize = CONFIG.TILE_SIZE;

    const ratImg = spriteGen.get('rat');
    ctx.drawImage(ratImg, Math.floor(rat.renderX), Math.floor(rat.renderY), tileSize, tileSize);

    const cx = rat.renderX + tileSize / 2;
    const headY = rat.renderY - 8;

    // Barra de HP do Monstro
    const barWidth = 30;
    const barHeight = 4;
    const hpRatio = Math.max(0, Math.min(1, rat.hp / rat.maxHp));

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(cx - barWidth / 2, headY, barWidth, barHeight);

    ctx.fillStyle = '#e53e3e';
    ctx.fillRect(cx - barWidth / 2, headY, barWidth * hpRatio, barHeight);

    // Nome do Monstro
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText(`Lvl.${rat.level} ${rat.name}`, cx + 1, headY - 2);
    ctx.fillStyle = '#fc8181';
    ctx.fillText(`Lvl.${rat.level} ${rat.name}`, cx, headY - 3);
  }

  // Renderiza um Personagem
  renderPlayer(player, isLocal = false) {
    const ctx = this.ctx;
    const tileSize = CONFIG.TILE_SIZE;

    if (!isLocal) {
      const cx = player.renderX + tileSize / 2;
      const cy = player.renderY + tileSize / 2 + 10;
      ctx.fillStyle = 'rgba(72, 187, 120, 0.35)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 18, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const spritesheet = spriteGen.get(`char_${player.spriteId}`);
    if (!spritesheet) return;

    const dirCols = { south: 0, north: 1, east: 2, west: 3 };
    const colIndex = dirCols[player.direction] !== undefined ? dirCols[player.direction] : 0;
    const rowIndex = player.animFrame;

    const srcX = colIndex * tileSize;
    const srcY = rowIndex * tileSize;

    ctx.drawImage(
      spritesheet,
      srcX, srcY, tileSize, tileSize,
      Math.floor(player.renderX), Math.floor(player.renderY), tileSize, tileSize
    );

    const cx = player.renderX + tileSize / 2;
    const headY = player.renderY - 14;

    const barWidth = 36;
    const barHeight = 4;
    const hpRatio = Math.max(0, Math.min(1, player.hp / player.maxHp));

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(cx - barWidth / 2, headY, barWidth, barHeight);

    ctx.fillStyle = hpRatio > 0.5 ? '#48bb78' : hpRatio > 0.25 ? '#ecc94b' : '#f56565';
    ctx.fillRect(cx - barWidth / 2, headY, barWidth * hpRatio, barHeight);

    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText(`Lvl.${player.level} ${player.name}`, cx + 1, headY - 3);

    ctx.fillStyle = isLocal ? '#ffffff' : '#68d391';
    ctx.fillText(`Lvl.${player.level} ${player.name}`, cx, headY - 4);

    if (player.chatBubble) {
      this.renderChatBubble(player.chatBubble, cx, headY - 18);
    }
  }

  renderChatBubble(text, x, y) {
    const ctx = this.ctx;
    ctx.font = '12px sans-serif';
    const metrics = ctx.measureText(text);
    const bubbleWidth = metrics.width + 16;
    const bubbleHeight = 22;
    const bx = x - bubbleWidth / 2;
    const by = y - bubbleHeight;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.roundRect(bx, by, bubbleWidth, bubbleHeight, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1a202c';
    ctx.textAlign = 'center';
    ctx.fillText(text, x, by + 15);
  }
}
