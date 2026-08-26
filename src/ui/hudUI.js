import { CONFIG } from '../config.js';
import { spriteGen } from '../engine/spriteGenerator.js';

export class HudUI {
  constructor(localPlayer, onSendChat, onToggleGrid, onAttack, onUseItem, onDropItem) {
    this.localPlayer = localPlayer;
    this.onSendChat = onSendChat;
    this.onToggleGrid = onToggleGrid;
    this.onAttack = onAttack;
    this.onUseItem = onUseItem;
    this.onDropItem = onDropItem;

    this.container = document.getElementById('hud-container');
    this.remotePlayersMap = new Map();
    this.isInventoryOpen = false;
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <!-- Modal Flutuante: Status do Personagem [C] -->
      <div class="hud-modal hidden" id="status-card">
        <div class="modal-header">
          <span>⚔️ Status do Herói</span>
          <button class="btn-close-window" id="btn-close-status">✖</button>
        </div>
        <div class="modal-body">
          <div class="status-row">
            <span>Nome:</span>
            <strong id="hud-player-name">--</strong>
          </div>
          <div class="status-row">
            <span>Nível:</span>
            <strong id="hud-player-lvl" class="badge-lvl">Lvl.1</strong>
          </div>
          <div class="status-row">
            <span>Pontos de Vida:</span>
            <div class="hp-bar-container">
              <div class="hp-bar-fill" id="hud-hp-fill" style="width: 100%;"></div>
              <span class="hp-text" id="hud-hp-text">100 / 100</span>
            </div>
          </div>
          <div class="status-row">
            <span>Experiência:</span>
            <div class="xp-bar-container">
              <div class="xp-bar-fill" id="hud-xp-fill" style="width: 0%;"></div>
              <span class="xp-text" id="hud-xp-text">XP: 0 / 50</span>
            </div>
          </div>
          <div class="status-row">
            <span>Coordenadas:</span>
            <span>📍 X:<strong id="hud-coord-x">16</strong> Y:<strong id="hud-coord-y">16</strong></span>
          </div>
        </div>
      </div>

      <!-- Modal Flutuante: Mapa do Mundo [M] -->
      <div class="hud-modal hidden" id="map-card">
        <div class="modal-header">
          <span>🗺️ Mapa do Mundo (<strong id="online-count">1</strong> Online)</span>
          <button class="btn-close-window" id="btn-close-map">✖</button>
        </div>
        <div class="modal-body map-body">
          <div class="minimap-container">
            <canvas id="minimap-canvas" width="160" height="160"></canvas>
          </div>
          <ul class="online-list" id="online-list">
            <li class="you">👑 ${this.localPlayer.name} (Você)</li>
          </ul>
        </div>
      </div>

      <!-- Janela Flutuante Estilo RPG: Bolsa de Couro & Pergaminho (24 Slots) [I] -->
      <div class="inventory-card hidden" id="inventory-card">
        <div class="leather-belt-header">
          <div class="belt-strap">
            <span class="belt-buckle">🧈</span>
            <span class="belt-title">Bolsa do Aventureiro</span>
          </div>
          <button class="btn-close-window" id="btn-close-inv" title="Fechar (Esc)">✖</button>
        </div>

        <div class="inventory-stats-bar">
          <div class="gold-badge">
            <span class="gold-icon">🪙</span>
            <span id="inv-gold-count">0 ouro</span>
          </div>
          <div class="slot-count-badge">
            <span>Espaço:</span>
            <strong id="inv-slot-count">0/24</strong>
          </div>
        </div>

        <div class="inventory-grid" id="inventory-grid"></div>

        <div class="inventory-item-detail" id="inv-item-detail">
          <span class="detail-placeholder">Toque ou passe o cursor sobre um item para ver detalhes e opções.</span>
        </div>
      </div>

      <!-- Barra Flutuante de Entrada do Chat Zero-HUD [Enter] -->
      <div class="chat-card hidden" id="chat-card">
        <form class="chat-input-form" id="chat-form">
          <input type="text" id="chat-input" placeholder="Digite uma mensagem..." maxlength="80" autocomplete="off" />
          <button type="submit" class="btn-send">Enviar ↵</button>
        </form>
      </div>

      <!-- Modal Flutuante: Loja de Poções, Magias, Armas e Escudos -->
      <div class="shop-modal-container hidden" id="shop-modal-card" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(9, 13, 22, 0.85); backdrop-filter: blur(6px); display: none; justify-content: center; align-items: center; z-index: 100000; pointer-events: auto; font-family: system-ui, -apple-system, sans-serif; box-sizing: border-box;">
        <div class="shop-card" style="background: rgba(15, 23, 42, 0.98); border: 2px solid #d69e2e; width: 92%; max-width: 440px; border-radius: 16px; padding: 20px; box-shadow: 0 12px 30px rgba(0,0,0,0.9); color: #fff; position: relative; z-index: 100001; box-sizing: border-box;">
          <div class="shop-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 12px; margin-bottom: 16px;">
            <div>
              <h3 class="shop-title" id="shop-card-title" style="margin: 0; font-size: 16px; color: #f6e05e; font-family: 'Cinzel', Georgia, serif; letter-spacing: 0.5px;">🧪 Loja do Comerciante</h3>
              <div class="shop-owner" id="shop-card-owner" style="font-size: 11.5px; color: #cbd5e0; margin-top: 2px;">Comerciante: Mestre Elzar</div>
            </div>
            <button class="shop-close-btn" id="btn-close-shop" title="Fechar (Esc)" style="background: transparent; border: none; color: #a0aec0; font-size: 22px; cursor: pointer; padding: 0 6px;">✕</button>
          </div>

          <div class="shop-balance-bar" style="display: flex; justify-content: space-between; align-items: center; background: rgba(214, 158, 46, 0.12); border: 1px solid #d69e2e; padding: 8px 14px; border-radius: 8px; margin-bottom: 14px;">
            <span style="font-size: 12px; color: #cbd5e0;">Seu Saldo Atual:</span>
            <span style="font-size: 14px; font-weight: bold; color: #f6e05e;" id="shop-card-gold">💰 0 Ouro</span>
          </div>

          <div class="shop-items-list" id="shop-card-items-list" style="display: flex; flex-direction: column; gap: 10px; max-height: 260px; overflow-y: auto;"></div>
        </div>
      </div>
    `;

    this.shops = {
      merchant_magic: {
        id: 'merchant_magic',
        title: '🧪 Loja de Poções & Magia',
        ownerName: 'Mestre Elzar (Alquimista & Mago)',
        items: [
          { itemId: 'health_potion', price: 10 },
          { itemId: 'mana_potion', price: 25 },
          { itemId: 'cheese', price: 5 }
        ]
      },
      merchant_armorer: {
        id: 'merchant_armorer',
        title: '⚔️ Loja de Armas & Escudos',
        ownerName: 'Ferreiro Borin (Mestre Armeiro)',
        items: [
          { itemId: 'steel_sword', price: 50 },
          { itemId: 'bronze_shield', price: 40 },
          { itemId: 'hunting_bow', price: 45 }
        ]
      }
    };

    this.activeShop = null;
    this.monsterManagerRef = null;

    this.attachEvents();
    this.updatePlayerStats();
  }

  attachEvents() {
    const chatForm = this.container.querySelector('#chat-form');
    const chatInput = this.container.querySelector('#chat-input');

    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (text) {
        this.onSendChat(text);
        chatInput.value = '';
      }
      chatInput.blur();
      this.toggleChat(false);
    });

    const toggleGridBtn = this.container.querySelector('#btn-toggle-grid');
    if (toggleGridBtn) {
      const handleToggleGrid = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        this.onToggleGrid();
      };
      toggleGridBtn.addEventListener('click', handleToggleGrid);
      toggleGridBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    }

    const toggleInvBtn = this.container.querySelector('#btn-toggle-inv');
    const closeInvBtn = this.container.querySelector('#btn-close-inv');
    const closeStatusBtn = this.container.querySelector('#btn-close-status');
    const closeMapBtn = this.container.querySelector('#btn-close-map');
    const closeChatBtn = this.container.querySelector('#btn-close-chat');
    const closeShopBtn = this.container.querySelector('#btn-close-shop');
    const shopModalCard = this.container.querySelector('#shop-modal-card');

    if (closeInvBtn) closeInvBtn.addEventListener('click', () => this.toggleInventory(false));
    if (closeStatusBtn) closeStatusBtn.addEventListener('click', () => this.toggleStatus(false));
    if (closeMapBtn) closeMapBtn.addEventListener('click', () => this.toggleMap(false));
    if (closeChatBtn) closeChatBtn.addEventListener('click', () => this.toggleChat(false));
    if (closeShopBtn) closeShopBtn.addEventListener('click', () => this.closeShop());

    if (shopModalCard) {
      shopModalCard.addEventListener('click', (e) => {
        if (e.target === shopModalCard) {
          this.closeShop();
        }
      });
    }

    // Teclas de atalho diretas no PC: I (Mochila), M (Mapa), C (Status), Enter (Chat), Esc (Fechar Tudo)
    window.addEventListener('keydown', (e) => {
      const isInputActive = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');

      if (e.key === 'Enter') {
        if (!isInputActive) {
          e.preventDefault();
          this.toggleChat(true);
          const input = this.container.querySelector('#chat-input');
          if (input) input.focus();
        }
        return;
      }

      if (isInputActive) {
        if (e.key === 'Escape') {
          document.activeElement.blur();
          this.toggleChat(false);
          this.closeShop();
        }
        return;
      }

      if (e.key === 'Escape') {
        this.toggleInventory(false);
        this.toggleStatus(false);
        this.toggleMap(false);
        this.toggleChat(false);
        this.closeShop();
      }

      if (e.key === 'i' || e.key === 'I') {
        this.toggleInventory();
      } else if (e.key === 'm' || e.key === 'M') {
        this.toggleMap();
      } else if (e.key === 'c' || e.key === 'C') {
        this.toggleStatus();
      } else if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });
  }

  closeAllModals() {
    this.toggleInventory(false);
    this.toggleStatus(false);
    this.toggleMap(false);
    this.toggleChat(false);
  }

  toggleStatus(forceState = null) {
    const card = this.container.querySelector('#status-card');
    if (!card) return;
    const isHidden = card.classList.contains('hidden');
    const newState = forceState !== null ? forceState : isHidden;
    if (newState) {
      card.classList.remove('hidden');
      this.updatePlayerStats();
    } else {
      card.classList.add('hidden');
    }
  }

  toggleMap(forceState = null) {
    const card = this.container.querySelector('#map-card');
    if (!card) return;
    const isHidden = card.classList.contains('hidden');
    const newState = forceState !== null ? forceState : isHidden;
    if (newState) {
      card.classList.remove('hidden');
      this.renderMinimap();
    } else {
      card.classList.add('hidden');
    }
  }

  toggleChat(forceState = null) {
    const card = this.container.querySelector('#chat-card');
    const input = this.container.querySelector('#chat-input');
    if (!card || !input) return;

    const isHidden = card.classList.contains('hidden');
    const newState = forceState !== null ? forceState : isHidden;
    if (newState) {
      card.classList.remove('hidden');
      setTimeout(() => input.focus(), 30);
    } else {
      card.classList.add('hidden');
      input.blur();
    }
  }

  toggleInventory(forceState = null) {
    const invCard = this.container.querySelector('#inventory-card');
    if (!invCard) return;

    this.isInventoryOpen = forceState !== null ? forceState : !this.isInventoryOpen;
    if (this.isInventoryOpen) {
      invCard.classList.remove('hidden');
      this.renderInventory();
    } else {
      invCard.classList.add('hidden');
    }
  }

  renderInventory() {
    const gridEl = this.container.querySelector('#inventory-grid');
    const slotCountEl = this.container.querySelector('#inv-slot-count');
    const goldCountEl = this.container.querySelector('#inv-gold-count');
    const invBadgeEl = this.container.querySelector('#hud-inv-badge');
    const detailEl = this.container.querySelector('#inv-item-detail');

    if (!gridEl) return;

    if (goldCountEl) {
      goldCountEl.textContent = `${this.localPlayer.gold} gold`;
    }

    let occupiedCount = 0;
    gridEl.innerHTML = '';

    this.localPlayer.inventory.forEach((slot, index) => {
      const slotDiv = document.createElement('div');
      slotDiv.className = `inventory-slot ${slot ? '' : 'empty'}`;

      if (slot) {
        occupiedCount++;
        const itemConfig = CONFIG.ITEMS[slot.itemId];

        if (itemConfig) {
          slotDiv.dataset.type = itemConfig.type || 'normal';

          const sprite = spriteGen.get(itemConfig.spriteKey);
          if (sprite) {
            const iconImg = document.createElement('img');
            iconImg.src = sprite.toDataURL();
            slotDiv.appendChild(iconImg);
          }

          if (slot.quantity > 1) {
            const qtyBadge = document.createElement('span');
            qtyBadge.className = 'slot-qty';
            qtyBadge.textContent = slot.quantity;
            slotDiv.appendChild(qtyBadge);
          }

          // Exibir detalhes no rodapé do inventário ao passar o mouse
          slotDiv.addEventListener('mouseenter', () => {
            if (detailEl) {
              const typeText = itemConfig.type === 'consumable' ? '🧪 Consumível' : itemConfig.type === 'currency' ? '🪙 Moeda' : '📦 Material';
              detailEl.innerHTML = `
                <div class="detail-name">${itemConfig.name} <span class="detail-type">${typeText}</span></div>
                <div class="detail-desc">${itemConfig.description}</div>
                <div class="detail-action">${itemConfig.type === 'consumable' ? '🖱️ Clique p/ Usar' : ''} | 🛑 Botão Direito p/ Largar</div>
              `;
            }
          });

          slotDiv.addEventListener('mouseleave', () => {
            if (detailEl) {
              detailEl.innerHTML = `<span class="detail-placeholder">Passe o cursor sobre um item ou clique com o Botão Direito para descartar.</span>`;
            }
          });

          // Clique Esquerdo: Usar Item Consumível
          slotDiv.addEventListener('click', () => {
            if (this.onUseItem) {
              this.onUseItem(index);
            }
          });

          // Clique Direito: Descartar Item no Chão
          slotDiv.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.onDropItem) {
              this.onDropItem(index);
            }
          });
        }
      }

      gridEl.appendChild(slotDiv);
    });

    if (slotCountEl) {
      slotCountEl.textContent = `${occupiedCount}/24`;
    }
    if (invBadgeEl) {
      invBadgeEl.textContent = `${occupiedCount}/24`;
    }
  }

  updatePlayerStats() {
    const nameEl = this.container.querySelector('#hud-player-name');
    const lvlEl = this.container.querySelector('#hud-player-lvl');
    const hpFill = this.container.querySelector('#hud-hp-fill');
    const hpText = this.container.querySelector('#hud-hp-text');
    const xpFill = this.container.querySelector('#hud-xp-fill');
    const xpText = this.container.querySelector('#hud-xp-text');
    const coordX = this.container.querySelector('#hud-coord-x');
    const coordY = this.container.querySelector('#hud-coord-y');
    const invBadgeEl = this.container.querySelector('#hud-inv-badge');

    if (nameEl) nameEl.textContent = this.localPlayer.name;
    if (lvlEl) lvlEl.textContent = `Lvl.${this.localPlayer.level}`;
    if (coordX) coordX.textContent = this.localPlayer.gridX;
    if (coordY) coordY.textContent = this.localPlayer.gridY;

    if (hpFill && hpText) {
      const ratio = Math.max(0, Math.min(1, this.localPlayer.hp / this.localPlayer.maxHp));
      hpFill.style.width = `${ratio * 100}%`;
      hpText.textContent = `${this.localPlayer.hp} / ${this.localPlayer.maxHp}`;
    }

    if (xpFill && xpText) {
      const xpRatio = Math.max(0, Math.min(1, this.localPlayer.xp / this.localPlayer.maxXp));
      xpFill.style.width = `${xpRatio * 100}%`;
      xpText.textContent = `XP: ${this.localPlayer.xp} / ${this.localPlayer.maxXp}`;
    }

    if (invBadgeEl) {
      const occupied = this.localPlayer.inventory.filter(slot => slot !== null).length;
      invBadgeEl.textContent = `${occupied}/24`;
    }

    this.renderMinimap();
    if (this.isInventoryOpen) {
      this.renderInventory();
    }
    if (this.activeShop) {
      this.renderShopModal();
    }
  }

  addChatMessage(sender, text, isSystem = false) {
    // Alertas flutuantes no topo desativados
  }

  updateOnlineList(remotePlayersMap) {
    this.remotePlayersMap = remotePlayersMap;
    const listEl = this.container.querySelector('#online-list');
    const countEl = this.container.querySelector('#online-count');

    if (!listEl || !countEl) return;

    const totalOnline = remotePlayersMap.size + 1;
    countEl.textContent = totalOnline;

    listEl.innerHTML = `<li class="you">👑 ${this.localPlayer.name} (Você)</li>`;

    remotePlayersMap.forEach(p => {
      const li = document.createElement('li');
      li.style.color = '#68d391';
      li.style.fontWeight = 'bold';

      const dist = Math.round(Math.hypot(p.gridX - this.localPlayer.gridX, p.gridY - this.localPlayer.gridY));
      li.textContent = `🟢 ${p.name} (X:${p.gridX}, Y:${p.gridY}) [${dist} tiles]`;
      listEl.appendChild(li);
    });

    this.renderMinimap();
  }

  renderMinimap() {
    const canvas = this.container.querySelector('#minimap-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const width = canvas.width;
    const height = canvas.height;
    const scale = width / CONFIG.GRID_WIDTH;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#334155';
    ctx.fillRect(12 * scale, 12 * scale, 8 * scale, 8 * scale);

    this.remotePlayersMap.forEach(p => {
      ctx.fillStyle = '#48bb78';
      ctx.beginPath();
      ctx.arc(p.gridX * scale + scale / 2, p.gridY * scale + scale / 2, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    const lx = this.localPlayer.gridX * scale;
    const ly = this.localPlayer.gridY * scale;

    ctx.fillStyle = '#ecc94b';
    ctx.beginPath();
    ctx.arc(lx + scale / 2, ly + scale / 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  escapeHtml(str) {
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[m]);
  }

  openShop(shopId, monsterManager = null) {
    const shopData = this.shops[shopId] || this.shops['merchant_magic'];
    if (!shopData) return;

    this.activeShop = shopData;
    if (monsterManager) this.monsterManagerRef = monsterManager;

    const modalCard = this.container.querySelector('#shop-modal-card');
    const titleEl = this.container.querySelector('#shop-card-title');
    const ownerEl = this.container.querySelector('#shop-card-owner');

    if (!modalCard || !titleEl || !ownerEl) return;

    titleEl.textContent = shopData.title;
    ownerEl.textContent = `Comerciante: ${shopData.ownerName}`;

    this.renderShopModal();
    modalCard.classList.remove('hidden');
    modalCard.style.display = 'flex';
  }

  closeShop() {
    const modalCard = this.container.querySelector('#shop-modal-card');
    if (modalCard) {
      modalCard.classList.add('hidden');
      modalCard.style.display = 'none';
    }
    this.activeShop = null;
  }

  renderShopModal() {
    if (!this.activeShop) return;

    const goldEl = this.container.querySelector('#shop-card-gold');
    const listEl = this.container.querySelector('#shop-card-items-list');
    if (!goldEl || !listEl) return;

    const playerGold = (this.localPlayer && typeof this.localPlayer.gold === 'number') ? this.localPlayer.gold : 0;
    goldEl.textContent = `💰 ${playerGold} Ouro`;

    let itemsHtml = '';
    this.activeShop.items.forEach(itemData => {
      const itemConfig = CONFIG.ITEMS[itemData.itemId];
      if (!itemConfig) return;

      const canAfford = playerGold >= itemData.price;
      const btnClass = canAfford ? 'shop-buy-btn can-afford' : 'shop-buy-btn cannot-afford';
      const btnStyle = canAfford
        ? 'background: linear-gradient(135deg, #d69e2e, #b7791f); color: #fff; cursor: pointer; box-shadow: 0 2px 8px rgba(214, 158, 46, 0.4);'
        : 'background: #4a5568; color: #a0aec0; cursor: not-allowed; opacity: 0.6;';

      itemsHtml += `
        <div class="shop-item-row" style="display: flex; align-items: center; justify-content: space-between; background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(255,255,255,0.08); padding: 10px 14px; border-radius: 10px; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="shop-item-icon" style="width: 36px; height: 36px; background: rgba(15, 23, 42, 0.8); border: 1px solid #d69e2e; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
              ${itemConfig.type === 'consumable' ? '🧪' : itemConfig.type === 'equipment' ? '⚔️' : '📦'}
            </div>
            <div>
              <div style="color: #f7fafc; font-weight: bold; font-size: 13.5px;">${itemConfig.name}</div>
              <div style="color: #a0aec0; font-size: 11px;">${itemConfig.description}</div>
            </div>
          </div>
          <button data-item-id="${itemData.itemId}" data-price="${itemData.price}" class="${btnClass}" style="${btnStyle} border: none; padding: 7px 14px; border-radius: 6px; font-weight: bold; font-size: 12px; white-space: nowrap; flex-shrink: 0;">
            💰 ${itemData.price} Ouro
          </button>
        </div>
      `;
    });

    listEl.innerHTML = itemsHtml;

    listEl.querySelectorAll('.shop-buy-btn.can-afford').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const itemId = e.currentTarget.getAttribute('data-item-id');
        const price = parseInt(e.currentTarget.getAttribute('data-price'), 10);
        this.buyShopItem(itemId, price);
      };
    });
  }

  buyShopItem(itemId, price) {
    if (!this.localPlayer) return;

    const playerGold = (typeof this.localPlayer.gold === 'number') ? this.localPlayer.gold : 0;
    if (playerGold < price) {
      if (this.monsterManagerRef) {
        this.monsterManagerRef.addFloatingText('⚠️ Ouro Insuficiente!', this.localPlayer.gridX, this.localPlayer.gridY, '#f56565');
      }
      return;
    }

    const added = this.localPlayer.addItem(itemId, 1);
    if (!added) {
      if (this.monsterManagerRef) {
        this.monsterManagerRef.addFloatingText('🎒 Inventário Cheio!', this.localPlayer.gridX, this.localPlayer.gridY, '#ed8936');
      }
      return;
    }

    this.localPlayer.gold -= price;

    const itemConfig = CONFIG.ITEMS[itemId];
    const itemName = itemConfig ? itemConfig.name : itemId;

    if (this.monsterManagerRef) {
      this.monsterManagerRef.addFloatingText(`+1 ${itemName}`, this.localPlayer.gridX, this.localPlayer.gridY, '#48bb78');
    }

    this.updatePlayerStats();
    this.renderShopModal();
  }
}
