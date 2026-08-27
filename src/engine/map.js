// Gerenciador do Mapa 32x32 Grid (Suporte Multi-Mapa)
import { CONFIG } from '../config.js';

export class GameMap {
  constructor(mapId = 'map-1') {
    this.mapId = mapId;
    this.width = CONFIG.GRID_WIDTH;
    this.height = CONFIG.GRID_HEIGHT;
    this.grid = [];
    
    if (mapId === 'map-2') {
      this.name = 'Floresta do Sul';
      this.generateForestMap();
    } else if (mapId === 'map-cave-1') {
      this.name = 'Caverna dos Rotworms (Sub-1)';
      this.width = 24;
      this.height = 24;
      this.generateCaveSublevel1();
    } else if (mapId === 'map-cave-2') {
      this.name = 'Abismo Vulcânico (Sub-2)';
      this.width = 24;
      this.height = 24;
      this.generateCaveSublevel2();
    } else if (mapId === 'map-house-1') {
      this.name = 'Interior da Casinha';
      this.width = 12;
      this.height = 12;
      this.generateHouseInteriorMap();
    } else {
      this.mapId = 'map-1';
      this.name = 'Vila Principal';
      this.generateTownMap();
    }

    this.loadCustomMapOverrides();
  }

  loadCustomMapOverrides() {
    this.customTeleports = {};
    try {
      const saved = localStorage.getItem('mmorpg_custom_maps');
      if (!saved) return;
      const dict = JSON.parse(saved);
      const customData = dict[this.mapId];
      if (customData) {
        if (customData.grid && customData.grid.length > 0) {
          this.grid = customData.grid;
          this.height = customData.grid.length;
          this.width = customData.grid[0].length;
        }
        if (customData.teleports) {
          this.customTeleports = customData.teleports;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar mapa customizado do localStorage:', e);
    }
  }

  generateTownMap() {
    const { TILE_TYPES } = CONFIG;
    this.grid = Array(this.height).fill(null).map(() => Array(this.width).fill(null));

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const variant = (x * 7 + y * 13) % 3;
        let type = TILE_TYPES.GRASS;
        let isSolid = false;
        let spriteKey = `grass_${variant}`;
        let canopyKey = 'tree_canopy';

        // 1. Portão Sul e Pilares (Grid X:14..17, Y:31)
        if ((x === 15 || x === 16) && y === this.height - 1) {
          type = TILE_TYPES.COBBLE;
          isSolid = false;
          spriteKey = 'cobble';
        }
        else if ((x === 14 || x === 17) && y === this.height - 1) {
          type = TILE_TYPES.GATE;
          isSolid = true;
          spriteKey = 'gate_pillar';
        }
        // 2. Estrada de Paralelepípedo para o Portão Sul (X: 15..16, Y: 20..30)
        else if ((x === 15 || x === 16) && y >= 20 && y < this.height - 1) {
          type = TILE_TYPES.COBBLE;
          spriteKey = 'cobble';
        }
        // 3. Bordas do Mapa: Paredes de Árvores Densas
        else if (x === 0 || y === 0 || x === this.width - 1 || y === this.height - 1) {
          type = TILE_TYPES.TREE;
          isSolid = true;
          spriteKey = 'tree_trunk';
        } 
        // 4. Praça Central (Grid 12..19 em X e Y)
        else if (x >= 12 && x <= 19 && y >= 12 && y <= 19) {
          type = TILE_TYPES.COBBLE;
          spriteKey = 'cobble';
          
          if (x === 16 && y === 16) {
            type = TILE_TYPES.PORTAL;
            spriteKey = 'portal';
          }
        } 
        // 4.5. Casinha Medieval da Vila (Grid X: 22..26, Y: 4..8)
        else if (x >= 22 && x <= 26 && y >= 4 && y <= 8) {
          // Porta da Casa (Entrada Aberta)
          if (x === 24 && y === 8) {
            type = TILE_TYPES.HOUSE_DOOR;
            isSolid = false;
            spriteKey = 'house_door';
          }
          // Paredes e Estrutura Externa da Casa (Construção Sólida por fora)
          else {
            type = TILE_TYPES.WALL_WOOD;
            isSolid = true;
            spriteKey = 'wall_wood';
          }
        }
        // 5. Lago de Água (Grid 5..8 em X, 5..9 em Y)
        else if (x >= 5 && x <= 8 && y >= 5 && y <= 9) {
          type = TILE_TYPES.WATER;
          isSolid = true;
          spriteKey = 'water_0';
        }
        // 6. Árvores, Arbustos e Gramas no Mapa
        else if (
          (x === 4 && y === 14) || (x === 4 && y === 15) || (x === 5 && y === 15) ||
          (x === 22 && y === 24) || (x === 23 && y === 24) || (x === 24 && y === 25)
        ) {
          type = TILE_TYPES.TREE;
          isSolid = true;
          spriteKey = 'tree_pine_trunk';
          canopyKey = 'tree_pine_canopy';
        }
        else if ((x === 25 && y === 8) || (x === 26 && y === 8) || (x === 25 && y === 9)) {
          type = TILE_TYPES.TREE;
          isSolid = true;
          spriteKey = 'tree_trunk';
          canopyKey = 'tree_canopy';
        }
        else if ((x === 10 && y === 26) || (x === 11 && y === 26)) {
          type = TILE_TYPES.TREE;
          isSolid = true;
          spriteKey = 'tree_pine_trunk';
          canopyKey = 'tree_pine_canopy';
        }
        else if ((x === 8 && y === 18) || (x === 24 && y === 18) || (x === 18 && y === 6)) {
          type = TILE_TYPES.ROCK;
          isSolid = true;
          spriteKey = 'rock';
        }
        // Arbustos Maiores e Gramas Altas em Alto Relevo (TOTALMENTE PASSÁVEIS - isSolid = false)
        else if (
          (x === 7 && y === 18) || (x === 8 && y === 19) ||
          (x === 20 && y === 8) || (x === 21 && y === 8) ||
          (x === 10 && y === 24) || (x === 11 && y === 24)
        ) {
          type = TILE_TYPES.BUSH;
          isSolid = false;
          spriteKey = 'bush_large';
        }
        else if ((x % 4 === 0 && y % 5 === 0 && x > 2 && y > 2)) {
          type = TILE_TYPES.BUSH;
          isSolid = false;
          spriteKey = 'tall_grass';
        }
        else if (x % 6 === 0 && y % 7 === 0) {
          type = TILE_TYPES.FLOWERS;
          spriteKey = 'flowers_blue';
        }
        else if (x % 5 === 0 && y % 8 === 0) {
          type = TILE_TYPES.FLOWERS;
          spriteKey = 'flowers_red';
        }
        else if (x % 7 === 0 && y % 5 === 0) {
          type = TILE_TYPES.FLOWERS;
          spriteKey = 'flowers_purple';
        }
        else if ((x + y) % 9 === 0) {
          spriteKey = 'grass_moss';
        }

        this.grid[y][x] = { x, y, type, isSolid, spriteKey, canopyKey };
      }
    }
  }

