// Interface do Usuário: Login, Cadastro e Criação de Personagem
import { supabase, isSupabaseConfigured } from '../services/supabaseClient.js';
import { CONFIG } from '../config.js';

export class AuthUI {
  constructor(onStartGame, onLoginAccount) {
    this.onStartGame = onStartGame;
    this.onLoginAccount = onLoginAccount;
    this.container = document.getElementById('auth-container');
    this.currentTab = 'guest';
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
          🟢 <strong>Rede Multiplayer Ativa:</strong> Jogue como visitante ou faça login para carregar seu progresso salvo!
        </div>

        <div class="auth-tabs">
          <button type="button" class="auth-tab ${this.currentTab === 'guest' ? 'active' : ''}" id="tab-guest">
            🚀 Novo Herói (Visitante)
          </button>
          <button type="button" class="auth-tab ${this.currentTab === 'login' ? 'active' : ''}" id="tab-login">
            🔑 Já Tenho Conta
          </button>
        </div>

        <div id="auth-forms">
          <!-- Formulário Visitante -->
          <div id="form-guest" class="${this.currentTab === 'guest' ? '' : 'hidden'}" style="${this.currentTab === 'guest' ? 'display: block;' : 'display: none;'}">
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

            <button id="btn-enter-game" class="btn-primary" style="width: 100%;">ENTRAR NO MUNDO</button>
          </div>

          <!-- Formulário Login -->
          <div id="form-login" class="${this.currentTab === 'login' ? '' : 'hidden'}" style="${this.currentTab === 'login' ? 'display: block;' : 'display: none;'}">
            <div class="form-group">
              <label>Nome de Usuário</label>
              <input type="text" id="login-username-input" placeholder="Seu nome de usuário cadastrado" maxlength="20" required />
            </div>

            <div class="form-group">
              <label>Senha</label>
              <input type="password" id="login-password-input" placeholder="Sua senha secreta" maxlength="32" required />
            </div>

            <div id="login-error-msg" class="auth-error-msg hidden" style="color: #f56565; margin-bottom: 12px; font-weight: bold; font-size: 13px;"></div>

            <button id="btn-login-account" class="btn-primary" style="width: 100%;">CARREGAR PERSONAGEM</button>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const tabGuest = this.container.querySelector('#tab-guest');
    const tabLogin = this.container.querySelector('#tab-login');
    const formGuest = this.container.querySelector('#form-guest');
    const formLogin = this.container.querySelector('#form-login');

    tabGuest.addEventListener('click', () => {
      this.currentTab = 'guest';
      tabGuest.classList.add('active');
      tabLogin.classList.remove('active');
      formGuest.classList.remove('hidden');
      formGuest.style.display = 'block';
      formLogin.classList.add('hidden');
      formLogin.style.display = 'none';
    });

    tabLogin.addEventListener('click', () => {
      this.currentTab = 'login';
      tabLogin.classList.add('active');
      tabGuest.classList.remove('active');
      formLogin.classList.remove('hidden');
      formLogin.style.display = 'block';
      formGuest.classList.add('hidden');
      formGuest.style.display = 'none';
    });

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

      const spawnX = 14 + Math.floor(Math.random() * 5);
      const spawnY = 14 + Math.floor(Math.random() * 5);

      this.hide();

      this.onStartGame({
        name,
        spriteId,
        x: spawnX,
        y: spawnY,
        isRegistered: false
      });
    });

    const loginBtn = this.container.querySelector('#btn-login-account');
    const errorMsg = this.container.querySelector('#login-error-msg');

    loginBtn.addEventListener('click', async () => {
      const username = this.container.querySelector('#login-username-input').value.trim();
      const password = this.container.querySelector('#login-password-input').value.trim();

      if (!username || !password) {
        errorMsg.textContent = 'Preencha o nome de usuário e a senha.';
        errorMsg.classList.remove('hidden');
        return;
      }

      loginBtn.disabled = true;
      loginBtn.textContent = 'Carregando...';
      errorMsg.classList.add('hidden');

      if (this.onLoginAccount) {
        const result = await this.onLoginAccount(username, password);
        if (result && result.success) {
          this.hide();
          this.onStartGame({
            dbId: result.playerData.id,
            name: result.playerData.username,
            spriteId: result.playerData.sprite_id || 'knight',
            level: result.playerData.level || 1,
            xp: Number(result.playerData.experience || 0),
            hp: result.playerData.hp || 100,
            maxHp: 100 + ((result.playerData.level || 1) - 1) * 20,
            gold: Number(result.playerData.gold || 0),
            inventory: result.playerData.inventory || Array(24).fill(null),
            x: result.playerData.x || 16,
            y: result.playerData.y || 16,
            isRegistered: true
          });
        } else {
          errorMsg.textContent = result?.message || 'Falha ao autenticar.';
          errorMsg.classList.remove('hidden');
          loginBtn.disabled = false;
          loginBtn.textContent = 'CARREGAR PERSONAGEM';
        }
      }
    });
  }

  hide() {
    this.container.classList.add('hidden');
    this.container.style.display = 'none';
  }
}
