// Gerenciador de Monstros (Rats) e Sistema de IA / Combat (Multi-Mapa)
import { CONFIG } from '../config.js';

export class Monster {
  constructor(id, name, spawnX, spawnY) {
    this.id = id;
    this.name = name;
    this.spawnX = spawnX;
    this.spawnY = spawnY;

    this.gridX = spawnX;
    this.gridY = spawnY;

    this.renderX = spawnX * CONFIG.TILE_SIZE;
    this.renderY = spawnY * CONFIG.TILE_SIZE;

    this.level = 2;
    this.hp = 30;
    this.maxHp = 30;
    this.isDead = false;

    this.lastAiTime = 0;
    this.lastAttackTime = 0;
  }

  takeDamage(amount) {
    if (this.isDead) return false;

    this.hp = Math.max(0, this.hp - amount);

    if (this.hp <= 0) {
      this.isDead = true;
      return true;
    }
    return false;
  }

  respawn() {
    this.gridX = this.spawnX;
    this.gridY = this.spawnY;
    this.renderX = this.spawnX * CONFIG.TILE_SIZE;
    this.renderY = this.spawnY * CONFIG.TILE_SIZE;
    this.hp = this.maxHp;
    this.isDead = false;
  }

  update(now) {
    if (this.isDead) return;

    const targetX = this.gridX * CONFIG.TILE_SIZE;
    const targetY = this.gridY * CONFIG.TILE_SIZE;

    this.renderX += (targetX - this.renderX) * 0.2;
    this.renderY += (targetY - this.renderY) * 0.2;
  }
}

export class MonsterManager {
  constructor(gameMap) {
    this.gameMap = gameMap;
    this.monsters = new Map();
    this.floatingTexts = [];
    this.initMonsters();
  }

  initMonsters() {
    this.monsters.clear();
    const mapId = this.gameMap ? this.gameMap.mapId : 'map-1';

    let spawns = [];
    if (mapId === 'map-2') {
      // 9 Ratos Selvagens Espalhados pela Floresta do Sul
      spawns = [
        { id: 'f_rat_1', name: 'Rato Selvagem', x: 6, y: 8 },
        { id: 'f_rat_2', name: 'Rato Selvagem', x: 25, y: 8 },
        { id: 'f_rat_3', name: 'Rato Selvagem', x: 10, y: 14 },
        { id: 'f_rat_4', name: 'Rato Selvagem', x: 21, y: 14 },
        { id: 'f_rat_5', name: 'Rato da Floresta', x: 8, y: 22 },
        { id: 'f_rat_6', name: 'Rato da Floresta', x: 24, y: 22 },
        { id: 'f_rat_7', name: 'Rato da Floresta', x: 16, y: 26 },
        { id: 'f_rat_8', name: 'Rato da Floresta', x: 14, y: 8 },
        { id: 'f_rat_9', name: 'Rato da Floresta', x: 27, y: 16 }
      ];
    } else {
      // 4 Cave Rats nos cantos do Mapa 1 (Vila)
      spawns = [
        { id: 'rat_nw', name: 'Cave Rat', x: 4, y: 4 },
        { id: 'rat_ne', name: 'Cave Rat', x: 27, y: 4 },
        { id: 'rat_sw', name: 'Cave Rat', x: 4, y: 27 },
        { id: 'rat_se', name: 'Cave Rat', x: 27, y: 27 }
      ];
    }

    spawns.forEach(s => {
      this.monsters.set(s.id, new Monster(s.id, s.name, s.x, s.y));
    });
  }

  addFloatingText(text, gridX, gridY, color = '#f56565') {
    this.floatingTexts.push({
      text,
      x: gridX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
      y: gridY * CONFIG.TILE_SIZE - 6,
      color,
      opacity: 1.0,
      timer: performance.now()
    });
  }

  updateFloatingTexts(now) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 0.6;
      ft.opacity -= 0.02;

      if (ft.opacity <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  update(now, localPlayer, isTileOccupiedFn, onPlayerTakeDamage) {
    this.updateFloatingTexts(now);

    this.monsters.forEach(rat => {
      rat.update(now);

      if (rat.isDead) return;

      const dist = Math.max(Math.abs(rat.gridX - localPlayer.gridX), Math.abs(rat.gridY - localPlayer.gridY));
      
      if (dist === 1 && now - rat.lastAttackTime > 1600) {
        const dmg = Math.floor(Math.random() * 5) + 3;
        rat.lastAttackTime = now;

        if (onPlayerTakeDamage) {
          onPlayerTakeDamage(dmg);
        }
        this.addFloatingText(`-${dmg}`, localPlayer.gridX, localPlayer.gridY, '#f56565');
      } 
      else if (dist > 1 && now - rat.lastAiTime > 3500) {
        rat.lastAiTime = now;
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        const [dx, dy] = dirs[Math.floor(Math.random() * dirs.length)];
        const nextX = rat.spawnX + dx;
        const nextY = rat.spawnY + dy;

        // Validar colisão: monstro não entra em quadros ocupados por jogadores ou outros monstros
        const isOccupied = typeof isTileOccupiedFn === 'function' 
          ? isTileOccupiedFn(nextX, nextY, rat.id) 
          : !this.gameMap.isWalkable(nextX, nextY);

        if (!isOccupied) {
          rat.gridX = nextX;
          rat.gridY = nextY;
        }
      }
    });
  }
}
