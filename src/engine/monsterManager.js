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
    this.isAggro = false;

    this.lastAiTime = 0;
    this.lastAttackTime = 0;
  }

  takeDamage(amount) {
    if (this.isDead) return false;

    this.hp = Math.max(0, this.hp - amount);

    if (this.hp <= 0) {
      this.isDead = true;
      this.isAggro = false;
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
    this.isAggro = false;
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

  async loadFromDatabase(network, mapId = 'map-1') {
    if (!network) return;
    const dbMonsters = await network.loadMonstersFromDatabase(mapId);
    const now = Date.now();

    dbMonsters.forEach(row => {
      const monster = this.monsters.get(row.id);
      if (monster && row.is_dead) {
        const respawnTime = row.respawn_time ? new Date(row.respawn_time).getTime() : 0;
        if (now < respawnTime) {
          monster.isDead = true;
          monster.hp = 0;
          const remainingMs = respawnTime - now;
          setTimeout(() => {
            monster.respawn();
            if (network) {
              network.saveMonsterStateToDatabase(monster.id, false, 0, mapId);
            }
          }, remainingMs);
        } else {
          monster.respawn();
          network.saveMonsterStateToDatabase(monster.id, false, 0, mapId);
        }
      }
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

      const distToPlayer = Math.max(Math.abs(rat.gridX - localPlayer.gridX), Math.abs(rat.gridY - localPlayer.gridY));
      const distFromSpawn = Math.max(Math.abs(rat.gridX - rat.spawnX), Math.abs(rat.gridY - rat.spawnY));

      // 1. Ataque se o jogador estiver em quadro adjacente (distância = 1)
      if (distToPlayer === 1 && now - rat.lastAttackTime > 1600) {
        const dmg = Math.floor(Math.random() * 5) + 3;
        rat.lastAttackTime = now;

        if (onPlayerTakeDamage) {
          onPlayerTakeDamage(dmg);
        }
        this.addFloatingText(`-${dmg}`, localPlayer.gridX, localPlayer.gridY, '#f56565');
      } 
      // 2. IA de Perseguição e Movimentação (distância > 1)
      else if (distToPlayer > 1) {
        // Entra/Mantém perseguição se o jogador estiver a <= 5 quadros E o monstro a < 6 quadros do seu spawn (Limite de Leash)
        const canAggro = (distToPlayer <= 5 && distFromSpawn < 6);

        if (canAggro) {
          if (!rat.isAggro) {
            rat.isAggro = true;
            this.addFloatingText('❗ Agressivo', rat.gridX, rat.gridY, '#e53e3e');
          }

          // Movimento de Perseguição acelerado (1300ms)
          if (now - rat.lastAiTime > 1300) {
            rat.lastAiTime = now;

            const stepX = Math.sign(localPlayer.gridX - rat.gridX);
            const stepY = Math.sign(localPlayer.gridY - rat.gridY);

            // Testar direções de avanço em direção ao jogador
            const candidates = [];
            if (stepX !== 0 && stepY !== 0) {
              candidates.push({ x: rat.gridX + stepX, y: rat.gridY + stepY });
            }
            if (stepX !== 0) candidates.push({ x: rat.gridX + stepX, y: rat.gridY });
            if (stepY !== 0) candidates.push({ x: rat.gridX, y: rat.gridY + stepY });

            for (const cand of candidates) {
              const isOccupied = typeof isTileOccupiedFn === 'function' 
                ? isTileOccupiedFn(cand.x, cand.y, rat.id) 
                : !this.gameMap.isWalkable(cand.x, cand.y);

              if (!isOccupied) {
                rat.gridX = cand.x;
                rat.gridY = cand.y;
                break;
              }
            }
          }
        } 
        else {
          // Perdeu o agró ou ultrapassou o limite de distância do spawn
          if (rat.isAggro) {
            rat.isAggro = false;
          }

          // Movimentação passeio perto do spawn (a cada 3500ms)
          if (now - rat.lastAiTime > 3500) {
            rat.lastAiTime = now;
            const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            const [dx, dy] = dirs[Math.floor(Math.random() * dirs.length)];
            const nextX = rat.spawnX + dx;
            const nextY = rat.spawnY + dy;

            const isOccupied = typeof isTileOccupiedFn === 'function' 
              ? isTileOccupiedFn(nextX, nextY, rat.id) 
              : !this.gameMap.isWalkable(nextX, nextY);

            if (!isOccupied) {
              rat.gridX = nextX;
              rat.gridY = nextY;
            }
          }
        }
      }
    });
  }
}
