// Gerador de Sprites Pixel-Art Procedurais (Tiles, Monstros e Personagens)
import { CONFIG } from '../config.js';

class SpriteGenerator {
  constructor() {
    this.cache = {};
    this.initialized = false;
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
    if (this.initialized) return;
    this.initialized = true;
    const size = CONFIG.TILE_SIZE;

    // 1. Tiles de Terreno
    this.cache['grass_0'] = this.drawGrassTile(size, 0);
    this.cache['grass_1'] = this.drawGrassTile(size, 1);
    this.cache['grass_2'] = this.drawGrassTile(size, 2);
    this.cache['grass_dry'] = this.drawGrassTile(size, 'dry');
    this.cache['grass_dark'] = this.drawGrassTile(size, 'dark');
    this.cache['grass_moss'] = this.drawGrassTile(size, 'moss');
    this.cache['cobble'] = this.drawCobbleTile(size);
    this.cache['dirt'] = this.drawDirtTile(size);
    this.cache['water_0'] = this.drawWaterTile(size, 0);
    this.cache['water_1'] = this.drawWaterTile(size, 1);

    // 2. Obstáculos, Plantas e Estruturas
    this.cache['tree_trunk'] = this.drawTreeTrunk(size);
    this.cache['tree_canopy'] = this.drawTreeCanopy(size * 1.6);

    // Modelos de Árvores Especiais (Pinheiros Coníferas)
    this.cache['tree_pine_trunk'] = this.drawTreeTrunk(size);
    this.cache['tree_pine_canopy'] = this.drawTreePineCanopy(size * 1.6);

    this.cache['rock'] = this.drawRockTile(size);
    this.cache['flowers'] = this.drawFlowersTile(size);
    this.cache['flowers_red'] = this.drawFlowersTileVariant(size, '#f56565', '#e53e3e');
    this.cache['flowers_blue'] = this.drawFlowersTileVariant(size, '#4299e1', '#63b3ed');
    this.cache['flowers_purple'] = this.drawFlowersTileVariant(size, '#9f7aea', '#b794f4');
    this.cache['bush_berry'] = this.drawBerryBushTile(size);
    this.cache['bush_large'] = this.drawBigBushTile(size);
    this.cache['tall_grass'] = this.drawTallGrassTile(size);

    this.cache['portal'] = this.drawPortalTile(size);
    this.cache['gate_pillar'] = this.drawGatePillarTile(size);
    this.cache['wall_wood'] = this.drawWallWoodTile(size);
    this.cache['wood_floor'] = this.drawWoodFloorTile(size);
    this.cache['house_door'] = this.drawHouseDoorTile(size);
    this.cache['house_bed'] = this.drawHouseBedTile(size);
    this.cache['house_table'] = this.drawHouseTableTile(size);
    this.cache['house_fireplace'] = this.drawHouseFireplaceTile(size);
    this.cache['house_chest'] = this.drawHouseChestTile(size);
    this.cache['void'] = this.drawVoidTile(size);

    // Tiles de Caverna & Magma (Sub-níveis 1 e 2)
    this.cache['cave_floor'] = this.drawCaveFloorTile(size);
    this.cache['cave_wall'] = this.drawCaveWallTile(size);
    this.cache['cave_hole'] = this.drawCaveHoleTile(size);
    this.cache['cave_stairs'] = this.drawCaveStairsTile(size);
    this.cache['magma_floor'] = this.drawMagmaFloorTile(size);
    this.cache['obsidian_wall'] = this.drawObsidianWallTile(size);

    // 3. Monstros: Rat, Rotworm e Guardião de Magma (Boss)
    this.cache['rat'] = this.drawRatSprite(size);
    this.cache['rotworm'] = this.drawRotwormSprite(size);
    this.cache['demon_boss'] = this.drawDemonBossSprite(size);

    // 4. Personagens e NPCs
    CONFIG.CLASSES.forEach(cls => {
      this.cache[`char_${cls.id}`] = this.drawCharacterSpritesheet(size, cls);
    });
    this.cache['npc_guard'] = this.drawGuardSpritesheet(size);
    this.cache['npc_merchant'] = this.drawMerchantSpritesheet(size);

    // 5. Sprites de Itens (Loot & Inventário)
    this.cache['item_gold'] = this.drawGoldSprite(size);
    this.cache['item_health_potion'] = this.drawHealthPotionSprite(size);
    this.cache['item_cheese'] = this.drawCheeseSprite(size);
    this.cache['item_rat_tail'] = this.drawRatTailSprite(size);

    // Carregar sprites customizados do usuário salvos no localStorage
    this.loadCustomOverrides();
  }

