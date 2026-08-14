// Gerenciador do Mapa 32x32 Grid
import { CONFIG } from '../config.js';

export class GameMap {
  constructor() {
    this.width = CONFIG.GRID_WIDTH;
    this.height = CONFIG.GRID_HEIGHT;
    this.grid = [];
    this.generateMap();
  }

  // Gera o layout do Mapa 32x32 (Grama, Árvores, Praça de Pedra, Lago e Portal)
  generateMap() {
    const { TILE_TYPES } = CONFIG;
    this.grid = Array(this.height).fill(null).map(() => Array(this.width).fill(null));

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        // Tile Padrão: Grama com variações
        const variant = (x * 7 + y * 13) % 3;
        let type = TILE_TYPES.GRASS;
        let isSolid = false;
        let spriteKey = `grass_${variant}`;

        // 1. Bordas do Mapa: Paredes de Árvores Densas
        if (x === 0 || y === 0 || x === this.width - 1 || y === this.height - 1) {
          type = TILE_TYPES.TREE;
          isSolid = true;
          spriteKey = 'tree_trunk';
        } 
        // 2. Praça Central (Grid 12..20 em X e Y)
        else if (x >= 12 && x <= 19 && y >= 12 && y <= 19) {
          type = TILE_TYPES.COBBLE;
          spriteKey = 'cobble';
          
          // Portal Mágico no Centro Exato (16, 16)
          if (x === 16 && y === 16) {
            type = TILE_TYPES.PORTAL;
            spriteKey = 'portal';
          }
        } 
        // 3. Lago de Água (Grid 5..9 em X, 6..10 em Y)
        else if (x >= 5 && x <= 8 && y >= 5 && y <= 9) {
          type = TILE_TYPES.WATER;
          isSolid = true;
          spriteKey = 'water_0';
        }
        // 4. Árvores e Rochas de Obstáculo no Mapa
        else if (
          (x === 4 && y === 14) || (x === 4 && y === 15) || (x === 5 && y === 15) ||
          (x === 25 && y === 8) || (x === 26 && y === 8) || (x === 25 && y === 9) ||
          (x === 22 && y === 24) || (x === 23 && y === 24) || (x === 24 && y === 25) ||
          (x === 10 && y === 26) || (x === 11 && y === 26)
        ) {
          type = TILE_TYPES.TREE;
          isSolid = true;
          spriteKey = 'tree_trunk';
        }
        // 5. Rochas de Obstáculo
        else if ((x === 8 && y === 18) || (x === 24 && y === 18) || (x === 18 && y === 6)) {
          type = TILE_TYPES.ROCK;
          isSolid = true;
          spriteKey = 'rock';
        }
        // 6. Flores decorativas
        else if ((x % 5 === 0 && y % 7 === 0) || (x % 9 === 0 && y % 4 === 0)) {
          type = TILE_TYPES.FLOWERS;
          spriteKey = 'flowers';
        }

        this.grid[y][x] = {
          x,
          y,
          type,
          isSolid,
          spriteKey
        };
      }
    }
  }

  // Verifica se uma posição (x, y) está dentro do mapa e é passável (sem colisão)
  isWalkable(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }
    return !this.grid[y][x].isSolid;
  }

  // Obtém o tile na coordenada (x, y)
  getTile(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    return this.grid[y][x];
  }
}
