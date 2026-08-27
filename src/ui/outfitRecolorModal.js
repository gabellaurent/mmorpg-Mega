// Componente In-Game de Personalização de Cores do Outfit (Estilo Tibia RPG)
import { spriteGen } from '../engine/spriteGenerator.js';
import { supabase } from '../services/supabaseClient.js';

export class OutfitRecolorModal {
  constructor(networkManager) {
    this.networkManager = networkManager;
    this.localPlayer = null;
    this.isOpen = false;
    this.element = null;

    this.currentColor = '#e53e3e';
    this.selectedCol = 0; // 0: South, 1: North, 2: East, 3: West
    this.selectedRow = 0; // 0: Parado, 1: Passo 1, 2: Passo 2
    this.isMouseDown = false;

    // Matriz de cores [4 cols][3 rows][32][32]
    this.framesData = Array(4).fill(null).map(() => 
      Array(3).fill(null).map(() => 
        Array(32).fill(null).map(() => Array(32).fill(null))
      )
    );

    this.fullCanvas = document.createElement('canvas');
    this.fullCanvas.width = 192;
    this.fullCanvas.height = 144;
    this.fullCtx = this.fullCanvas.getContext('2d');

    this.paletteColors = [
      '#e53e3e', '#c53030', '#9b2c2c', // Vermelhos
      '#ecc94b', '#d69e2e', '#b7791f', // Dourado/Amarelo
      '#48bb78', '#38a169', '#2f855a', // Verdes
      '#4299e1', '#3182ce', '#2b6cb0', // Azuis
      '#9f7aea', '#805ad5', '#6b46c1', // Roxos
      '#ffffff', '#cbd5e0', '#718096', '#2d3748', '#000000', // Escalas de Cinza
      '#5d4037', '#8d6e63', '#d4a373'  // Terrosos/Couro
    ];

    this.previewFrameIndex = 0;
    this.lastAnimTime = 0;

    this.init();
  }

  init() {
    this.element = document.createElement('div');
    this.element.id = 'outfit-modal-overlay';
    this.element.style.cssText = `
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.75);
      z-index: 900;
      align-items: center;
      justify-content: center;
      font-family: monospace, sans-serif;
    `;

    this.element.innerHTML = `
      <div style="background: #161b22; border: 2px solid #30363d; border-radius: 12px; padding: 20px; width: 440px; max-width: 95%; color: #c9d1d9; box-shadow: 0 10px 30px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #30363d; padding-bottom: 8px;">
          <h3 style="margin: 0; color: #ecc94b; display: flex; align-items: center; gap: 8px;">🎨 Customizar Cores do Outfit</h3>
          <button id="outfit-close-btn" style="background: none; border: none; color: #8b949e; font-size: 1.2rem; cursor: pointer;">✕</button>
        </div>

        <div style="font-size: 0.75rem; color: #8b949e; background: #0d1117; padding: 8px; border-radius: 6px; border: 1px solid #21262d;">
          💡 <strong>Regras de Recolorização:</strong> Altere apenas as cores dos pixels existentes. O contorno e a transparência do personagem são protegidos e nunca serão apagados.
        </div>

        <!-- Seletor de Quadro de Animação (1 de 12) -->
        <div style="background: #0d1117; padding: 8px; border-radius: 6px; border: 1px solid #21262d;">
          <div style="font-size: 0.75rem; color: #4299e1; font-weight: bold; margin-bottom: 4px;">🎬 Quadro de Recolorização (1 de 12):</div>
          <div id="outfit-frame-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px;"></div>
        </div>

        <div style="display: flex; gap: 16px; align-items: center; justify-content: center;">
          <!-- Canvas de Pinta-Pixels 32x32 -->
          <div style="text-align: center;">
            <canvas id="outfit-pixel-canvas" width="224" height="224" style="border: 2px solid #30363d; border-radius: 8px; cursor: crosshair; background: #1a1d21;"></canvas>
            <div style="font-size: 0.7rem; color: #8b949e; margin-top: 2px;">Clique/Arraste para recolorir</div>
          </div>

          <!-- Preview Live de Caminhada -->
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; background: #0d1117; padding: 12px; border-radius: 8px; border: 1px solid #21262d;">
            <div style="font-size: 0.75rem; font-weight: bold; color: #8b949e;">👁️ Animação Live:</div>
            <canvas id="outfit-preview-canvas" width="64" height="64" style="image-rendering: pixelated;"></canvas>
            <div style="font-size: 0.7rem; color: #48bb78; font-weight: bold;">Caminhando ⏩</div>
          </div>
        </div>

        <!-- Seletor de Cores -->
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 0.8rem; font-weight: bold;">🎨 Cor Selecionada:</span>
            <div style="display: flex; align-items: center; gap: 6px;">
              <input type="color" id="outfit-color-input" value="#e53e3e" style="width: 32px; height: 32px; border: none; cursor: pointer; background: none;">
              <span id="outfit-color-hex" style="font-size: 0.8rem; font-family: monospace; font-weight: bold; color: #e53e3e;">#E53E3E</span>
            </div>
          </div>
          <div id="outfit-palette-grid" style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px;"></div>
        </div>

        <!-- Botões de Ação -->
        <div style="display: flex; justify-content: space-between; gap: 8px; margin-top: 4px;">
          <button id="outfit-reset-btn" style="background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.8rem;">↺ Padrão</button>
          <button id="outfit-save-btn" style="background: #238636; border: 1px solid #2ea043; color: #fff; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.9rem; flex: 1;">💾 Salvar Cores do Outfit</button>
        </div>
      </div>
    `;

    document.getElementById('app').appendChild(this.element);
    this.attachEvents();

    requestAnimationFrame((t) => this.animLoop(t));
  }

