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
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(4px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    const openTime = Date.now();

    // Fechar a loja ao clicar no fundo escuro fora do card (após o clique inicial)
    this.container.onclick = (e) => {
      if (Date.now() - openTime < 250) return; // Ignora cliques imediatos do instante de abertura
      if (e.target === this.container) {
        this.closeShop();
      }
    };

    document.body.appendChild(this.container);

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

    const gold = this.localPlayer.gold || 0;

    let itemsHtml = '';
    this.activeShop.items.forEach(itemData => {
      const itemConfig = CONFIG.ITEMS[itemData.itemId];
      if (!itemConfig) return;

      const canAfford = gold >= itemData.price;
      const btnStyle = canAfford
        ? 'background: linear-gradient(135deg, #d69e2e, #b7791f); color: #fff; cursor: pointer;'
        : 'background: #4a5568; color: #a0aec0; cursor: not-allowed; opacity: 0.6;';

      itemsHtml += `
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(255,255,255,0.08); padding: 10px 14px; border-radius: 10px; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 36px; height: 36px; background: rgba(15, 23, 42, 0.8); border: 1px solid #d69e2e; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
              ${itemConfig.type === 'consumable' ? '🧪' : itemConfig.type === 'equipment' ? '⚔️' : '📦'}
            </div>
            <div>
              <div style="color: #f7fafc; font-weight: bold; font-size: 13.5px;">${itemConfig.name}</div>
              <div style="color: #a0aec0; font-size: 11px;">${itemConfig.description}</div>
            </div>
          </div>
          <button data-item-id="${itemData.itemId}" data-price="${itemData.price}" class="buy-btn" style="${btnStyle} border: none; padding: 7px 14px; border-radius: 6px; font-weight: bold; font-size: 12px; transition: transform 0.1s;">
            💰 ${itemData.price} Ouro
          </button>
        </div>
      `;
    });

    this.container.innerHTML = `
      <div style="background: rgba(15, 23, 42, 0.95); border: 2px solid #d69e2e; width: 90%; max-width: 440px; border-radius: 16px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.8); color: #fff;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; margin-bottom: 16px;">
          <div>
            <h3 style="margin: 0; font-size: 16px; color: #f6e05e;">${this.activeShop.title}</h3>
            <div style="font-size: 11.5px; color: #cbd5e0; margin-top: 2px;">Comerciante: ${this.activeShop.ownerName}</div>
          </div>
          <button id="close-shop-btn" style="background: transparent; border: none; color: #a0aec0; font-size: 20px; cursor: pointer; padding: 0 6px;">✕</button>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(214, 158, 46, 0.12); border: 1px solid #d69e2e; padding: 8px 12px; border-radius: 8px; margin-bottom: 14px;">
          <span style="font-size: 12px; color: #cbd5e0;">Seu Saldo Atual:</span>
          <span style="font-size: 14px; font-weight: bold; color: #f6e05e;">💰 ${gold} Ouro</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px; max-height: 260px; overflow-y: auto;">
          ${itemsHtml}
        </div>
      </div>
    `;

    // Event Listeners
    const closeBtn = this.container.querySelector('#close-shop-btn');
    if (closeBtn) {
      closeBtn.onclick = () => this.closeShop();
    }

    this.container.querySelectorAll('.buy-btn').forEach(btn => {
      btn.onclick = (e) => {
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
