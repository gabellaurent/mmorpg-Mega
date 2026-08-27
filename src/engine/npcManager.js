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

    let customLoaded = false;
    try {
      const saved = localStorage.getItem('mmorpg_custom_maps');
      if (saved) {
        const dict = JSON.parse(saved);
        if (dict[mapId] && Array.isArray(dict[mapId].npcs) && dict[mapId].npcs.length > 0) {
          dict[mapId].npcs.forEach(n => {
            let title = 'Habitante da Vila';
            let type = 'merchant';
            let badgeText = '💬 DIÁLOGO';
            let badgeColor = '#9f7aea';

            if (n.key === 'npc_guard') {
              title = 'Guardião Real';
              type = 'guard';
              badgeText = '🛡️ GUARDA';
              badgeColor = '#4299e1';
            } else if (n.key === 'npc_merchant') {
              title = 'Alquimista & Mago';
              type = 'merchant';
              badgeText = '🧪 POÇÕES & MAGIA';
              badgeColor = '#9f7aea';
            } else if (n.key === 'npc_blacksmith') {
              title = 'Mestre Armeiro';
              type = 'merchant';
              badgeText = '⚔️ ARMAS & ESCUDOS';
              badgeColor = '#ed8936';
            } else if (n.key === 'npc_ranger') {
              title = 'Guia da Floresta';
              type = 'guard';
              badgeText = '🏹 GUIA';
              badgeColor = '#38a169';
            } else if (n.key === 'npc_healer') {
              title = 'Sacerdote do Templo';
              type = 'merchant';
              badgeText = '✨ CURA & TEMPLO';
              badgeColor = '#48bb78';
            } else if (n.key === 'npc_taverner') {
              title = 'Mestre da Taverna';
              type = 'merchant';
              badgeText = '🍺 TAVERNA & COMIDA';
              badgeColor = '#d69e2e';
            }

            this.addNpc(new Npc({
              id: n.id,
              name: n.name,
              title,
              type,
              gridX: n.x,
              gridY: n.y,
              direction: 'south',
              badgeText,
              badgeColor
            }));
          });
          customLoaded = true;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar NPCs customizados do localStorage:', e);
    }

    if (!customLoaded) {
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
        id: 'merchant_magic',
        name: 'Mestre Elzar',
        title: 'Alquimista & Mago',
        type: 'merchant',
        gridX: 13,
        gridY: 14,
        direction: 'south',
        badgeText: '🧪 POÇÕES & MAGIA',
        badgeColor: '#9f7aea'
      }));

      this.addNpc(new Npc({
        id: 'merchant_armorer',
        name: 'Ferreiro Borin',
        title: 'Mestre Armeiro',
        type: 'merchant',
        gridX: 18,
        gridY: 14,
        direction: 'south',
        badgeText: '⚔️ ARMAS & ESCUDOS',
        badgeColor: '#ed8936'
      }));
    }
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
