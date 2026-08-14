// Gerador de Sprites Pixel-Art Procedurais (Tiles e Personagens)
import { CONFIG } from '../config.js';

class SpriteGenerator {
  constructor() {
    this.cache = {};
  }

  // Gera um Canvas Offscreen com um tamanho específico
  createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return { canvas, ctx };
  }

  // Inicializa todos os sprites procedurais e os armazena em cache
  init() {
    const size = CONFIG.TILE_SIZE;

    // 1. Tile de Grama (Com Variações)
    this.cache['grass_0'] = this.drawGrassTile(size, 0);
    this.cache['grass_1'] = this.drawGrassTile(size, 1);
    this.cache['grass_2'] = this.drawGrassTile(size, 2);

    // 2. Tile de Caminho de Pedra (Cobblestone)
    this.cache['cobble'] = this.drawCobbleTile(size);

    // 3. Tile de Terra (Dirt)
    this.cache['dirt'] = this.drawDirtTile(size);

    // 4. Tile de Água
    this.cache['water_0'] = this.drawWaterTile(size, 0);
    this.cache['water_1'] = this.drawWaterTile(size, 1);

    // 5. Obstáculos: Árvore (Tronco e Copa)
    this.cache['tree_trunk'] = this.drawTreeTrunk(size);
    this.cache['tree_canopy'] = this.drawTreeCanopy(size * 1.6);

    // 6. Obstáculos: Rocha
    this.cache['rock'] = this.drawRockTile(size);

    // 7. Flores
    this.cache['flowers'] = this.drawFlowersTile(size);

    // 8. Portal
    this.cache['portal'] = this.drawPortalTile(size);

    // 9. Personagens (Knight, Mage, Paladin)
    CONFIG.CLASSES.forEach(cls => {
      this.cache[`char_${cls.id}`] = this.drawCharacterSpritesheet(size, cls);
    });
  }

  // Desenha um tile de Grama com lâminas e sombras em Pixel Art
  drawGrassTile(size, variant) {
    const { canvas, ctx } = this.createCanvas(size, size);
    
    // Fundo verde base
    const baseColors = ['#48bb78', '#38a169', '#2f855a'];
    ctx.fillStyle = baseColors[variant % baseColors.length];
    ctx.fillRect(0, 0, size, size);

    // Detalhes de ruído em pixel
    ctx.fillStyle = '#276749';
    for (let i = 0; i < size * 3; i++) {
      const px = Math.floor(Math.sin(i * 12.3 + variant) * size / 2 + size / 2);
      const py = Math.floor(Math.cos(i * 7.8 + variant) * size / 2 + size / 2);
      ctx.fillRect(px, py, 2, 2);
    }

    // Lâminas de grama
    ctx.fillStyle = '#68d391';
    const blades = [
      [4, 8], [12, 20], [24, 6], [28, 22], [16, 14], [8, 28]
    ];
    blades.forEach(([x, y]) => {
      ctx.fillRect(x, y, 2, 6);
      ctx.fillRect(x + 2, y - 2, 2, 4);
    });

    return canvas;
  }

  // Desenha Calçamento de Pedras (Cobblestone)
  drawCobbleTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    ctx.fillStyle = '#718096';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#4a5568'; // Linhas de rejunte
    ctx.fillRect(0, 0, size, size);

    // Blocos de pedra
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
      ctx.fillStyle = '#e2e8f0'; // Brilho superior da pedra
      ctx.fillRect(s.x, s.y, s.w, 2);
    });

    return canvas;
  }

  // Desenha Terra (Dirt)
  drawDirtTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    ctx.fillStyle = '#975a16';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#744210';
    for (let i = 0; i < 30; i++) {
      const rx = (i * 13) % size;
      const ry = (i * 29) % size;
      ctx.fillRect(rx, ry, 3, 3);
    }

    ctx.fillStyle = '#c05621';
    for (let i = 0; i < 15; i++) {
      const rx = (i * 17) % size;
      const ry = (i * 11) % size;
      ctx.fillRect(rx, ry, 2, 2);
    }
    return canvas;
  }

  // Desenha Água Animada
  drawWaterTile(size, frame) {
    const { canvas, ctx } = this.createCanvas(size, size);
    ctx.fillStyle = '#3182ce';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#4299e1';
    const offset = frame * 4;
    ctx.fillRect(4 + offset, 8, 16, 4);
    ctx.fillRect(20 - offset, 24, 20, 4);
    ctx.fillRect(8, 36 - offset, 12, 3);

    ctx.fillStyle = '#90cdf4'; // Brilho de onda
    ctx.fillRect(6 + offset, 8, 8, 2);
    ctx.fillRect(22 - offset, 24, 10, 2);

    return canvas;
  }

  // Desenha Flores sobre a grama
  drawFlowersTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    ctx.drawImage(this.cache['grass_0'], 0, 0);

    const flowerPositions = [
      { x: 8, y: 10, color: '#f6e05e' },
      { x: 26, y: 14, color: '#fc8181' },
      { x: 16, y: 28, color: '#e9d8a6' },
      { x: 30, y: 34, color: '#f6ad55' }
    ];

    flowerPositions.forEach(f => {
      ctx.fillStyle = f.color;
      ctx.fillRect(f.x - 2, f.y, 6, 2);
      ctx.fillRect(f.x, f.y - 2, 2, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(f.x, f.y, 2, 2);
    });

    return canvas;
  }

  // Desenha Rocha (Obstáculo)
  drawRockTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    
    // Grama de fundo
    ctx.drawImage(this.cache['grass_0'], 0, 0);

    // Sombra da Rocha
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(size / 2, size - 6, size / 2.2, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rocha Principal
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(6, 8, 36, 32);

    ctx.fillStyle = '#718096'; // Lado iluminado
    ctx.fillRect(8, 6, 32, 24);

    ctx.fillStyle = '#cbd5e0'; // Brilho topo
    ctx.fillRect(10, 8, 20, 8);

    // Fissuras / Textura
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(16, 18, 2, 12);
    ctx.fillRect(18, 22, 6, 2);

    return canvas;
  }

  // Tronco da Árvore
  drawTreeTrunk(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    ctx.drawImage(this.cache['grass_0'], 0, 0);

    // Sombra projetada
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(size / 2, size - 4, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tronco de Madeira
    ctx.fillStyle = '#744210';
    ctx.fillRect(size / 2 - 8, 12, 16, 32);

    ctx.fillStyle = '#975a16'; // Casca iluminada
    ctx.fillRect(size / 2 - 6, 12, 8, 32);

    ctx.fillStyle = '#521b02'; // Casca sombra
    ctx.fillRect(size / 2 + 2, 12, 6, 32);

    return canvas;
  }

  // Copa da Árvore (Elevada / Z-Index superior)
  drawTreeCanopy(width) {
    const height = width;
    const { canvas, ctx } = this.createCanvas(width, height);

    const cx = width / 2;
    const cy = height / 2;

    // Sombra sob a copa
    ctx.fillStyle = 'rgba(15, 40, 20, 0.4)';
    ctx.beginPath();
    ctx.arc(cx, cy + 4, width / 2.3, 0, Math.PI * 2);
    ctx.fill();

    // Camada Verde Escura
    ctx.fillStyle = '#22543d';
    ctx.beginPath();
    ctx.arc(cx, cy, width / 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Camada Verde Média
    ctx.fillStyle = '#2f855a';
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 4, width / 2.6, 0, Math.PI * 2);
    ctx.fill();

    // Camada Verde Clara (Highlights)
    ctx.fillStyle = '#48bb78';
    ctx.beginPath();
    ctx.arc(cx - 8, cy - 8, width / 3.4, 0, Math.PI * 2);
    ctx.fill();

    // Frutas / Maçãs na árvore
    ctx.fillStyle = '#e53e3e';
    const apples = [[cx - 10, cy], [cx + 8, cy - 8], [cx - 2, cy + 10]];
    apples.forEach(([ax, ay]) => {
      ctx.fillRect(ax, ay, 4, 4);
    });

    return canvas;
  }

  // Portal Mágico
  drawPortalTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    ctx.drawImage(this.cache['cobble'], 0, 0);

    // Anel de luz mágica
    const cx = size / 2;
    const cy = size / 2;

    ctx.fillStyle = 'rgba(159, 122, 234, 0.5)';
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#805ad5';
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#d6bcfa';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();

    return canvas;
  }

  // Desenha um Spritesheet de Personagem (4 Direções x 3 Frames de Animação)
  // Grid: 4 colunas (south, north, east, west) x 3 linhas (idle, step1, step2)
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

  // Renderiza um frame individual do personagem com corpo, cabeça, roupas e armas
  renderCharacterFrame(ctx, offsetX, offsetY, size, dir, frame, cls) {
    const cx = offsetX + size / 2;
    const cy = offsetY + size / 2;

    // Sombra nos pés
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 18, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Animação de Pernas (passos)
    let legOffsetLeft = 0;
    let legOffsetRight = 0;
    if (frame === 1) legOffsetLeft = -4;
    if (frame === 2) legOffsetRight = -4;

    // Botas / Pernas
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(cx - 8, cy + 10 + legOffsetLeft, 6, 8);
    ctx.fillRect(cx + 2, cy + 10 + legOffsetRight, 6, 8);

    // Corpo / Túnica (Baseada na cor primária da classe)
    ctx.fillStyle = cls.primaryColor;
    ctx.fillRect(cx - 10, cy - 4, 20, 16);

    // Cinto
    ctx.fillStyle = '#d69e2e';
    ctx.fillRect(cx - 10, cy + 8, 20, 3);

    // Detalhes da Classe (Armadura / Capa)
    if (cls.id === 'knight') {
      ctx.fillStyle = '#e2e8f0'; // Peitoral de aço
      ctx.fillRect(cx - 6, cy - 2, 12, 10);
    } else if (cls.id === 'mage') {
      ctx.fillStyle = '#d6bcfa'; // Gola mágica
      ctx.fillRect(cx - 8, cy - 4, 16, 5);
    } else if (cls.id === 'paladin') {
      ctx.fillStyle = '#b7791f'; // Colete de couro
      ctx.fillRect(cx - 7, cy - 2, 14, 10);
    }

    // Cabeça / Tom de pele
    ctx.fillStyle = '#fbd38d';
    ctx.fillRect(cx - 7, cy - 18, 14, 14);

    // Cabelo ou Capacete
    if (cls.id === 'knight') {
      ctx.fillStyle = '#718096'; // Capacete metálico
      ctx.fillRect(cx - 8, cy - 20, 16, 8);
      ctx.fillRect(cx - 4, cy - 14, 8, 2);
    } else if (cls.id === 'mage') {
      ctx.fillStyle = '#4a5568'; // Capuz
      ctx.fillRect(cx - 9, cy - 21, 18, 9);
    } else {
      ctx.fillStyle = '#d69e2e'; // Cabelo loiro
      ctx.fillRect(cx - 8, cy - 20, 16, 7);
    }

    // Olhos conforme direção
    ctx.fillStyle = '#1a202c';
    if (dir === 'south') {
      ctx.fillRect(cx - 4, cy - 12, 2, 3);
      ctx.fillRect(cx + 2, cy - 12, 2, 3);
    } else if (dir === 'east') {
      ctx.fillRect(cx + 3, cy - 12, 3, 3);
    } else if (dir === 'west') {
      ctx.fillRect(cx - 6, cy - 12, 3, 3);
    }
    // North: De costas, sem olhos.

    // Equipamento / Arma conforme a direção
    ctx.fillStyle = '#cbd5e0';
    if (cls.id === 'knight') {
      // Espada
      if (dir === 'east' || dir === 'south') {
        ctx.fillRect(cx + 10, cy - 8, 3, 16); // Lâmina
        ctx.fillStyle = '#d69e2e';
        ctx.fillRect(cx + 8, cy + 4, 7, 3); // Guarda
      } else {
        ctx.fillRect(cx - 12, cy - 8, 3, 16);
      }
    } else if (cls.id === 'mage') {
      // Cajado Mágico
      ctx.fillStyle = '#744210';
      ctx.fillRect(cx + 10, cy - 14, 3, 24);
      ctx.fillStyle = '#63b3ed'; // Orbe brilhante
      ctx.fillRect(cx + 9, cy - 18, 5, 5);
    }
  }

  // Obtém um sprite do cache
  get(key) {
    return this.cache[key] || this.cache['grass_0'];
  }
}

export const spriteGen = new SpriteGenerator();
