// Gerador de Sprites Pixel-Art Procedurais (Tiles, Monstros e Personagens)
import { CONFIG } from '../config.js';

class SpriteGenerator {
  constructor() {
    this.cache = {};
  }

  createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return { canvas, ctx };
  }

  init() {
    const size = CONFIG.TILE_SIZE;

    // 1. Tiles de Terreno
    this.cache['grass_0'] = this.drawGrassTile(size, 0);
    this.cache['grass_1'] = this.drawGrassTile(size, 1);
    this.cache['grass_2'] = this.drawGrassTile(size, 2);
    this.cache['cobble'] = this.drawCobbleTile(size);
    this.cache['dirt'] = this.drawDirtTile(size);
    this.cache['water_0'] = this.drawWaterTile(size, 0);
    this.cache['water_1'] = this.drawWaterTile(size, 1);

    // 2. Obstáculos e Estruturas
    this.cache['tree_trunk'] = this.drawTreeTrunk(size);
    this.cache['tree_canopy'] = this.drawTreeCanopy(size * 1.6);
    this.cache['rock'] = this.drawRockTile(size);
    this.cache['flowers'] = this.drawFlowersTile(size);
    this.cache['portal'] = this.drawPortalTile(size);
    this.cache['gate_pillar'] = this.drawGatePillarTile(size);

    // 3. Monstro: Rat (Cave Rat)
    this.cache['rat'] = this.drawRatSprite(size);

    // 4. Personagens e NPCs
    CONFIG.CLASSES.forEach(cls => {
      this.cache[`char_${cls.id}`] = this.drawCharacterSpritesheet(size, cls);
    });
    this.cache['npc_guard'] = this.drawGuardSpritesheet(size);
    this.cache['npc_merchant'] = this.drawMerchantSpritesheet(size);
  }

  drawGrassTile(size, variant) {
    const { canvas, ctx } = this.createCanvas(size, size);
    const baseColors = ['#48bb78', '#38a169', '#2f855a'];
    ctx.fillStyle = baseColors[variant % baseColors.length];
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#276749';
    for (let i = 0; i < size * 3; i++) {
      const px = Math.floor(Math.sin(i * 12.3 + variant) * size / 2 + size / 2);
      const py = Math.floor(Math.cos(i * 7.8 + variant) * size / 2 + size / 2);
      ctx.fillRect(px, py, 2, 2);
    }

    ctx.fillStyle = '#68d391';
    const blades = [[4, 8], [12, 20], [24, 6], [28, 22], [16, 14], [8, 28]];
    blades.forEach(([x, y]) => {
      ctx.fillRect(x, y, 2, 6);
      ctx.fillRect(x + 2, y - 2, 2, 4);
    });
    return canvas;
  }

  drawCobbleTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    ctx.fillStyle = '#718096';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#4a5568';
    ctx.fillRect(0, 0, size, size);

    const stones = [
      { x: 2, y: 2, w: 20, h: 12, c: '#a0aec0' },
      { x: 24, y: 2, w: 22, h: 12, c: '#cbd5e0' },
      { x: 2, y: 16, w: 22, h: 14, c: '#cbd5e0' },
      { x: 26, y: 16, w: 20, h: 14, c: '#a0aec0' },
      { x: 2, y: 32, w: 44, h: 14, c: '#718096' }
    ];

    stones.forEach(s => {
      ctx.fillStyle = s.c;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(s.x, s.y, s.w, 2);
    });

    return canvas;
  }

  drawDirtTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    ctx.fillStyle = '#975a16';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#744210';
    for (let i = 0; i < 30; i++) {
      ctx.fillRect((i * 13) % size, (i * 29) % size, 3, 3);
    }
    return canvas;
  }

  drawWaterTile(size, frame) {
    const { canvas, ctx } = this.createCanvas(size, size);
    ctx.fillStyle = '#3182ce';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#4299e1';
    const offset = frame * 4;
    ctx.fillRect(4 + offset, 8, 16, 4);
    ctx.fillRect(20 - offset, 24, 20, 4);
    ctx.fillStyle = '#90cdf4';
    ctx.fillRect(6 + offset, 8, 8, 2);
    return canvas;
  }

  drawFlowersTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    ctx.drawImage(this.cache['grass_0'], 0, 0);
    const flowerPositions = [
      { x: 8, y: 10, color: '#f6e05e' },
      { x: 26, y: 14, color: '#fc8181' },
      { x: 16, y: 28, color: '#e9d8a6' }
    ];
    flowerPositions.forEach(f => {
      ctx.fillStyle = f.color;
      ctx.fillRect(f.x - 2, f.y, 6, 2);
      ctx.fillRect(f.x, f.y - 2, 2, 6);
    });
    return canvas;
  }

  drawRockTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    ctx.drawImage(this.cache['grass_0'], 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(size / 2, size - 6, size / 2.2, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(6, 8, 36, 32);
    ctx.fillStyle = '#718096';
    ctx.fillRect(8, 6, 32, 24);
    return canvas;
  }

  drawTreeTrunk(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    ctx.drawImage(this.cache['grass_0'], 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(size / 2, size - 4, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#744210';
    ctx.fillRect(size / 2 - 8, 12, 16, 32);
    return canvas;
  }

  drawTreeCanopy(width) {
    const height = width;
    const { canvas, ctx } = this.createCanvas(width, height);
    const cx = width / 2;
    const cy = height / 2;
    ctx.fillStyle = '#22543d';
    ctx.beginPath();
    ctx.arc(cx, cy, width / 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#48bb78';
    ctx.beginPath();
    ctx.arc(cx - 8, cy - 8, width / 3.4, 0, Math.PI * 2);
    ctx.fill();
    return canvas;
  }

  drawPortalTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    ctx.drawImage(this.cache['cobble'], 0, 0);
    const cx = size / 2;
    const cy = size / 2;
    ctx.fillStyle = '#805ad5';
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();
    return canvas;
  }

  // Desenha Monstro Rat (Cave Rat) em Pixel-Art com olhos vermelhos brilhantes
  drawRatSprite(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    const cx = size / 2;
    const cy = size / 2 + 4;

    // Sombra no chão
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cauda de rato rosa
    ctx.fillStyle = '#fed7e2';
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy + 6);
    ctx.quadraticCurveTo(cx - 20, cy + 12, cx - 22, cy + 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#fed7e2';
    ctx.stroke();

    // Corpo de pelo cinza
    ctx.fillStyle = '#4a5568';
    ctx.beginPath();
    ctx.ellipse(cx - 2, cy + 4, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Barriga cinza clara
    ctx.fillStyle = '#718096';
    ctx.beginPath();
    ctx.ellipse(cx - 2, cy + 6, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cabeça
    ctx.fillStyle = '#4a5568';
    ctx.beginPath();
    ctx.ellipse(cx + 8, cy + 2, 8, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Focinho
    ctx.fillStyle = '#fbb6ce';
    ctx.fillRect(cx + 14, cy + 3, 3, 3);

    // Orelhas rosa
    ctx.fillStyle = '#fbb6ce';
    ctx.beginPath();
    ctx.arc(cx + 4, cy - 4, 4, 0, Math.PI * 2);
    ctx.fill();

    // Olhos vermelhos brilhantes (Malvados)
    ctx.fillStyle = '#e53e3e';
    ctx.fillRect(cx + 10, cy, 3, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx + 11, cy, 1, 1);

    // Dentes incisivos
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx + 14, cy + 6, 2, 3);

    return canvas;
  }

  drawCharacterSpritesheet(tileSize, classInfo) {
    const width = tileSize * 4;
    const height = tileSize * 3;
    const { canvas, ctx } = this.createCanvas(width, height);

    const directions = ['south', 'north', 'east', 'west'];

    directions.forEach((dir, colIndex) => {
      for (let frameIndex = 0; frameIndex < 3; frameIndex++) {
        const destX = colIndex * tileSize;
        const destY = frameIndex * tileSize;
        this.renderCharacterFrame(ctx, destX, destY, tileSize, dir, frameIndex, classInfo);
      }
    });

    return canvas;
  }

  renderCharacterFrame(ctx, offsetX, offsetY, size, dir, frame, cls) {
    const cx = offsetX + size / 2;
    const cy = offsetY + size / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 18, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    let legOffsetLeft = 0;
    let legOffsetRight = 0;
    if (frame === 1) legOffsetLeft = -4;
    if (frame === 2) legOffsetRight = -4;

    ctx.fillStyle = '#1a202c';
    ctx.fillRect(cx - 8, cy + 10 + legOffsetLeft, 6, 8);
    ctx.fillRect(cx + 2, cy + 10 + legOffsetRight, 6, 8);

    ctx.fillStyle = cls.primaryColor;
    ctx.fillRect(cx - 10, cy - 4, 20, 16);

    ctx.fillStyle = '#d69e2e';
    ctx.fillRect(cx - 10, cy + 8, 20, 3);

    if (cls.id === 'knight') {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(cx - 6, cy - 2, 12, 10);
    } else if (cls.id === 'mage') {
      ctx.fillStyle = '#d6bcfa';
      ctx.fillRect(cx - 8, cy - 4, 16, 5);
    } else if (cls.id === 'paladin') {
      ctx.fillStyle = '#b7791f';
      ctx.fillRect(cx - 7, cy - 2, 14, 10);
    }

    ctx.fillStyle = '#fbd38d';
    ctx.fillRect(cx - 7, cy - 18, 14, 14);

    if (cls.id === 'knight') {
      ctx.fillStyle = '#718096';
      ctx.fillRect(cx - 8, cy - 20, 16, 8);
    } else if (cls.id === 'mage') {
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(cx - 9, cy - 21, 18, 9);
    } else {
      ctx.fillStyle = '#d69e2e';
      ctx.fillRect(cx - 8, cy - 20, 16, 7);
    }

    ctx.fillStyle = '#1a202c';
    if (dir === 'south') {
      ctx.fillRect(cx - 4, cy - 12, 2, 3);
      ctx.fillRect(cx + 2, cy - 12, 2, 3);
    } else if (dir === 'east') {
      ctx.fillRect(cx + 3, cy - 12, 3, 3);
    } else if (dir === 'west') {
      ctx.fillRect(cx - 6, cy - 12, 3, 3);
    }
  }

  drawGatePillarTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    ctx.drawImage(this.cache['cobble'], 0, 0);

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(size / 2, size - 4, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2d3748';
    ctx.fillRect(8, 14, 32, 30);
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(10, 16, 28, 26);
    ctx.fillStyle = '#718096';
    ctx.fillRect(12, 18, 24, 8);
    ctx.fillRect(12, 28, 24, 8);

    ctx.fillStyle = '#744210';
    ctx.fillRect(6, 6, 36, 10);
    ctx.fillStyle = '#d69e2e';
    ctx.fillRect(8, 4, 32, 4);

    ctx.fillStyle = '#ed8936';
    ctx.beginPath();
    ctx.arc(size / 2, 6, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ecc94b';
    ctx.beginPath();
    ctx.arc(size / 2, 6, 3, 0, Math.PI * 2);
    ctx.fill();

    return canvas;
  }

  drawGuardSpritesheet(tileSize) {
    const width = tileSize * 4;
    const height = tileSize * 3;
    const { canvas, ctx } = this.createCanvas(width, height);
    const directions = ['south', 'north', 'east', 'west'];

    directions.forEach((dir, colIndex) => {
      for (let frameIndex = 0; frameIndex < 3; frameIndex++) {
        const destX = colIndex * tileSize;
        const destY = frameIndex * tileSize;
        this.renderGuardFrame(ctx, destX, destY, tileSize, dir, frameIndex);
      }
    });

    return canvas;
  }

  renderGuardFrame(ctx, offsetX, offsetY, size, dir, frame) {
    const cx = offsetX + size / 2;
    const cy = offsetY + size / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 18, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    let legOffsetLeft = 0;
    let legOffsetRight = 0;
    if (frame === 1) legOffsetLeft = -4;
    if (frame === 2) legOffsetRight = -4;

    ctx.fillStyle = '#2d3748';
    ctx.fillRect(cx - 8, cy + 10 + legOffsetLeft, 6, 8);
    ctx.fillRect(cx + 2, cy + 10 + legOffsetRight, 6, 8);

    ctx.fillStyle = '#2b6cb0';
    ctx.fillRect(cx - 11, cy - 6, 22, 18);

    ctx.fillStyle = '#cbd5e0';
    ctx.fillRect(cx - 9, cy - 4, 18, 15);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(cx - 7, cy - 2, 14, 11);

    ctx.fillStyle = '#d69e2e';
    ctx.fillRect(cx - 9, cy + 7, 18, 3);
    ctx.fillStyle = '#ecc94b';
    ctx.fillRect(cx - 2, cy + 6, 5, 5);

    ctx.fillStyle = '#a0aec0';
    ctx.fillRect(cx - 7, cy - 18, 14, 14);

    ctx.fillStyle = '#1a202c';
    if (dir === 'south') {
      ctx.fillRect(cx - 5, cy - 13, 10, 3);
    } else if (dir === 'east') {
      ctx.fillRect(cx + 1, cy - 13, 5, 3);
    } else if (dir === 'west') {
      ctx.fillRect(cx - 6, cy - 13, 5, 3);
    } else {
      ctx.fillRect(cx - 4, cy - 15, 8, 2);
    }

    ctx.fillStyle = '#e53e3e';
    ctx.fillRect(cx - 2, cy - 23, 5, 6);
    ctx.fillRect(cx - 4, cy - 21, 9, 3);

    ctx.fillStyle = '#744210';
    ctx.fillRect(cx + 9, cy - 22, 3, 34);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(cx + 8, cy - 28, 5, 7);
    ctx.fillStyle = '#ecc94b';
    ctx.fillRect(cx + 9, cy - 21, 3, 3);
  }

  drawMerchantSpritesheet(tileSize) {
    const width = tileSize * 4;
    const height = tileSize * 3;
    const { canvas, ctx } = this.createCanvas(width, height);
    const directions = ['south', 'north', 'east', 'west'];

    directions.forEach((dir, colIndex) => {
      for (let frameIndex = 0; frameIndex < 3; frameIndex++) {
        const destX = colIndex * tileSize;
        const destY = frameIndex * tileSize;
        this.renderMerchantFrame(ctx, destX, destY, tileSize, dir, frameIndex);
      }
    });

    return canvas;
  }

  renderMerchantFrame(ctx, offsetX, offsetY, size, dir, frame) {
    const cx = offsetX + size / 2;
    const cy = offsetY + size / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 18, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    let legOffsetLeft = 0;
    let legOffsetRight = 0;
    if (frame === 1) legOffsetLeft = -4;
    if (frame === 2) legOffsetRight = -4;

    ctx.fillStyle = '#744210';
    ctx.fillRect(cx - 8, cy + 10 + legOffsetLeft, 6, 8);
    ctx.fillRect(cx + 2, cy + 10 + legOffsetRight, 6, 8);

    ctx.fillStyle = '#22543d';
    ctx.fillRect(cx - 10, cy - 4, 20, 16);
    ctx.fillStyle = '#38a169';
    ctx.fillRect(cx - 7, cy - 2, 14, 14);

    ctx.fillStyle = '#d69e2e';
    ctx.fillRect(cx - 5, cy - 2, 10, 12);
    ctx.fillStyle = '#ecc94b';
    ctx.fillRect(cx - 3, cy, 6, 8);

    ctx.fillStyle = '#975a16';
    if (dir === 'south' || dir === 'east' || dir === 'west') {
      ctx.fillRect(cx - 13, cy - 2, 5, 12);
    } else {
      ctx.fillRect(cx - 11, cy - 6, 22, 15);
    }

    ctx.fillStyle = '#fbd38d';
    ctx.fillRect(cx - 7, cy - 18, 14, 14);

    ctx.fillStyle = '#744210';
    ctx.fillRect(cx - 6, cy - 10, 12, 6);

    ctx.fillStyle = '#744210';
    ctx.fillRect(cx - 12, cy - 18, 24, 4);
    ctx.fillStyle = '#b7791f';
    ctx.fillRect(cx - 8, cy - 24, 16, 7);
    ctx.fillStyle = '#ecc94b';
    ctx.fillRect(cx - 8, cy - 19, 16, 2);

    ctx.fillStyle = '#e53e3e';
    ctx.fillRect(cx + 5, cy - 27, 4, 8);

    ctx.fillStyle = '#1a202c';
    if (dir === 'south') {
      ctx.fillRect(cx - 4, cy - 14, 2, 2);
      ctx.fillRect(cx + 2, cy - 14, 2, 2);
    } else if (dir === 'east') {
      ctx.fillRect(cx + 3, cy - 14, 2, 2);
    } else if (dir === 'west') {
      ctx.fillRect(cx - 5, cy - 14, 2, 2);
    }
  }

  get(key) {
    return this.cache[key] || this.cache['grass_0'];
  }
}

export const spriteGen = new SpriteGenerator();