  loadCustomOverrides() {
    try {
      const savedCustom = localStorage.getItem('mmorpg_custom_sprites');
      if (!savedCustom) return;
      const customDict = JSON.parse(savedCustom);

      Object.keys(customDict).forEach(key => {
        const dataUri = customDict[key];
        if (dataUri) {
          this.applyDataUriToCache(key, dataUri);
        }
      });
    } catch (e) {
      console.warn('Erro ao carregar sprites customizados do localStorage:', e);
    }
  }

  applyDataUriToCache(key, dataUri) {
    const img = new Image();
    img.onload = () => {
      const size = (key.includes('canopy') ? Math.round(CONFIG.TILE_SIZE * 1.6) : CONFIG.TILE_SIZE);
      const { canvas, ctx } = this.createCanvas(size, size);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      this.cache[key] = canvas;
    };
    img.src = dataUri;
  }

  saveCustomSprite(key, dataUri) {
    try {
      const savedCustom = localStorage.getItem('mmorpg_custom_sprites');
      const customDict = savedCustom ? JSON.parse(savedCustom) : {};
      customDict[key] = dataUri;
      localStorage.setItem('mmorpg_custom_sprites', JSON.stringify(customDict));
      this.applyDataUriToCache(key, dataUri);
    } catch (e) {
      console.error('Erro ao salvar sprite customizado:', e);
    }
  }

  resetCustomSprite(key) {
    try {
      const savedCustom = localStorage.getItem('mmorpg_custom_sprites');
      if (!savedCustom) return;
      const customDict = JSON.parse(savedCustom);
      delete customDict[key];
      localStorage.setItem('mmorpg_custom_sprites', JSON.stringify(customDict));
      this.initialized = false;
      this.init();
    } catch (e) {
      console.error('Erro ao resetar sprite customizado:', e);
    }
  }

