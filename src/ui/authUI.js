// Interface do Usuário: Login, Cadastro e Criação de Personagem
import { supabase, isSupabaseConfigured } from '../services/supabaseClient.js';
import { CONFIG } from '../config.js';

export class AuthUI {
  constructor(onStartGame) {
    this.onStartGame = onStartGame;
    this.container = document.getElementById('auth-container');
    this.init();
  }

  init() {
    this.renderModal();
  }

  renderModal() {
    const randomHeroNumber = Math.floor(Math.random() * 899 + 100);

    this.container.innerHTML = `
      <div class="auth-box">
        <div class="auth-header">
          <div class="game-logo">⚔️ MMORPG REALTIME</div>
          <p class="game-subtitle">Protótipo Grid-Based 32x32 (Tibia Style)</p>
        </div>

        <div class="sandbox-banner">
          🟢 <strong>Rede Multiplayer Ativa:</strong> Você pode abrir esta URL em <strong>múltiplas abas ou navegadores</strong> para ver os jogadores andando em tempo real!
        </div>

        <div id="auth-forms">
          <div class="form-group">
            <label>Nome do Herói / Personagem</label>
            <input type="text" id="player-name-input" placeholder="Ex: Lord_Kael" value="Heroi_${randomHeroNumber}" maxlength="16" required />
          </div>

          <div class="form-group">
            <label>Selecione sua Classe / Outfit</label>
            <div class="class-selector">
              ${CONFIG.CLASSES.map((cls, idx) => `
                <div class="class-card ${idx === 0 ? 'selected' : ''}" data-class-id="${cls.id}">
                  <div class="class-name">${cls.name}</div>
                  <div class="class-desc">${cls.description}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <button id="btn-enter-game" class="btn-primary">ENTRAR NO MUNDO</button>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const cards = this.container.querySelectorAll('.class-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
      });
    });

    const enterBtn = this.container.querySelector('#btn-enter-game');
    enterBtn.addEventListener('click', () => {
      const nameInput = this.container.querySelector('#player-name-input');
      const name = nameInput.value.trim() || 'Heroi';
      const selectedCard = this.container.querySelector('.class-card.selected');
      const spriteId = selectedCard ? selectedCard.getAttribute('data-class-id') : 'knight';

      // Posição de nascimento aleatória na praça central (para evitar sobreposição de personagens)
      const spawnX = 14 + Math.floor(Math.random() * 5); // 14 a 18
      const spawnY = 14 + Math.floor(Math.random() * 5); // 14 a 18

      this.container.classList.add('hidden');
      this.container.style.display = 'none'; // Esconder completamente da árvore DOM

      this.onStartGame({
        name,
        spriteId,
        x: spawnX,
        y: spawnY
      });
    });
  }
}