  attachEvents() {
    this.element.querySelector('#outfit-close-btn').addEventListener('click', () => this.close());

    this.pixelCanvas = this.element.querySelector('#outfit-pixel-canvas');
    this.ctx = this.pixelCanvas.getContext('2d');

    this.previewCanvas = this.element.querySelector('#outfit-preview-canvas');
    this.previewCtx = this.previewCanvas.getContext('2d');

    this.colorInput = this.element.querySelector('#outfit-color-input');
    this.colorHex = this.element.querySelector('#outfit-color-hex');
    this.paletteContainer = this.element.querySelector('#outfit-palette-grid');

    this.colorInput.addEventListener('input', (e) => this.setColor(e.target.value));

    // Montar Paleta de Cores Rápida
    this.paletteColors.forEach(hex => {
      const swatch = document.createElement('div');
      swatch.style.cssText = `background: ${hex}; height: 20px; border-radius: 4px; cursor: pointer; border: 1px solid rgba(255,255,255,0.1);`;
      swatch.addEventListener('click', () => this.setColor(hex));
      this.paletteContainer.appendChild(swatch);
    });

    // Pinta-Pixels com Proteção Anti-Apagar / Anti-Vazamento
    this.pixelCanvas.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
      this.handlePixelClick(e);
    });

    this.pixelCanvas.addEventListener('mousemove', (e) => {
      if (this.isMouseDown) {
        this.handlePixelClick(e);
      }
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    this.element.querySelector('#outfit-reset-btn').addEventListener('click', () => this.resetToOriginal());
    this.element.querySelector('#outfit-save-btn').addEventListener('click', () => this.saveOutfit());
  }

  setColor(hex) {
    this.currentColor = hex;
    this.colorInput.value = hex;
    this.colorHex.innerText = hex.toUpperCase();
    this.colorHex.style.color = hex;
  }

  getDirectCanvas(key) {
    if (spriteGen.cache && spriteGen.cache[key]) {
      return spriteGen.cache[key];
    }
    return null;
  }

  open(player) {
    this.localPlayer = player;
    this.isOpen = true;
    this.element.style.display = 'flex';

    // Garante que o SpriteGenerator foi inicializado
    if (!spriteGen.initialized) {
      spriteGen.init();
    }

    // 1. Resolver a chave correta da classe do personagem (ex: 'char_knight', 'char_mage', 'char_paladin')
    let baseKey = player.spriteId || 'knight';
    if (!baseKey.startsWith('char_')) {
      baseKey = `char_${baseKey}`;
    }

    // 2. Tentar usar canvas customizado existente, ou fallback para a classe base
    let baseCanvas = null;
    if (player.customSpriteKey) {
      baseCanvas = this.getDirectCanvas(player.customSpriteKey);
    }
    if (!baseCanvas) {
      baseCanvas = this.getDirectCanvas(baseKey);
    }
    if (!baseCanvas) {
      baseCanvas = this.getDirectCanvas('char_knight');
    }

    if (baseCanvas) {
      this.fullCanvas.width = baseCanvas.width;
      this.fullCanvas.height = baseCanvas.height;
      this.fullCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
      this.fullCtx.drawImage(baseCanvas, 0, 0);

      const frameWidth = Math.floor(baseCanvas.width / 4);
      const frameHeight = Math.floor(baseCanvas.height / 3);

      // Amostrar os 12 quadros para a memória this.framesData
      for (let c = 0; c < 4; c++) {
        for (let r = 0; r < 3; r++) {
          const offsetX = c * frameWidth;
          const offsetY = r * frameHeight;
          const imgData = this.fullCtx.getImageData(offsetX, offsetY, frameWidth, frameHeight);

          for (let y = 0; y < 32; y++) {
            for (let x = 0; x < 32; x++) {
              const srcX = Math.floor(x * (frameWidth / 32));
              const srcY = Math.floor(y * (frameHeight / 32));
              const idx = (srcY * frameWidth + srcX) * 4;

              const red = imgData.data[idx];
              const green = imgData.data[idx + 1];
              const blue = imgData.data[idx + 2];
              const alpha = imgData.data[idx + 3];

              if (alpha > 10) {
                const hex = `#${((1 << 24) + (red << 16) + (green << 8) + blue).toString(16).slice(1)}`;
                this.framesData[c][r][y][x] = hex;
              } else {
                this.framesData[c][r][y][x] = null; // Protegido contra pintura vazada
              }
            }
          }
        }
      }
    }

    this.selectedCol = 0; // Sul
    this.selectedRow = 0; // Parado
    this.renderFrameButtons();
    this.renderCanvas();
  }

  close() {
    this.isOpen = false;
    this.element.style.display = 'none';
  }

  renderFrameButtons() {
    const grid = this.element.querySelector('#outfit-frame-grid');
    grid.innerHTML = '';

    const dirs = [
      { col: 0, icon: '⬇️ Sul' },
      { col: 1, icon: '⬆️ Norte' },
      { col: 2, icon: '➡️ Leste' },
      { col: 3, icon: '⬅️ Oeste' }
    ];
    const steps = ['Parado', 'Passo 1', 'Passo 2'];

    dirs.forEach(d => {
      steps.forEach((st, r) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.style.cssText = `background: ${this.selectedCol === d.col && this.selectedRow === r ? '#238636' : '#21262d'}; border: 1px solid #30363d; color: #fff; padding: 4px; font-size: 0.7rem; border-radius: 4px; cursor: pointer;`;
        btn.innerText = `${d.icon.split(' ')[0]} ${st}`;

        btn.addEventListener('click', () => {
          this.selectedCol = d.col;
          this.selectedRow = r;
          this.renderFrameButtons();
          this.renderCanvas();
        });

        grid.appendChild(btn);
      });
    });
  }

  handlePixelClick(e) {
    const rect = this.pixelCanvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / (rect.width / 32));
    const y = Math.floor((e.clientY - rect.top) / (rect.height / 32));

    if (x < 0 || x >= 32 || y < 0 || y >= 32) return;

    // TRAVA ANTI-VAZAMENTO E ANTI-APAGAR:
    // Apenas recolore se o pixel original do personagem EXISTIR (alpha > 10).
    if (this.framesData[this.selectedCol][this.selectedRow][y][x] !== null) {
      this.framesData[this.selectedCol][this.selectedRow][y][x] = this.currentColor;
      this.syncFullCanvas();
      this.renderCanvas();
    }
  }

  syncFullCanvas() {
    const frameWidth = Math.floor(this.fullCanvas.width / 4);
    const frameHeight = Math.floor(this.fullCanvas.height / 3);
    const scaleX = frameWidth / 32;
    const scaleY = frameHeight / 32;

    this.fullCtx.clearRect(0, 0, this.fullCanvas.width, this.fullCanvas.height);

    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 3; r++) {
        const offsetX = c * frameWidth;
        const offsetY = r * frameHeight;

        for (let y = 0; y < 32; y++) {
          for (let x = 0; x < 32; x++) {
            const color = this.framesData[c][r][y][x];
            if (color) {
              this.fullCtx.fillStyle = color;
              this.fullCtx.fillRect(
                offsetX + Math.floor(x * scaleX),
                offsetY + Math.floor(y * scaleY),
                Math.ceil(scaleX),
                Math.ceil(scaleY)
              );
            }
          }
        }
      }
    }
  }

  renderCanvas() {
    if (!this.isOpen) return;

    this.ctx.clearRect(0, 0, 224, 224);
    const pixelSize = 224 / 32;

    // Desenhar Fundo Xadrez de Transparência
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        this.ctx.fillStyle = (x + y) % 2 === 0 ? '#26292e' : '#1a1d21';
        this.ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }

    // Desenhar os Pixels do Quadro Ativo
    const activeFrame = this.framesData[this.selectedCol][this.selectedRow];
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const color = activeFrame[y][x];
        if (color) {
          this.ctx.fillStyle = color;
          this.ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
      }
    }
  }

  animLoop(timestamp) {
    if (this.isOpen && timestamp - this.lastAnimTime > 180) {
      this.lastAnimTime = timestamp;
      this.previewFrameIndex = (this.previewFrameIndex + 1) % 3;
      this.updatePreview();
    }
    requestAnimationFrame((t) => this.animLoop(t));
  }

  updatePreview() {
    if (!this.isOpen || !this.previewCtx) return;

    this.previewCtx.imageSmoothingEnabled = false;
    this.previewCtx.clearRect(0, 0, 64, 64);

    const frameWidth = Math.floor(this.fullCanvas.width / 4);
    const frameHeight = Math.floor(this.fullCanvas.height / 3);

    const srcX = this.selectedCol * frameWidth;
    const srcY = this.previewFrameIndex * frameHeight;

    this.previewCtx.drawImage(this.fullCanvas, srcX, srcY, frameWidth, frameHeight, 0, 0, 64, 64);
  }

  resetToOriginal() {
    if (confirm('Deseja restaurar as cores originais da classe do seu personagem?')) {
      if (this.localPlayer) {
        this.localPlayer.customSpriteKey = null;
      }
      this.open(this.localPlayer);
    }
  }

  async saveOutfit() {
    if (!this.localPlayer) return;

    this.syncFullCanvas();
    const dataUrl = this.fullCanvas.toDataURL('image/png');
    const customKey = `char_${this.localPlayer.spriteId}_custom_${this.localPlayer.id}`;

    // 1. Aplicar ao cache local do gerador de sprites
    spriteGen.applyDataUriToCache(customKey, dataUrl);
    this.localPlayer.customSpriteKey = customKey;

    // 2. Salvar em localStorage
    try {
      localStorage.setItem(`mmorpg_outfit_${this.localPlayer.id}`, dataUrl);
    } catch (e) {}

    // 3. Se for usuário REGISTRADO, salvar no Supabase DB
    const isRegistered = this.localPlayer.isRegistered || !!this.localPlayer.dbId;

    if (isRegistered && supabase) {
      try {
        const updatePayload = {
          outfit_colors: { data_url: dataUrl, updated_at: new Date().toISOString() }
        };

        if (this.localPlayer.dbId) {
          await supabase.from('players').update(updatePayload).eq('id', this.localPlayer.dbId);
        } else if (this.localPlayer.name) {
          await supabase.from('players').update(updatePayload).ilike('username', this.localPlayer.name);
        }

        // Transmitir a todos os outros jogadores via NetworkManager
        if (this.networkManager) {
          this.networkManager.sendMovement({
            outfit_data_url: dataUrl
          });
        }

        alert('✅ CORES DO OUTFIT SALVAS COM SUCESSO NO BANCO DE DADOS CLOUD!\n\nSua personalização está garantida e visível para todos os jogadores!');
      } catch (err) {
        console.error('Erro ao salvar outfit no banco:', err);
        alert('⚠️ Suas cores foram salvas no dispositivo!');
      }
    } else {
      alert('⚠️ Suas cores de outfit foram aplicadas nesta sessão!\n\nPara manter suas cores salvas permanentemente no Servidor Cloud, efetue o Registro do seu personagem no menu de entrada do jogo!');
    }

    this.close();
  }
}
