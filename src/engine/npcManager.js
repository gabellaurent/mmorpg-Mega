// Gerenciador do Sistema de NPCs (Non-Player Characters - Multi-Mapa)
import { CONFIG } from '../config.js';

export class Npc {
  constructor({ id, name, title, type, gridX, gridY, direction = 'south', badgeText = 'NPC', badgeColor = '#ecc94b' }) {
    this.id = id;
    this.name = name;
    this.title = title;
    this.type = type; // 'guard' ou 'merchant'
    this.gridX = gridX;
    this.gridY = gridY;
    this.renderX = gridX * CONFIG.TILE_SIZE;
    this.renderY = gridY * CONFIG.TILE_SIZE;
    this.direction = direction;
    this.badgeText = badgeText;
    this.badgeColor = badgeColor;
    this.spriteKey = `npc_${type}`;
    this.chatBubble = null;
    this.chatTimer = null;
    this.isSolid = true;
  }

  setChatBubble(text, durationMs = 4000) {
    this.chatBubble = text;
    if (this.chatTimer) clearTimeout(this.chatTimer);
    this.chatTimer = setTimeout(() => {
      this.chatBubble = null;
    }, durationMs);
  }

  update(now) {
    const targetX = this.gridX * CONFIG.TILE_SIZE;
    const targetY = this.gridY * CONFIG.TILE_SIZE;
    this.renderX += (targetX - this.renderX) * 0.2;
    this.renderY += (targetY - this.renderY) * 0.2;
  }
}

export class NpcManager {
  constructor(gameMap) {
    this.gameMap = gameMap;
    this.npcs = new Map();
    this.initDefaultNpcs();
  }

  initDefaultNpcs() {
    this.npcs.clear();
    const mapId = this.gameMap ? this.gameMap.mapId : 'map-1';

    if (mapId === 'map-2') {
      // Patrulheiro da Floresta no Portão Norte
      this.addNpc(new Npc({
        id: 'ranger_forest',
        name: 'Elric',
        title: 'Patrulheiro da Floresta',
        type: 'guard',
        gridX: 17,
        gridY: 1,
        direction: 'south',
        badgeText: '🏹 GUIA',
        badgeColor: '#38a169'
      }));
    } else {
      // Guardas e Mercador da Vila Principal (Map 1)
      this.addNpc(new Npc({
        id: 'guard_south_left',
        name: 'Sir Gareth',
        title: 'Guarda Real',
        type: 'guard',
        gridX: 14,
        gridY: 30,
        direction: 'south',
        badgeText: '🛡️ GUARDA',
        badgeColor: '#4299e1'
      }));

      this.addNpc(new Npc({
        id: 'guard_south_right',
        name: 'Sir Tristan',
        title: 'Guarda Real',
        type: 'guard',
        gridX: 17,
        gridY: 30,
        direction: 'south',
        badgeText: '🛡️ GUARDA',
        badgeColor: '#4299e1'
      }));

      this.addNpc(new Npc({
        id: 'merchant_center',
        name: 'Barnaby',
        title: 'Mercador da Vila',
        type: 'merchant',
        gridX: 14,
        gridY: 15,
        direction: 'east',
        badgeText: '💰 MERCADOR',
        badgeColor: '#ecc94b'
      }));
    }
  }

  addNpc(npc) {
    this.npcs.set(npc.id, npc);
  }

  getNpcAt(x, y) {
    for (const npc of this.npcs.values()) {
      if (npc.gridX === x && npc.gridY === y) {
        return npc;
      }
    }
    return null;
  }

  isNpcAt(x, y) {
    const npc = this.getNpcAt(x, y);
    return npc ? npc.isSolid : false;
  }

  update(now) {
    this.npcs.forEach(npc => npc.update(now));
  }
}
