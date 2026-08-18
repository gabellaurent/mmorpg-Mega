// Interface do Jogo (HUD, Chat em Tempo Real, XP e Minimapa Radar)
import { CONFIG } from '../config.js';

export class HudUI {
  constructor(localPlayer, onSendChat, onToggleGrid, onAttack) {
    this.localPlayer = localPlayer;
    this.onSendChat = onSendChat;
    this.onToggleGrid = onToggleGrid;
    this.onAttack = onAttack;

    this.container = document.getElementById('hud-container');
    this.remotePlayersMap = new Map();
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <!-- Top Left: Card do Jogador Local -->
      <div class="hud-card player-stats-card">
        <div class="player-avatar" id="hud-avatar">⚔️</div>
        <div class="player-info">
          <div class="player-title">
            <span id="hud-player-name">--</span>
            <span class="badge-lvl" id="hud-player-lvl">Lvl.1</span>
          </div>
          
          <!-- Barra de HP -->
          <div class="hp-bar-container">
            <div class="hp-bar-fill" id="hud-hp-fill" style="width: 100%;"></div>
            <span class="hp-text" id="hud-hp-text">100 / 100</span>
          </div>

          <!-- Barra de EXP -->
          <div class="xp-bar-container">
            <div class="xp-bar-fill" id="hud-xp-fill" style="width: 0%;"></div>
            <span class="xp-text" id="hud-xp-text">XP: 0 / 50</span>
          </div>

          <div class="coords-info">
            <span>📍 X:<strong id="hud-coord-x">16</strong> Y:<strong id="hud-coord-y">16</strong></span>
            <button id="btn-attack-action" class="btn-attack-sm">⚔️ Atacar (ESPAÇO)</button>
          </div>
        </div>
      </div>

      <!-- Top Right: Minimapa Radar & Jogadores Online -->
      <div class="hud-card online-players-card">
        <div class="card-header">
          <span>👥 Online (<strong id="online-count">1</strong>)</span>
          <button id="btn-toggle-grid" class="btn-sm">📐 Grade</button>
        </div>
        
        <div class="minimap-container">
          <canvas id="minimap-canvas" width="128" height="128"></canvas>
        </div>

        <ul class="online-list" id="online-list">
          <li class="you">👑 ${this.localPlayer.name} (Você)</li>
        </ul>
      </div>

      <!-- Bottom Left: Chat Global em Tempo Real -->
      <div class="hud-card chat-card">
        <div class="chat-messages" id="chat-messages">
          <div class="chat-msg system">🎮 <strong>Clique ou toque na tela</strong> para andar em direção ao ponto (1 passo a cada 0.5s). Pressione <strong>ESPAÇO</strong> para atacar!</div>
        </div>
        <form class="chat-input-form" id="chat-form">
          <input type="text" id="chat-input" placeholder="Digite uma mensagem..." maxlength="80" autocomplete="off" />
          <button type="submit" class="btn-send">Enviar</button>
        </form>
      </div>
    `;

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
    });

    const toggleGridBtn = this.container.querySelector('#btn-toggle-grid');
    toggleGridBtn.addEventListener('click', () => {
      this.onToggleGrid();
    });

    const attackBtn = this.container.querySelector('#btn-attack-action');
    if (attackBtn) {
      attackBtn.addEventListener('click', () => {
        this.onAttack();
      });
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

    this.renderMinimap();
  }

  addChatMessage(sender, text, isSystem = false) {
    const chatMsgs = this.container.querySelector('#chat-messages');
    if (!chatMsgs) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${isSystem ? 'system' : ''}`;
    
    if (isSystem) {
      msgDiv.innerHTML = text;
    } else {
      msgDiv.innerHTML = `<strong>${sender}:</strong> ${this.escapeHtml(text)}`;
    }

    chatMsgs.appendChild(msgDiv);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
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
}
