import { CONFIG } from '../config.js';

export class Corpse {
  constructor({ id, ownerName, entityType, gridX, gridY, loot = [], createdAt = Date.now() }) {
    this.id = id || `corpse_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.ownerName = ownerName || 'Desconhecido';
    this.entityType = entityType || 'monster'; // 'monster' | 'player'
    this.gridX = gridX;
    this.gridY = gridY;
    this.loot = loot; // [{ itemId: 'gold', quantity: 5, itemConfig }, ...]
    this.createdAt = createdAt;
    this.stage = 0; // 0 = Fresco (0-2m), 1 = Decomposição (2-4m), 2 = Esqueleto (4-5m)
  }

  getAgeInSeconds(now = Date.now()) {
    return (now - this.createdAt) / 1000;
  }

  updateStage(now = Date.now()) {
    const ageSec = this.getAgeInSeconds(now);
    if (ageSec < 120) {
      this.stage = 0; // Fresco
    } else if (ageSec < 240) {
      this.stage = 1; // Decomposição
    } else if (ageSec < 300) {
      this.stage = 2; // Ossos / Esqueleto
    } else {
      this.stage = 3; // Desapareceu
    }
    return this.stage;
  }
}

export class CorpseManager {
  constructor(gameMap) {
    this.gameMap = gameMap;
    this.corpses = new Map();
  }

  spawnCorpse({ ownerName, entityType, gridX, gridY, loot = [], id = null, createdAt = Date.now() }) {
    const corpse = new Corpse({ id, ownerName, entityType, gridX, gridY, loot, createdAt });
    this.corpses.set(corpse.id, corpse);
    return corpse;
  }

  getCorpseAt(gridX, gridY) {
    for (const corpse of this.corpses.values()) {
      if (corpse.gridX === gridX && corpse.gridY === gridY && corpse.stage < 3) {
        return corpse;
      }
    }
    return null;
  }

  update(now = Date.now()) {
    for (const [id, corpse] of this.corpses.entries()) {
      const stage = corpse.updateStage(now);
      if (stage >= 3) {
        this.corpses.delete(id);
      }
    }
  }

  lootCorpse(corpseId, player) {
    const corpse = this.corpses.get(corpseId);
    if (!corpse) {
      return { success: false, reason: 'Corpo não encontrado.' };
    }
    if (corpse.loot.length === 0) {
      return { success: false, reason: 'O corpo está vazio.' };
    }

    const lootedItems = [];
    for (let i = corpse.loot.length - 1; i >= 0; i--) {
      const item = corpse.loot[i];
      if (item.itemId === 'gold') {
        player.gold = (player.gold || 0) + item.quantity;
        lootedItems.push(item);
        corpse.loot.splice(i, 1);
      } else {
        const added = player.addItem(item.itemId, item.quantity);
        if (added) {
          lootedItems.push(item);
          corpse.loot.splice(i, 1);
        }
      }
    }

    if (lootedItems.length === 0) {
      return { success: false, reason: 'Sua bolsa está cheia!' };
    }

    return { success: true, lootedItems, remaining: corpse.loot.length };
  }
}
