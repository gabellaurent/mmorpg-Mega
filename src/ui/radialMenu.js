export class RadialMenu {
  constructor(onSelectAction) {
    this.onSelectAction = onSelectAction; // Callback para disparar a ação selecionada: 'inventory', 'map', 'status', 'chat', 'outfit', 'grid'
    this.isOpen = false;
    this.element = null;
    this.init();
  }

  init() {
    this.element = document.createElement('div');
    this.element.id = 'action-menu-overlay';
    this.element.className = 'action-menu-overlay hidden';

    this.element.innerHTML = `
      <div class="action-menu-card" id="action-menu-card">
        <div class="action-menu-header">
          <div class="action-menu-title">⚔️ MENUS DO HERÓI</div>
          <button type="button" class="action-menu-close" id="btn-close-action-menu">✕</button>
        </div>
        
        <div class="action-menu-grid">
          <!-- Mochila -->
          <button type="button" class="action-menu-item" data-action="inventory" title="Mochila (I)">
            <span class="action-menu-icon">🎒</span>
            <span class="action-menu-label">Mochila</span>
            <span class="action-menu-shortcut">[I]</span>
          </button>

          <!-- Mapa -->
          <button type="button" class="action-menu-item" data-action="map" title="Mapa (M)">
            <span class="action-menu-icon">🗺️</span>
            <span class="action-menu-label">Mapa</span>
            <span class="action-menu-shortcut">[M]</span>
          </button>

          <!-- Status -->
          <button type="button" class="action-menu-item" data-action="status" title="Status (C)">
            <span class="action-menu-icon">⚔️</span>
            <span class="action-menu-label">Status</span>
            <span class="action-menu-shortcut">[C]</span>
          </button>

          <!-- Chat -->
          <button type="button" class="action-menu-item" data-action="chat" title="Chat (Enter)">
            <span class="action-menu-icon">💬</span>
            <span class="action-menu-label">Chat</span>
            <span class="action-menu-shortcut">[Enter]</span>
          </button>

          <!-- Outfit -->
          <button type="button" class="action-menu-item" data-action="outfit" title="Personalizar Outfit (O)">
            <span class="action-menu-icon">🎨</span>
            <span class="action-menu-label">Outfit</span>
            <span class="action-menu-shortcut">[O]</span>
          </button>

          <!-- Grade -->
          <button type="button" class="action-menu-item" data-action="grid" title="Linhas da Grade">
            <span class="action-menu-icon">📐</span>
            <span class="action-menu-label">Grade</span>
            <span class="action-menu-shortcut">[G]</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('app').appendChild(this.element);
    this.attachEvents();
  }

  attachEvents() {
    // Fechar ao clicar fora do card
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) {
        this.close();
      }
    });

    const closeBtn = this.element.querySelector('#btn-close-action-menu');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.close();
      });
    }

    const items = this.element.querySelectorAll('.action-menu-item');
    items.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const action = btn.dataset.action;
        this.close();
        if (this.onSelectAction) {
          this.onSelectAction(action);
        }
      });
    });
  }

  open(x = window.innerWidth / 2, y = window.innerHeight / 2) {
    this.isOpen = true;
    this.element.classList.remove('hidden');

    const card = this.element.querySelector('#action-menu-card');
    const clampedX = Math.max(150, Math.min(window.innerWidth - 150, x));
    const clampedY = Math.max(120, Math.min(window.innerHeight - 120, y));

    card.style.left = `${clampedX}px`;
    card.style.top = `${clampedY}px`;
  }

  close() {
    this.isOpen = false;
    this.element.classList.add('hidden');
  }

  toggle(x, y) {
    if (this.isOpen) {
      this.close();
    } else {
      this.open(x, y);
    }
  }
}