  // Gera o layout do Mapa 2: Floresta do Sul (32x32)
  generateForestMap() {
    const { TILE_TYPES } = CONFIG;
    this.grid = Array(this.height).fill(null).map(() => Array(this.width).fill(null));

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const variant = (x * 11 + y * 17) % 3;
        let type = TILE_TYPES.GRASS;
        let isSolid = false;
        let spriteKey = (x + y) % 2 === 0 ? 'grass_dark' : `grass_${variant}`;
        let canopyKey = 'tree_canopy';

        // 1. Portão Norte de Entrada/Saída para a Vila (Grid X:14..17, Y:0)
        if ((x === 15 || x === 16) && y === 0) {
          type = TILE_TYPES.DIRT;
          isSolid = false;
          spriteKey = 'dirt';
        }
        else if ((x === 14 || x === 17) && y === 0) {
          type = TILE_TYPES.GATE;
          isSolid = true;
          spriteKey = 'gate_pillar';
        }
        // 2. Trilhas de Terra na Floresta (Trilha Norte-Sul e Leste-Oeste)
        else if ((x === 15 || x === 16) && y >= 1 && y <= 30) {
          type = TILE_TYPES.DIRT;
          spriteKey = 'dirt';
        }
        else if (y === 15 && x >= 5 && x <= 26) {
          type = TILE_TYPES.DIRT;
          spriteKey = 'dirt';
        }
        // 3. Bordas da Floresta: Parede de Árvores Densas
        else if (x === 0 || y === 0 || x === this.width - 1 || y === this.height - 1) {
          type = TILE_TYPES.TREE;
          isSolid = true;
          spriteKey = 'tree_pine_trunk';
          canopyKey = 'tree_pine_canopy';
        }
        // 3.5. Entrada / Buraco da Caverna dos Rotworms (Grid X: 10, Y: 10)
        else if (x === 10 && y === 10) {
          type = TILE_TYPES.CAVE_HOLE;
          isSolid = false;
          spriteKey = 'cave_hole';
        }
        // 4. Aglomerados de Árvores Selvagens na Floresta
        else if (x >= 3 && x <= 7 && y >= 3 && y <= 6) {
          type = TILE_TYPES.TREE;
          isSolid = true;
          spriteKey = 'tree_pine_trunk';
          canopyKey = 'tree_pine_canopy';
        }
        else if (x >= 23 && x <= 28 && y >= 3 && y <= 8) {
          type = TILE_TYPES.TREE;
          isSolid = true;
          spriteKey = 'tree_trunk';
          canopyKey = 'tree_canopy';
        }
        else if (x >= 3 && x <= 9 && y >= 20 && y <= 25) {
          type = TILE_TYPES.TREE;
          isSolid = true;
          spriteKey = 'tree_pine_trunk';
          canopyKey = 'tree_pine_canopy';
        }
        else if (x >= 22 && x <= 28 && y >= 20 && y <= 26) {
          type = TILE_TYPES.TREE;
          isSolid = true;
          spriteKey = 'tree_trunk';
          canopyKey = 'tree_canopy';
        }
        else if (
          (x === 10 && y === 10) || (x === 11 && y === 10) || (x === 20 && y === 10) ||
          (x === 10 && y === 20) || (x === 21 && y === 18)
        ) {
          type = TILE_TYPES.TREE;
          isSolid = true;
          spriteKey = 'tree_pine_trunk';
          canopyKey = 'tree_pine_canopy';
        }
        // 5. Rochas Místicas Espalhadas
        else if (
          (x === 12 && y === 6) || (x === 20 && y === 6) ||
          (x === 8 && y === 16) || (x === 23 && y === 16) ||
          (x === 14 && y === 24) || (x === 18 && y === 24)
        ) {
          type = TILE_TYPES.ROCK;
          isSolid = true;
          spriteKey = 'rock';
        }
        // 6. Clareiras com Arbustos Grandes e Grama Alta em Alto Relevo (PASSÁVEIS)
        else if (x % 4 === 0 && y % 5 === 0) {
          type = TILE_TYPES.BUSH;
          isSolid = false;
          spriteKey = 'bush_large';
        }
        else if (x % 3 === 0 && y % 4 === 0) {
          type = TILE_TYPES.BUSH;
          isSolid = false;
          spriteKey = 'tall_grass';
        }

        this.grid[y][x] = { x, y, type, isSolid, spriteKey };
      }
    }
  }

  // Gera o layout do Mapa: Interior da Casinha (12x12)
  generateHouseInteriorMap() {
    const { TILE_TYPES } = CONFIG;
    this.grid = Array(this.height).fill(null).map(() => Array(this.width).fill(null));

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let type = TILE_TYPES.WOOD_FLOOR;
        let isSolid = false;
        let spriteKey = 'wood_floor';

        // 1. Porta de Saída da Casa (Grid X: 6, Y: 10)
        if (x === 6 && y === 10) {
          type = TILE_TYPES.HOUSE_DOOR;
          isSolid = false;
          spriteKey = 'house_door';
        }
        // 2. Paredes de Madeira da Casa (Borda do Cômodo)
        else if (y === 1 || x === 1 || x === 10 || y === 10) {
          type = TILE_TYPES.WALL_WOOD;
          isSolid = true;
          spriteKey = 'wall_wood';
        }
        // 3. Fundo Preto (Vazio / Void) em Volta da Casa
        else if (x === 0 || y === 0 || x === 11 || y === 11) {
          type = TILE_TYPES.TREE;
          isSolid = true;
          spriteKey = 'void';
        }
        // 4. Móveis no Interior da Casa
        else if (x === 6 && y === 2) {
          type = TILE_TYPES.HOUSE_FIREPLACE;
          isSolid = true;
          spriteKey = 'house_fireplace';
        }
        else if (x === 3 && y === 3) {
          type = TILE_TYPES.HOUSE_BED;
          isSolid = true;
          spriteKey = 'house_bed';
        }
        else if (x === 8 && y === 3) {
          type = TILE_TYPES.HOUSE_TABLE;
          isSolid = true;
          spriteKey = 'house_table';
        }
        else if (x === 9 && y === 3) {
          type = TILE_TYPES.HOUSE_CHEST;
          isSolid = true;
          spriteKey = 'house_chest';
        }

        this.grid[y][x] = { x, y, type, isSolid, spriteKey };
      }
    }
  }

  // Layout da Caverna dos Rotworms (Sub-nível 1 - Labirinto de Túneis Terrosos 24x24)
  generateCaveSublevel1() {
    const { TILE_TYPES } = CONFIG;
    this.grid = Array(this.height).fill(null).map(() => Array(this.width).fill(null));

    // Matriz 24x24: 1 = Parede Terrosa de Caverna, 0 = Túnel Terroso Passável
    const caveMatrix = [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,0,0,0,0,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1],
      [1,1,1,1,0,0,0,0,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1],
      [1,1,1,1,0,0,1,1,1,1,1,0,0,1,1,1,1,0,0,1,1,1,1,1],
      [1,1,1,1,0,0,1,1,0,0,0,0,0,1,1,1,1,0,0,1,1,1,1,1],
      [1,1,1,1,0,0,1,1,0,0,0,0,0,1,1,1,1,0,0,1,1,1,1,1],
      [1,1,1,1,0,0,0,0,0,1,1,0,0,0,0,0,1,0,0,1,1,1,1,1],
      [1,1,1,1,1,1,1,0,0,1,1,0,0,0,0,0,1,0,0,1,1,1,1,1],
      [1,1,1,0,0,0,1,0,0,1,1,0,0,0,0,0,1,0,0,0,0,1,1,1],
      [1,1,1,0,0,0,1,0,0,0,0,0,0,0,0,0,1,1,1,0,0,1,1,1],
      [1,1,1,0,0,0,1,1,1,1,1,0,0,1,1,1,1,1,1,0,0,1,1,1],
      [1,1,1,1,0,0,0,0,0,0,1,0,0,1,1,0,0,0,0,0,0,1,1,1],
      [1,1,1,1,1,1,1,0,0,0,1,0,0,1,1,0,0,0,0,0,0,1,1,1],
      [1,1,1,1,1,1,1,0,0,0,1,0,0,1,1,1,1,1,0,0,1,1,1,1],
      [1,1,1,1,0,0,0,0,1,1,1,0,0,0,0,0,1,1,0,0,1,1,1,1],
      [1,1,1,1,0,0,0,0,1,1,1,0,0,0,0,0,1,1,0,0,1,1,1,1],
      [1,1,1,1,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,1,1,1,1],
      [1,1,1,1,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let isWall = caveMatrix[y][x] === 1;
        let type = isWall ? TILE_TYPES.CAVE_WALL : TILE_TYPES.CAVE_FLOOR;
        let isSolid = isWall;
        let spriteKey = isWall ? 'cave_wall' : 'cave_floor';

        // Escada para voltar ao Mapa 2 (Grid X: 4, Y: 4)
        if (x === 4 && y === 4) {
          type = TILE_TYPES.CAVE_STAIRS;
          isSolid = false;
          spriteKey = 'cave_stairs';
        }
        // Buraco/Alçapão para descer ao Sub-nível 2 (Grid X: 18, Y: 18)
        else if (x === 18 && y === 18) {
          type = TILE_TYPES.CAVE_HOLE;
          isSolid = false;
          spriteKey = 'cave_hole';
        }

        this.grid[y][x] = { x, y, type, isSolid, spriteKey };
      }
    }
  }

  // Layout do Abismo Vulcânico (Sub-nível 2 - Túneis de Magma & Ninho do Boss 24x24)
  generateCaveSublevel2() {
    const { TILE_TYPES } = CONFIG;
    this.grid = Array(this.height).fill(null).map(() => Array(this.width).fill(null));

    // Matriz 24x24: 1 = Parede de Obsidiana, 0 = Túnel de Magma
    const caveMatrix = [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,0,0,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1,1,1,1],
      [1,1,1,1,0,0,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1,1,1,1],
      [1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let isWall = caveMatrix[y][x] === 1;
        let type = isWall ? TILE_TYPES.OBSIDIAN_WALL : TILE_TYPES.MAGMA_FLOOR;
        let isSolid = isWall;
        let spriteKey = isWall ? 'obsidian_wall' : 'magma_floor';

        // Escada de Pedra para subir ao Sub-nível 1 (Grid X: 4, Y: 4)
        if (x === 4 && y === 4) {
          type = TILE_TYPES.CAVE_STAIRS;
          isSolid = false;
          spriteKey = 'cave_stairs';
        }

        this.grid[y][x] = { x, y, type, isSolid, spriteKey };
      }
    }
  }

  // Retorna informações de transição de mapa se o tile for uma passagem
  getTransition(x, y) {
    const tile = this.getTile(x, y);
    if (!tile) return null;

    // 1. Checar se há um teleporte customizado configurado no MapEditor para esta coordenada
    const posKey = `${x},${y}`;
    if (this.customTeleports && this.customTeleports[posKey]) {
      const cTp = this.customTeleports[posKey];
      return {
        targetMapId: cTp.targetMapId,
        targetX: Number(cTp.targetX),
        targetY: Number(cTp.targetY)
      };
    }

    const { TILE_TYPES } = CONFIG;

    if (this.mapId === 'map-1') {
      // Portão Sul de saída para a Floresta do Sul
      if ((x === 15 || x === 16) && y === this.height - 1) {
        return { targetMapId: 'map-2', targetX: 15, targetY: 1 };
      }
      // Entrada da Casinha da Vila (valida se o tile atual é uma Porta)
      if (tile.type === TILE_TYPES.HOUSE_DOOR) {
        return { targetMapId: 'map-house-1', targetX: 6, targetY: 9 };
      }
    } else if (this.mapId === 'map-2') {
      // Portão Norte de saída para a Vila Principal
      if ((x === 15 || x === 16) && y === 0) {
        return { targetMapId: 'map-1', targetX: 15, targetY: 30 };
      }
      // Entrada da Caverna dos Rotworms (valida se o tile atual é um Buraco de Caverna)
      if (tile.type === TILE_TYPES.CAVE_HOLE) {
        return { targetMapId: 'map-cave-1', targetX: 4, targetY: 4 };
      }
    } else if (this.mapId === 'map-cave-1') {
      // Escada para subir de volta à Floresta do Sul
      if (tile.type === TILE_TYPES.CAVE_STAIRS) {
        return { targetMapId: 'map-2', targetX: 10, targetY: 11 };
      }
      // Buraco para descer ao Abismo Vulcânico (Sub-nível 2)
      if (tile.type === TILE_TYPES.CAVE_HOLE) {
        return { targetMapId: 'map-cave-2', targetX: 4, targetY: 4 };
      }
    } else if (this.mapId === 'map-cave-2') {
      // Escada para subir de volta ao Sub-nível 1
      if (tile.type === TILE_TYPES.CAVE_STAIRS) {
        return { targetMapId: 'map-cave-1', targetX: 18, targetY: 17 };
      }
    } else if (this.mapId === 'map-house-1') {
      // Porta de Saída da Casinha
      if (tile.type === TILE_TYPES.HOUSE_DOOR) {
        return { targetMapId: 'map-1', targetX: 24, targetY: 9 };
      }
    }
    return null;
  }

  isWalkable(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }
    return !this.grid[y][x].isSolid;
  }

  getTile(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    return this.grid[y][x];
  }
}
