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
    this.targetPlayerId = null;

    this.lastAiTime = 0;
    this.lastAttackTime = 0;
  }

  takeDamage(amount) {
    if (this.isDead) return false;

    this.hp = Math.max(0, this.hp - amount);

    if (this.hp <= 0) {
      this.isDead = true;
      this.isAggro = false;
      this.targetPlayerId = null;
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
    this.targetPlayerId = null;
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

  handleRemoteMonsterMove({ ratId, gridX, gridY, targetPlayerId }) {
    const rat = this.monsters.get(ratId);
    if (rat && !rat.isDead) {
      rat.gridX = gridX;
      rat.gridY = gridY;
      rat.targetPlayerId = targetPlayerId;
      if (targetPlayerId) {
        if (!rat.isAggro) {
          rat.isAggro = true;
          this.addFloatingText('❗ Agressivo', rat.gridX, rat.gridY, '#e53e3e');
        }
      } else {
        rat.isAggro = false;
      }
    }
  }

  update(now, localPlayer, remotePlayersMap, isTileOccupiedFn, onPlayerTakeDamage, network) {
    this.updateFloatingTexts(now);

    // Lista unificada de jogadores no mapa para seleção determinística de alvo
    const allPlayers = [localPlayer];
    if (remotePlayersMap) {
      remotePlayersMap.forEach(p => {
        if (p && !p.isDead) allPlayers.push(p);
      });
    }

    this.monsters.forEach(rat => {
      rat.update(now);

      if (rat.isDead) return;

      // 1. Validar ou Selecionar o Alvo Único do Monstro
      let currentTarget = null;

      if (rat.targetPlayerId) {
        currentTarget = allPlayers.find(p => p.id === rat.targetPlayerId);
        if (currentTarget) {
          const dist = Math.max(Math.abs(rat.gridX - currentTarget.gridX), Math.abs(rat.gridY - currentTarget.gridY));
          const distFromSpawn = Math.max(Math.abs(rat.gridX - rat.spawnX), Math.abs(rat.gridY - rat.spawnY));
          if (dist > 5 || distFromSpawn >= 6) {
            currentTarget = null;
            rat.targetPlayerId = null;
            rat.isAggro = false;
          }
        }
      }

      // Se o monstro não tem alvo ativo, encontra o jogador mais próximo a <= 5 quadros
      if (!currentTarget) {
        let minDist = 999;
        allPlayers.forEach(p => {
          const dist = Math.max(Math.abs(rat.gridX - p.gridX), Math.abs(rat.gridY - p.gridY));
          const distFromSpawn = Math.max(Math.abs(rat.gridX - rat.spawnX), Math.abs(rat.gridY - rat.spawnY));
          if (dist <= 5 && distFromSpawn < 6 && dist < minDist) {
            minDist = dist;
            currentTarget = p;
          }
        });
        if (currentTarget) {
          rat.targetPlayerId = currentTarget.id;
        }
      }

      // 2. Processar Ação de Acordo com o Alvo Selecionado
      if (currentTarget) {
        if (!rat.isAggro) {
          rat.isAggro = true;
          this.addFloatingText('❗ Agressivo', rat.gridX, rat.gridY, '#e53e3e');
        }

        const distToTarget = Math.max(Math.abs(rat.gridX - currentTarget.gridX), Math.abs(rat.gridY - currentTarget.gridY));

        // Ataque: Apenas o jogador que É O ALVO REAL sofre o dano!
        if (distToTarget === 1 && now - rat.lastAttackTime > 1600) {
          rat.lastAttackTime = now;
          if (currentTarget.id === localPlayer.id) {
            const dmg = Math.floor(Math.random() * 5) + 3;
            if (onPlayerTakeDamage) onPlayerTakeDamage(dmg);
            this.addFloatingText(`-${dmg}`, localPlayer.gridX, localPlayer.gridY, '#f56565');
          }
        }
        // Movimentação de Perseguição: O Alvo calcula o movimento e transmite via Realtime Broadcast
        else if (distToTarget > 1 && currentTarget.id === localPlayer.id && now - rat.lastAiTime > 1300) {
          rat.lastAiTime = now;

          const stepX = Math.sign(currentTarget.gridX - rat.gridX);
          const stepY = Math.sign(currentTarget.gridY - rat.gridY);

          const candidates = [];
          if (stepX !== 0 && stepY !== 0) candidates.push({ x: rat.gridX + stepX, y: rat.gridY + stepY });
          if (stepX !== 0) candidates.push({ x: rat.gridX + stepX, y: rat.gridY });
          if (stepY !== 0) candidates.push({ x: rat.gridX, y: rat.gridY + stepY });

          for (const cand of candidates) {
            const isOccupied = typeof isTileOccupiedFn === 'function' 
              ? isTileOccupiedFn(cand.x, cand.y, rat.id) 
              : !this.gameMap.isWalkable(cand.x, cand.y);

            if (!isOccupied) {
              rat.gridX = cand.x;
              rat.gridY = cand.y;
              if (network) {
                network.sendMonsterMove(rat.id, rat.gridX, rat.gridY, rat.targetPlayerId);
              }
              break;
            }
          }
        }
      } else {
        // Sem alvo: passear casualmente perto do spawn
        if (rat.isAggro) {
          rat.isAggro = false;
        }

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
    });
  }
}
