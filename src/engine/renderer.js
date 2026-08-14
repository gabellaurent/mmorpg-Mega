// Motor de Renderização HTML5 Canvas 2D
import { CONFIG } from '../config.js';
import { spriteGen } from './spriteGenerator.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    // Posição da Câmera
    this.cameraX = 0;
    this.cameraY = 0;

    // Configuração de exibições
    this.showGridOverlay = false;
  }

  // Ajusta a resolução do Canvas para corresponder ao tamanho da janela
  resize() {
    this.canvas.width = this.canvas.parentElement.clientWidth;
    this.canvas.height = this.canvas.parentElement.clientHeight;
    this.ctx.imageSmoothingEnabled = false;
  }

  // Atualiza a posição da câmera centralizando no jogador local com travamento nas bordas do mapa
  updateCamera(player) {
    const tileSize = CONFIG.TILE_SIZE;
    const mapPixelWidth = CONFIG.GRID_WIDTH * tileSize;
    const mapPixelHeight = CONFIG.GRID_HEIGHT * tileSize;

    const targetCamX = player.renderX + tileSize / 2 - this.canvas.width / 2;
    const targetCamY = player.renderY + tileSize / 2 - this.canvas.height / 2;

    this.cameraX += (targetCamX - this.cameraX) * 0.15;
    this.cameraY += (targetCamY - this.cameraY) * 0.15;

    this.cameraX = Math.max(0, Math.min(this.cameraX, mapPixelWidth - this.canvas.width));
    this.cameraY = Math.max(0, Math.min(this.cameraY, mapPixelHeight - this.canvas.height));
  }

  // Loop Principal de Renderização
  render(gameMap, localPlayer, remotePlayersMap) {
    const ctx = this.ctx;
    const tileSize = CONFIG.TILE_SIZE;

    // 1. Limpar tela com fundo preto
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(-Math.floor(this.cameraX), -Math.floor(this.cameraY));

    const startCol = Math.max(0, Math.floor(this.cameraX / tileSize));
    const endCol = Math.min(CONFIG.GRID_WIDTH - 1, Math.ceil((this.cameraX + this.canvas.width) / tileSize));
    const startRow = Math.max(0, Math.floor(this.cameraY / tileSize));
    const endRow = Math.min(CONFIG.GRID_HEIGHT - 1, Math.ceil((this.cameraY + this.canvas.height) / tileSize));

    // PASSO 1: Terrenos Base (Grama, Cobblestone, Água, Portal)
    for (let y = startRow; y <= endRow; y++) {
      for (let x = startCol; x <= endCol; x++) {
        const tile = gameMap.getTile(x, y);
        if (!tile) continue;

        const drawX = x * tileSize;
        const drawY = y * tileSize;

        const tileImg = spriteGen.get(tile.spriteKey);
        ctx.drawImage(tileImg, drawX, drawY, tileSize, tileSize);
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

    // PASSO 3: Entidades (Jogador Local + Outros Jogadores ordenados por Y)
    const allEntities = [
      { player: localPlayer, isLocal: true },
      ...Array.from(remotePlayersMap.values()).map(p => ({ player: p, isLocal: false }))
    ];
    allEntities.sort((a, b) => a.player.renderY - b.player.renderY);

    allEntities.forEach(item => {
      this.renderPlayer(item.player, item.isLocal);
    });

    // PASSO 4: Copas das Árvores (Z-index elevado)
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

    ctx.restore();
  }

  // Renderiza um personagem com destaque de aura para jogadores remotos
  renderPlayer(player, isLocal = false) {
    const ctx = this.ctx;
    const tileSize = CONFIG.TILE_SIZE;

    // Se for jogador remoto, desenhar aura de destaque nos pés
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

    // Barra de Vida
    const barWidth = 36;
    const barHeight = 4;
    const hpRatio = Math.max(0, Math.min(1, player.hp / player.maxHp));

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(cx - barWidth / 2, headY, barWidth, barHeight);

    ctx.fillStyle = hpRatio > 0.5 ? '#48bb78' : hpRatio > 0.25 ? '#ecc94b' : '#f56565';
    ctx.fillRect(cx - barWidth / 2, headY, barWidth * hpRatio, barHeight);

    // Texto do Nome (Destaque em verde claro se for outro jogador)
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText(`Lvl.${player.level} ${player.name}`, cx + 1, headY - 3);

    ctx.fillStyle = isLocal ? '#ffffff' : '#68d391'; // Verde radiante para jogadores remotos!
    ctx.fillText(`Lvl.${player.level} ${player.name}`, cx, headY - 4);

    // Balão de Chat se houver mensagem
    if (player.chatBubble) {
      this.renderChatBubble(player.chatBubble, cx, headY - 18);
    }
  }

  // Renderiza um Balão de Fala Mágico sobre a cabeça do personagem
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

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.moveTo(x - 4, by + bubbleHeight);
    ctx.lineTo(x + 4, by + bubbleHeight);
    ctx.lineTo(x, by + bubbleHeight + 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1a202c';
    ctx.textAlign = 'center';
    ctx.fillText(text, x, by + 15);
  }
}
