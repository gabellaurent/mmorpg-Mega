// Interface da Loja (Modal de Compra de Poções, Magias, Armas e Escudos)
import { CONFIG } from '../config.js';

export class ShopUI {
  constructor(localPlayer, monsterManager, hudUI) {
    this.localPlayer = localPlayer;
    this.monsterManager = monsterManager;
    this.hudUI = hudUI;
    this.activeShop = null;
    this.container = null;

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
  }

  openShop(shopId) {
    const shopData = this.shops[shopId] || this.shops['merchant_magic'];
    if (!shopData) return;

    this.activeShop = shopData;
    this.closeShop(); // Limpa se já houver janela aberta

    this.container = document.createElement('div');
    this.container.id = 'shop-modal-container';
    this.container.className = 'shop-modal-container';

    const openTime = Date.now();

    // Fechar a loja ao clicar no fundo escuro fora do card (após o clique inicial)
    this.container.onclick = (e) => {
      if (Date.now() - openTime < 300) return; // Ignora cliques imediatos do instante de abertura
      if (e.target === this.container) {
        this.closeShop();
      }
    };

    const targetParent = document.getElementById('app') || document.body;
    targetParent.appendChild(this.container);

    try {
      this.renderModal();
    } catch (err) {
      console.error('Erro ao renderizar modal da loja:', err);
    }
  }

  closeShop() {
    const existing = document.getElementById('shop-modal-container');
    if (existing) {
      existing.remove();
    }
    this.container = null;
    this.activeShop = null;
  }

  renderModal() {
    if (!this.container || !this.activeShop) return;

    const gold = (this.localPlayer && typeof this.localPlayer.gold === 'number') ? this.localPlayer.gold : 0;

    let itemsHtml = '';
    this.activeShop.items.forEach(itemData => {
      const itemConfig = CONFIG.ITEMS[itemData.itemId];
      if (!itemConfig) return;

      const canAfford = gold >= itemData.price;
      const btnClass = canAfford ? 'shop-buy-btn can-afford' : 'shop-buy-btn cannot-afford';

      itemsHtml += `
        <div class="shop-item-row">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="shop-item-icon">
              ${itemConfig.type === 'consumable' ? '🧪' : itemConfig.type === 'equipment' ? '⚔️' : '📦'}
            </div>
            <div>
              <div style="color: #f7fafc; font-weight: bold; font-size: 13.5px;">${itemConfig.name}</div>
              <div style="color: #a0aec0; font-size: 11px;">${itemConfig.description}</div>
            </div>
          </div>
          <button data-item-id="${itemData.itemId}" data-price="${itemData.price}" class="${btnClass}">
            💰 ${itemData.price} Ouro
          </button>
        </div>
      `;
    });

    this.container.innerHTML = `
      <div class="shop-card">
        <div class="shop-header">
          <div>
            <h3 class="shop-title">${this.activeShop.title}</h3>
            <div class="shop-owner">Comerciante: ${this.activeShop.ownerName}</div>
          </div>
          <button id="close-shop-btn" class="shop-close-btn" title="Fechar (ESC)">✕</button>
        </div>

        <div class="shop-balance-bar">
          <span style="font-size: 12px; color: #cbd5e0;">Seu Saldo Atual:</span>
          <span style="font-size: 14px; font-weight: bold; color: #f6e05e;">💰 ${gold} Ouro</span>
        </div>

        <div class="shop-items-list">
          ${itemsHtml}
        </div>
      </div>
    `;

    // Event Listeners
    const closeBtn = this.container.querySelector('#close-shop-btn');
    if (closeBtn) {
      closeBtn.onclick = () => this.closeShop();
    }

    this.container.querySelectorAll('.shop-buy-btn.can-afford').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const itemId = e.currentTarget.getAttribute('data-item-id');
        const price = parseInt(e.currentTarget.getAttribute('data-price'), 10);
        this.buyItem(itemId, price);
      };
    });
  }

  buyItem(itemId, price) {
    if (!this.localPlayer) return;

    if ((this.localPlayer.gold || 0) < price) {
      if (this.monsterManager) {
        this.monsterManager.addFloatingText('⚠️ Ouro Insuficiente!', this.localPlayer.gridX, this.localPlayer.gridY, '#f56565');
      }
      return;
    }

    const added = this.localPlayer.addItem(itemId, 1);
    if (!added) {
      if (this.monsterManager) {
        this.monsterManager.addFloatingText('🎒 Inventário Cheio!', this.localPlayer.gridX, this.localPlayer.gridY, '#ed8936');
      }
      return;
    }

    this.localPlayer.gold -= price;

    const itemConfig = CONFIG.ITEMS[itemId];
    const itemName = itemConfig ? itemConfig.name : itemId;

    if (this.monsterManager) {
      this.monsterManager.addFloatingText(`+1 ${itemName}`, this.localPlayer.gridX, this.localPlayer.gridY, '#48bb78');
    }

    if (this.hudUI) {
      this.hudUI.updatePlayerStats();
    }

    this.renderModal(); // Atualiza o saldo e botões na tela
  }
}
