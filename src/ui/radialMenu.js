export class RadialMenu {
  constructor(onSelectAction) {
    this.onSelectAction = onSelectAction; // Callback para disparar a ação selecionada: 'inventory', 'map', 'status', 'chat'
    this.isOpen = false;
    this.activeTouchId = null;
    this.element = null;
    this.init();
  }

  init() {
    this.element = document.createElement('div');
    this.element.id = 'radial-menu-overlay';
    this.element.className = 'radial-menu-overlay hidden';

    this.element.innerHTML = `
      <div class="radial-wheel" id="radial-wheel">
        <div class="radial-center-badge">
          <span class="radial-center-icon">⚔️</span>
        </div>
        
        <!-- Slot Topo: Mochila [I] -->
        <button class="radial-item item-top" data-action="inventory" title="Mochila (I)">
          <span class="radial-icon">🎒</span>
          <span class="radial-label">Mochila</span>
        </button>

        <!-- Slot Direita: Mapa [M] -->
        <button class="radial-item item-right" data-action="map" title="Mapa (M)">
          <span class="radial-icon">🗺️</span>
          <span class="radial-label">Mapa</span>
        </button>

        <!-- Slot Baixo: Status [C] -->
        <button class="radial-item item-bottom" data-action="status" title="Status (C)">
          <span class="radial-icon">⚔️</span>
          <span class="radial-label">Status</span>
        </button>

        <!-- Slot Esquerda: Chat [Enter] -->
        <button class="radial-item item-left" data-action="chat" title="Chat (Enter)">
          <span class="radial-icon">💬</span>
          <span class="radial-label">Chat</span>
        </button>
      </div>
    `;

    document.getElementById('app').appendChild(this.element);
    this.attachEvents();
  }

  attachEvents() {
    const wheel = this.element.querySelector('#radial-wheel');

    // Bloquear fechamento ao clicar fora da roda
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) {
        this.close();
      }
    });

    const items = this.element.querySelectorAll('.radial-item');
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

    const wheel = this.element.querySelector('#radial-wheel');
    const clampedX = Math.max(120, Math.min(window.innerWidth - 120, x));
    const clampedY = Math.max(120, Math.min(window.innerHeight - 120, y));

    wheel.style.left = `${clampedX}px`;
    wheel.style.top = `${clampedY}px`;
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