  drawGrassTile(size, variant) {
    const { canvas, ctx } = this.createCanvas(size, size);
    let baseColor = '#48bb78';
    let speckleColor = '#276749';
    let bladeColor = '#68d391';

    if (variant === 'dry') {
      baseColor = '#d69e2e';
      speckleColor = '#8c5f17';
      bladeColor = '#ecc94b';
    } else if (variant === 'dark') {
      baseColor = '#22543d';
      speckleColor = '#143827';
      bladeColor = '#2f855a';
    } else if (variant === 'moss') {
      baseColor = '#38a169';
      speckleColor = '#22543d';
      bladeColor = '#9ae6b4';
    } else {
      const baseColors = ['#48bb78', '#38a169', '#2f855a'];
      baseColor = baseColors[variant % baseColors.length];
    }

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = speckleColor;
    for (let i = 0; i < size * 3; i++) {
      const seed = (typeof variant === 'number') ? variant : 5;
      const px = Math.floor(Math.sin(i * 12.3 + seed) * size / 2 + size / 2);
      const py = Math.floor(Math.cos(i * 7.8 + seed) * size / 2 + size / 2);
      ctx.fillRect(px, py, 2, 2);
    }

    ctx.fillStyle = bladeColor;
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

  drawFlowersTileVariant(size, petalColor, centerColor) {
    const { canvas, ctx } = this.createCanvas(size, size);
    ctx.drawImage(this.cache['grass_0'], 0, 0);
    const flowerPositions = [
      { x: 8, y: 10 },
      { x: 26, y: 14 },
      { x: 16, y: 28 },
      { x: 30, y: 32 },
      { x: 10, y: 36 }
    ];
    flowerPositions.forEach(f => {
      ctx.fillStyle = petalColor;
      ctx.fillRect(f.x - 3, f.y - 1, 8, 4);
      ctx.fillRect(f.x - 1, f.y - 3, 4, 8);
      ctx.fillStyle = centerColor;
      ctx.fillRect(f.x, f.y, 2, 2);
    });
    return canvas;
  }

  drawBerryBushTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    ctx.drawImage(this.cache['grass_0'], 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(size / 2, size - 6, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2f855a';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#48bb78';
    ctx.beginPath();
    ctx.arc(size / 2 - 4, size / 2 - 4, 10, 0, Math.PI * 2);
    ctx.fill();
    const berries = [{ x: 16, y: 18 }, { x: 28, y: 20 }, { x: 22, y: 30 }, { x: 30, y: 28 }, { x: 18, y: 28 }];
    berries.forEach(b => {
      ctx.fillStyle = '#e53e3e';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fed7d7';
      ctx.fillRect(b.x - 1, b.y - 1, 1, 1);
    });
    return canvas;
  }

  // Arbusto Grande Folhado de Alto Relevo (Passável)
  drawBigBushTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    ctx.drawImage(this.cache['grass_0'], 0, 0);
    // Sombra do arbusto grande
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(size / 2, size - 5, size / 2.1, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    // Moita grande folhada volumosa em gradientes de verde
    ctx.fillStyle = '#1c4532';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2 + 2, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#276749';
    ctx.beginPath();
    ctx.arc(size / 2 - 6, size / 2 - 4, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2f855a';
    ctx.beginPath();
    ctx.arc(size / 2 + 6, size / 2 - 2, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#48bb78';
    ctx.beginPath();
    ctx.arc(size / 2 - 2, size / 2 - 8, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9ae6b4';
    ctx.beginPath();
    ctx.arc(size / 2 - 4, size / 2 - 10, 4, 0, Math.PI * 2);
    ctx.fill();
    return canvas;
  }

  // Grama Alta de Alto Relevo Densas (Estilo Pokemon / Zelda - Passável)
  drawTallGrassTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    ctx.drawImage(this.cache['grass_0'], 0, 0);
    // Ramos de Grama Alta Densos em Alto Relevo
    const tufts = [
      { x: 6, y: 12, h: 28, w: 6, c: '#2f855a', highlight: '#68d391' },
      { x: 14, y: 8, h: 32, w: 7, c: '#276749', highlight: '#9ae6b4' },
      { x: 22, y: 10, h: 30, w: 6, c: '#38a169', highlight: '#48bb78' },
      { x: 30, y: 14, h: 26, w: 6, c: '#2f855a', highlight: '#68d391' },
      { x: 38, y: 18, h: 22, w: 5, c: '#276749', highlight: '#48bb78' },
    ];
    tufts.forEach(t => {
      ctx.fillStyle = t.c;
      ctx.fillRect(t.x, size - t.h, t.w, t.h);
      ctx.fillStyle = t.highlight;
      ctx.fillRect(t.x + 1, size - t.h, 2, t.h - 4);
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

  drawTreePineCanopy(width) {
    const height = width;
    const { canvas, ctx } = this.createCanvas(width, height);
    const cx = width / 2;
    ctx.fillStyle = '#1c4532';
    ctx.beginPath();
    ctx.moveTo(cx, 4);
    ctx.lineTo(cx + 26, width - 8);
    ctx.lineTo(cx - 26, width - 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#22543d';
    ctx.beginPath();
    ctx.moveTo(cx, 12);
    ctx.lineTo(cx + 22, width - 18);
    ctx.lineTo(cx - 22, width - 18);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#2f855a';
    ctx.beginPath();
    ctx.moveTo(cx, 20);
    ctx.lineTo(cx + 16, width - 30);
    ctx.lineTo(cx - 16, width - 30);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#68d391';
    ctx.fillRect(cx - 2, 8, 4, 8);
    return canvas;
  }

  drawTreeAutumnCanopy(width) {
    const height = width;
    const { canvas, ctx } = this.createCanvas(width, height);
    const cx = width / 2;
    const cy = height / 2;
    ctx.fillStyle = '#c05621';
    ctx.beginPath();
    ctx.arc(cx, cy, width / 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#dd6b20';
    ctx.beginPath();
    ctx.arc(cx - 6, cy - 6, width / 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ed8936';
    ctx.beginPath();
    ctx.arc(cx - 10, cy - 10, width / 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f6e05e';
    ctx.beginPath();
    ctx.arc(cx - 12, cy - 12, width / 5, 0, Math.PI * 2);
    ctx.fill();
    return canvas;
  }

  drawTreeMagicTrunk(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    ctx.drawImage(this.cache['grass_0'], 0, 0);
    ctx.fillStyle = 'rgba(128, 90, 213, 0.3)';
    ctx.beginPath();
    ctx.ellipse(size / 2, size - 4, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(size / 2 - 8, 12, 16, 32);
    ctx.fillStyle = '#cbd5e0';
    ctx.fillRect(size / 2 - 6, 14, 4, 28);
    return canvas;
  }

  drawTreeMagicCanopy(width) {
    const height = width;
    const { canvas, ctx } = this.createCanvas(width, height);
    const cx = width / 2;
    const cy = height / 2;
    ctx.fillStyle = '#553c9a';
    ctx.beginPath();
    ctx.arc(cx, cy, width / 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#805ad5';
    ctx.beginPath();
    ctx.arc(cx - 6, cy - 6, width / 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9f7aea';
    ctx.beginPath();
    ctx.arc(cx - 10, cy - 10, width / 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e9d8a6';
    const sparkles = [{ x: cx - 14, y: cy - 14 }, { x: cx + 10, y: cy - 8 }, { x: cx - 6, y: cy + 12 }];
    sparkles.forEach(sp => {
      ctx.fillRect(sp.x - 2, sp.y, 5, 1);
      ctx.fillRect(sp.x, sp.y - 2, 1, 5);
    });
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

  // Desfazer/desenhar Moedas de Ouro (Brilho dourado)
  drawGoldSprite(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    const cx = size / 2;
    const cy = size / 2;

    ctx.fillStyle = '#d69e2e';
    ctx.beginPath();
    ctx.arc(cx - 3, cy + 2, 6, 0, Math.PI * 2);
    ctx.arc(cx + 4, cy + 1, 6, 0, Math.PI * 2);
    ctx.arc(cx, cy - 4, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ecc94b';
    ctx.beginPath();
    ctx.arc(cx - 3, cy + 2, 4, 0, Math.PI * 2);
    ctx.arc(cx + 4, cy + 1, 4, 0, Math.PI * 2);
    ctx.arc(cx, cy - 4, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 1, cy - 6, 2, 2);
    ctx.fillRect(cx - 4, cy, 2, 2);
    return canvas;
  }

  // Desfazer/desenhar Poção de Vida (Frasco com líquido vermelho)
  drawHealthPotionSprite(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    const cx = size / 2;
    const cy = size / 2;

    // Rolha de cortiça
    ctx.fillStyle = '#975a16';
    ctx.fillRect(cx - 3, cy - 14, 6, 4);

    // Gargalo do frasco
    ctx.fillStyle = '#cbd5e0';
    ctx.fillRect(cx - 4, cy - 10, 8, 4);

    // Corpo de vidro do frasco
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 11, 0, Math.PI * 2);
    ctx.fill();

    // Líquido vermelho mágico
    ctx.fillStyle = '#e53e3e';
    ctx.beginPath();
    ctx.arc(cx, cy + 3, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fc8181';
    ctx.beginPath();
    ctx.arc(cx - 2, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    // Brilho de vidro
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 6, cy - 3, 3, 5);
    return canvas;
  }

  // Desfazer/desenhar Fatia de Queijo
  drawCheeseSprite(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    const cx = size / 2;
    const cy = size / 2;

    ctx.fillStyle = '#d69e2e';
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 6);
    ctx.lineTo(cx + 12, cy + 6);
    ctx.lineTo(cx + 4, cy - 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f6e05e';
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 4);
    ctx.lineTo(cx + 10, cy + 4);
    ctx.lineTo(cx + 3, cy - 8);
    ctx.closePath();
    ctx.fill();

    // Furos do queijo
    ctx.fillStyle = '#b7791f';
    ctx.beginPath();
    ctx.arc(cx - 2, cy + 1, 3, 0, Math.PI * 2);
    ctx.arc(cx + 4, cy + 2, 2, 0, Math.PI * 2);
    ctx.arc(cx + 1, cy - 3, 2, 0, Math.PI * 2);
    ctx.fill();

    return canvas;
  }

  // Desfazer/desenhar Rabo de Rato
  drawRatTailSprite(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    const cx = size / 2;
    const cy = size / 2;

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#b7791f';
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 8);
    ctx.quadraticCurveTo(cx - 2, cy - 10, cx + 10, cy + 4);
    ctx.stroke();

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#fed7e2';
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 8);
    ctx.quadraticCurveTo(cx - 2, cy - 10, cx + 10, cy + 4);
    ctx.stroke();

    return canvas;
  }

  drawWallWoodTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    // Base de Pedra
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(0, 0, size, size);

    // Tijolos de Pedra na base (12px)
    ctx.fillStyle = '#718096';
    ctx.fillRect(2, 34, 20, 12);
    ctx.fillRect(24, 34, 22, 12);

    // Estrutura de Madeira Rústica
    ctx.fillStyle = '#744210';
    ctx.fillRect(0, 0, size, 32);

    // Tábuas de Madeira Verticais
    ctx.fillStyle = '#975a16';
    ctx.fillRect(2, 2, 12, 28);
    ctx.fillRect(18, 2, 12, 28);
    ctx.fillRect(34, 2, 12, 28);

    // Divisões e Sombras
    ctx.fillStyle = '#451a03';
    ctx.fillRect(0, 0, size, 2);
    ctx.fillRect(0, 30, size, 4);
    ctx.fillRect(14, 0, 4, 30);
    ctx.fillRect(30, 0, 4, 30);

    return canvas;
  }

  drawWoodFloorTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    // Assoalho Quente de Madeira
    ctx.fillStyle = '#8c5c36';
    ctx.fillRect(0, 0, size, size);

    // Tábuas Horizontais
    const plankHeight = size / 4; // 12px cada
    for (let i = 0; i < 4; i++) {
      const y = i * plankHeight;
      ctx.fillStyle = i % 2 === 0 ? '#9b683c' : '#7d502c';
      ctx.fillRect(0, y, size, plankHeight - 2);

      // Sombra da tábua
      ctx.fillStyle = '#4a2f16';
      ctx.fillRect(0, y + plankHeight - 2, size, 2);

      // Pregos de ferro
      ctx.fillStyle = '#2d1a0b';
      const offset = (i * 7) % 12;
      ctx.fillRect(4 + offset, y + 4, 2, 2);
      ctx.fillRect(size - 8 + (offset % 4), y + 4, 2, 2);
    }

    return canvas;
  }

  drawHouseDoorTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    // Assoalho de Madeira na entrada
    ctx.fillStyle = '#8c5c36';
    ctx.fillRect(0, 0, size, size);

    // Tapete Vermelho de Boas-Vindas na porta
    ctx.fillStyle = '#9b2c2c';
    ctx.fillRect(6, 12, size - 12, size - 20);
    ctx.fillStyle = '#d69e2e'; // Borda dourada do tapete
    ctx.fillRect(6, 12, size - 12, 2);
    ctx.fillRect(6, size - 10, size - 12, 2);

    // Moldura da Porta de Madeira Aberta nas laterais
    ctx.fillStyle = '#4a3525';
    ctx.fillRect(0, 0, 6, size);
    ctx.fillRect(size - 6, 0, 6, size);
    ctx.fillRect(0, 0, size, 6);

    return canvas;
  }

  drawHouseBedTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    const bg = this.drawWoodFloorTile(size);
    ctx.drawImage(bg, 0, 0);

    // Moldura da Cama de Madeira
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(4, 4, size - 8, size - 8);

    // Colchão Macio com Lençol Vermelho
    ctx.fillStyle = '#9b2c2c';
    ctx.fillRect(6, 12, size - 12, size - 18);

    // Travesseiro Branco
    ctx.fillStyle = '#edf2f7';
    ctx.fillRect(8, 6, size - 16, 8);
    ctx.fillStyle = '#cbd5e0';
    ctx.fillRect(8, 12, size - 16, 2);

    // Dobra do Lençol
    ctx.fillStyle = '#e53e3e';
    ctx.fillRect(6, 14, size - 12, 4);

    return canvas;
  }

  drawHouseTableTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    const bg = this.drawWoodFloorTile(size);
    ctx.drawImage(bg, 0, 0);

    // Tampo da Mesa de Madeira
    ctx.fillStyle = '#744210';
    ctx.fillRect(6, 6, size - 12, size - 12);
    ctx.fillStyle = '#975a16';
    ctx.fillRect(8, 8, size - 16, size - 16);

    // Pernas da Mesa
    ctx.fillStyle = '#451a03';
    ctx.fillRect(6, size - 8, 4, 4);
    ctx.fillRect(size - 10, size - 8, 4, 4);

    // Livro Aberto sobre a Mesa
    ctx.fillStyle = '#3182ce';
    ctx.fillRect(14, 16, 10, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(16, 17, 6, 6);

    // Vela Acesa
    ctx.fillStyle = '#f6e05e';
    ctx.fillRect(28, 14, 4, 8);
    ctx.fillStyle = '#dd6b20';
    ctx.fillRect(29, 10, 2, 4);

    return canvas;
  }

  drawHouseFireplaceTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    // Estrutura de Pedra da Lareira
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#4a5568';
    ctx.fillRect(4, 4, size - 8, size - 8);

    // Cavidade do Fogo
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(8, 14, size - 16, size - 14);

    // Brasas Ardentes e Fogo
    ctx.fillStyle = '#dd6b20';
    ctx.fillRect(12, 22, size - 24, 12);
    ctx.fillStyle = '#f6e05e';
    ctx.fillRect(16, 18, size - 32, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(20, 20, 8, 6);

    return canvas;
  }

  drawHouseChestTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    const bg = this.drawWoodFloorTile(size);
    ctx.drawImage(bg, 0, 0);

    // Corpo do Baú de Madeira
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(6, 10, size - 12, size - 16);
    ctx.fillStyle = '#8c5c36';
    ctx.fillRect(8, 12, size - 16, size - 20);

    // Fivelas de Bronze/Ferro
    ctx.fillStyle = '#d69e2e';
    ctx.fillRect(6, 18, size - 12, 3);
    ctx.fillRect(8, 10, 3, size - 16);
    ctx.fillRect(size - 11, 10, 3, size - 16);
    ctx.fillRect(size / 2 - 2, 17, 4, 5);

    return canvas;
  }

  drawVoidTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);
    return canvas;
  }

  // Chão de Caverna Terroso (Tibia Style - Terra/Argila marrom com pedregulhos)
  drawCaveFloorTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#4e342e';
    for (let i = 0; i < 30; i++) {
      const px = (i * 13) % size;
      const py = (i * 19) % size;
      ctx.fillRect(px, py, 2, 2);
    }

    ctx.fillStyle = '#795548';
    const gravel = [[6, 8], [24, 14], [16, 28], [32, 20], [10, 36]];
    gravel.forEach(([gx, gy]) => {
      ctx.fillRect(gx, gy, 3, 3);
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(gx + 1, gy + 1, 1, 1);
    });

    return canvas;
  }

  // Parede de Caverna Terrosa de Rocha/Argila Escura (Tibia Style)
  drawCaveWallTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    ctx.fillStyle = '#26140e';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#3e2723';
    ctx.fillRect(3, 3, size - 6, size - 6);

    ctx.fillStyle = '#4e342e';
    ctx.fillRect(5, 5, size - 10, 14);
    ctx.fillRect(8, 22, size - 14, 16);

    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(5, 5, size - 10, 3);

    return canvas;
  }

  // Buraco / Entrada de Caverna Terrosa
  drawCaveHoleTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#1a0c08';
    ctx.beginPath();
    ctx.ellipse(size / 2, size / 2, 18, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#8d5b4c';
    ctx.fillRect(size / 2 - 8, size / 2 - 8, 16, 3);
    ctx.fillRect(size / 2 - 8, size / 2 - 2, 16, 3);
    ctx.fillRect(size / 2 - 8, size / 2 + 4, 16, 3);

    return canvas;
  }

  // Escada de Pedra/Terra da Caverna
  drawCaveStairsTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#3e2723';
      ctx.fillRect(4, 4 + i * 10, size - 8, 8);
      ctx.fillStyle = '#6d4c41';
      ctx.fillRect(4, 4 + i * 10, size - 8, 2);
      ctx.fillStyle = '#26140e';
      ctx.fillRect(4, 10 + i * 10, size - 8, 2);
    }
    return canvas;
  }

  // Chão de Magma / Rocha Vulcânica (Sub-nível 2)
  drawMagmaFloorTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    ctx.fillStyle = '#1a0c0c';
    ctx.fillRect(0, 0, size, size);
    // Veios de Lava Incandescente
    ctx.fillStyle = '#c53030';
    ctx.fillRect(4, 10, 28, 4);
    ctx.fillRect(20, 14, 4, 20);
    ctx.fillStyle = '#dd6b20';
    ctx.fillRect(6, 11, 20, 2);
    ctx.fillStyle = '#f6e05e';
    ctx.fillRect(8, 11, 10, 1);
    return canvas;
  }

  // Parede de Obsidiana (Sub-nível 2)
  drawObsidianWallTile(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(4, 4, size - 8, size - 8);
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(6, 6, size - 12, 4);
    ctx.fillRect(6, size - 10, size - 12, 4);
    return canvas;
  }

  // Sprite Pixel-Art do Monstro ROTWORM (Larva Subterrânea Gigante Tibia Style)
  drawRotwormSprite(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    const cx = size / 2;
    const cy = size / 2 + 4;

    // Sombra no chão
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Corpo segmentado de anéis do Rotworm (Vermelho-amarronzado)
    const segments = [
      { x: cx - 12, y: cy + 4, r: 7, c: '#742a2a' },
      { x: cx - 6, y: cy + 2, r: 9, c: '#9b2c2c' },
      { x: cx, y: cy, r: 10, c: '#c53030' },
      { x: cx + 6, y: cy - 2, r: 9, c: '#9b2c2c' },
      { x: cx + 12, y: cy - 4, r: 7, c: '#742a2a' }
    ];

    segments.forEach(s => {
      ctx.fillStyle = s.c;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Mandíbulas e Boca de Rotworm
    ctx.fillStyle = '#feb2b2';
    ctx.beginPath();
    ctx.arc(cx + 12, cy - 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx + 14, cy - 6, 2, 2);
    ctx.fillRect(cx + 14, cy - 2, 2, 2);

    return canvas;
  }

  // Sprite Pixel-Art do BOSS: Guardião de Magma / Demônio Abissal
  drawDemonBossSprite(size) {
    const { canvas, ctx } = this.createCanvas(size, size);
    const cx = size / 2;
    const cy = size / 2;

    // Sombra do Boss
    ctx.fillStyle = 'rgba(229, 62, 62, 0.4)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 14, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Corpo Imponente Vulcânico
    ctx.fillStyle = '#742a2a';
    ctx.fillRect(cx - 14, cy - 10, 28, 26);
    ctx.fillStyle = '#9b2c2c';
    ctx.fillRect(cx - 10, cy - 6, 20, 20);

    // Chifres de Obsidiana
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(cx - 16, cy - 18, 6, 12);
    ctx.fillRect(cx + 10, cy - 18, 6, 12);
    ctx.fillRect(cx - 18, cy - 22, 4, 6);
    ctx.fillRect(cx + 14, cy - 22, 4, 6);

    // Núcleo e Olhos de Magma Incandescente
    ctx.fillStyle = '#dd6b20';
    ctx.fillRect(cx - 6, cy + 2, 12, 10);
    ctx.fillStyle = '#f6e05e';
    ctx.fillRect(cx - 8, cy - 8, 4, 4); // Olho esquerdo
    ctx.fillRect(cx + 4, cy - 8, 4, 4);  // Olho direito

    return canvas;
  }

  get(key) {
    if (!this.initialized) {
      this.init();
    }
    return this.cache[key] || this.cache['grass_0'];
  }
}

export const spriteGen = new SpriteGenerator();
