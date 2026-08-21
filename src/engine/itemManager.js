// Gerenciador de Itens no Chão (Ground Items & Loot Drop System)
import { CONFIG } from '../config.js';

export class GroundItem {
  constructor({ id, itemId, quantity, gridX, gridY, spawnTime = Date.now() }) {
    this.id = id;
    this.itemId = itemId;
    this.quantity = quantity;
    this.gridX = gridX;
    this.gridY = gridY;
    this.spawnTime = spawnTime;
    
    this.itemConfig = CONFIG.ITEMS[itemId] || { name: 'Item Desconhecido', spriteKey: 'item_gold' };
  }
}

export class ItemManager {
  constructor(gameMap) {
    this.gameMap = gameMap;
    this.items = new Map();
  }

  clear() {
    this.items.clear();
  }

  // Gera loot quando um monstro morre
  spawnMonsterLoot(monsterType, gridX, gridY, network = null) {
    const table = CONFIG.LOOT_TABLES[monsterType];
    if (!table) return [];

    const droppedItems = [];

    table.forEach(entry => {
      if (Math.random() <= entry.chance) {
        const qty = Math.floor(Math.random() * (entry.maxQty - entry.minQty + 1)) + entry.minQty;
        const id = `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        const groundItem = new GroundItem({
          id,
          itemId: entry.itemId,
          quantity: qty,
          gridX,
          gridY
        });

        this.items.set(id, groundItem);
        droppedItems.push(groundItem);

        // Transmitir para outros jogadores na sala se a rede estiver conectada
        if (network) {
          network.sendItemSpawn({
            id: groundItem.id,
            itemId: groundItem.itemId,
            quantity: groundItem.quantity,
            gridX: groundItem.gridX,
            gridY: groundItem.gridY
          });
        }
      }
    });

    return droppedItems;
  }

  addGroundItem(itemData) {
    if (!this.items.has(itemData.id)) {
      this.items.set(itemData.id, new GroundItem(itemData));
    }
  }

  removeGroundItem(id) {
    this.items.delete(id);
  }

  // Checa se o jogador pisou em algum item no terreno
  checkPickups(localPlayer, onPickup) {
    this.items.forEach((item, id) => {
      if (item.gridX === localPlayer.gridX && item.gridY === localPlayer.gridY) {
        const success = localPlayer.addItem(item.itemId, item.quantity);
        if (success) {
          this.items.delete(id);
          if (onPickup) {
            onPickup(item);
          }
        }
      }
    });
  }
}
