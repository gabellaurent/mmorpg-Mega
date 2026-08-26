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
  }

  // Gera o layout do Mapa 1: Vila Principal (32x32)
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

  // Retorna informações de transição de mapa se o tile for uma passagem
  getTransition(x, y) {
    if (this.mapId === 'map-1') {
      if ((x === 15 || x === 16) && y === 31) {
        return { targetMapId: 'map-2', targetX: 15, targetY: 1 };
      }
      if (x === 24 && y === 8) {
        return { targetMapId: 'map-house-1', targetX: 6, targetY: 9 };
      }
    } else if (this.mapId === 'map-2') {
      if ((x === 15 || x === 16) && y === 0) {
        return { targetMapId: 'map-1', targetX: 15, targetY: 30 };
      }
    } else if (this.mapId === 'map-house-1') {
      if (x === 6 && y === 10) {
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
