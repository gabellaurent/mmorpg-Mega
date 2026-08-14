// Gerenciador de Monstros (Rats) e Sistema de IA / Combat
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
      return true; // Morreu!
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

    // Suavizar interpolação de renderização
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
    this.floatingTexts = []; // Array de textos flutuantes de dano
    this.initMonsters();
  }

  // Cria os 4 Rats nos 4 cantos do mapa
  initMonsters() {
    const corners = [
      { id: 'rat_nw', name: 'Cave Rat', x: 4, y: 4 },
      { id: 'rat_ne', name: 'Cave Rat', x: 27, y: 4 },
      { id: 'rat_sw', name: 'Cave Rat', x: 4, y: 27 },
      { id: 'rat_se', name: 'Cave Rat', x: 27, y: 27 }
    ];

    corners.forEach(c => {
      this.monsters.set(c.id, new Monster(c.id, c.name, c.x, c.y));
    });
  }

  // Adiciona um texto flutuante de dano ou cura na tela (ex: -12 ou +25 XP)
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

  // Atualiza a posição dos textos flutuantes
  updateFloatingTexts(now) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 0.6; // Flutuar para cima
      ft.opacity -= 0.02; // Desvanecer

      if (ft.opacity <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  // Atualiza a IA e respawn dos monstros a cada frame
  update(now, localPlayer, onPlayerTakeDamage) {
    this.updateFloatingTexts(now);

    this.monsters.forEach(rat => {
      rat.update(now);

      if (rat.isDead) return;

      // IA de Combate do Rat contra o Jogador Local se estiver adjacente (1 tile)
      const dist = Math.max(Math.abs(rat.gridX - localPlayer.gridX), Math.abs(rat.gridY - localPlayer.gridY));
      
      if (dist === 1 && now - rat.lastAttackTime > 1600) {
        // Ataque do Rat! Caia dano ao jogador
        const dmg = Math.floor(Math.random() * 5) + 3; // 3 a 7 de dano
        rat.lastAttackTime = now;

        onPlayerTakeDamage(dmg);
        this.addFloatingText(`-${dmg}`, localPlayer.gridX, localPlayer.gridY, '#f56565');
      } 
      // Movimentação aleatória no ninho a cada 3.5 segundos se não estiver em combate
      else if (dist > 1 && now - rat.lastAiTime > 3500) {
        rat.lastAiTime = now;
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        const [dx, dy] = dirs[Math.floor(Math.random() * dirs.length)];
        const nextX = rat.spawnX + dx;
        const nextY = rat.spawnY + dy;

        if (this.gameMap.isWalkable(nextX, nextY)) {
          rat.gridX = nextX;
          rat.gridY = nextY;
        }
      }
    });
  }
}
