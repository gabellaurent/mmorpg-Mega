// Editor de Sprites & Pixel Art em HTML5 Canvas para o MMORPG
import { CONFIG } from '../config.js';
import { spriteGen } from '../engine/spriteGenerator.js';
import { supabase } from '../services/supabaseClient.js';

class SpriteEditorApp {
  constructor() {
    this.gridSize = 32; // Resolução da grade de edição (32x32 pixels)
    this.canvasDisplaySize = 384; // Tamanho visual da tela de desenho (384x384 px)
    this.pixelSize = this.canvasDisplaySize / this.gridSize; // Tamanho de cada pixel na tela (12px)

    this.pixels = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(null));
    this.currentTool = 'pencil'; // 'pencil', 'bucket', 'eraser', 'picker'
    this.currentColor = '#48bb78';
    this.isMouseDown = false;

    // Suporte a Spritesheets de Personagem (4x3 = 12 Quadros em Memória)
    this.isMultiFrame = false;
    this.selectedCol = 0; // 0: South (Sul), 1: North (Norte), 2: East (Leste), 3: West (Oeste)
    this.selectedRow = 0; // 0: Parado, 1: Passo 1, 2: Passo 2

    // Matriz de 12 quadros [4 cols][3 rows][32][32]
    this.framesData = Array(4).fill(null).map(() => 
      Array(3).fill(null).map(() => 
        Array(32).fill(null).map(() => Array(32).fill(null))
      )
    );

    this.fullCanvas = document.createElement('canvas');
    this.fullCanvas.width = 192;
    this.fullCanvas.height = 144;
    this.fullCtx = this.fullCanvas.getContext('2d');

    // Animação Live Preview
    this.previewFrameIndex = 0;
    this.lastAnimTime = 0;

    this.paletteColors = [
      '#5d4037', '#3e2723', '#795548', '#8d6e63', '#26140e', // Terrosos/Caverna
      '#48bb78', '#38a169', '#2f855a', '#276749', '#1c4532', // Grama/Vegetação
      '#ecc94b', '#d69e2e', '#b7791f', '#d69e2e', '#e9d8a6', // Ouro/Flores
      '#e53e3e', '#c53030', '#9b2c2c', '#742a2a', '#feb2b2', // Vermelhos/Monstros
      '#4299e1', '#3182ce', '#2b6cb0', '#9f7aea', '#805ad5', // Azuis e Roxos
      '#ffffff', '#cbd5e0', '#718096', '#2d3748', '#000000'  // Metais/Cinzas
    ];

    spriteGen.init();

    this.initDOM();
    this.initPalette();
    this.initEvents();
    this.loadSpritePreset('grass_0');

    // Iniciar loop de animação do Live Preview
    requestAnimationFrame((t) => this.animLoop(t));
  }

  initDOM() {
    this.spriteSelect = document.getElementById('sprite-select');
    this.pixelCanvas = document.getElementById('pixel-canvas');
    this.ctx = this.pixelCanvas.getContext('2d');

    this.preview1x = document.getElementById('preview-1x');
    this.ctx1x = this.preview1x.getContext('2d');

    this.preview2x = document.getElementById('preview-2x');
    this.ctx2x = this.preview2x.getContext('2d');

    this.colorInput = document.getElementById('color-input');
    this.colorHex = document.getElementById('color-hex');
    this.paletteContainer = document.getElementById('palette');

    this.btnPencil = document.getElementById('tool-pencil');
    this.btnBucket = document.getElementById('tool-bucket');
    this.btnEraser = document.getElementById('tool-eraser');
    this.btnPicker = document.getElementById('tool-picker');

    this.btnApplyGame = document.getElementById('btn-apply-game');
    this.btnDownload = document.getElementById('btn-download');
    this.btnCopyCode = document.getElementById('btn-copy-code');
    this.btnResetSprite = document.getElementById('btn-reset-sprite');
    this.btnClear = document.getElementById('btn-clear');

    this.frameSelectorGroup = document.getElementById('frame-selector-group');
    this.frameButtonsGrid = document.getElementById('frame-buttons-grid');
  }

  initPalette() {
    this.paletteContainer.innerHTML = '';
    this.paletteColors.forEach(color => {
      const swatch = document.createElement('div');
      swatch.className = 'swatch';
      swatch.style.backgroundColor = color;
      swatch.addEventListener('click', () => {
        this.setColor(color);
      });
      this.paletteContainer.appendChild(swatch);
    });
  }

  setColor(hex) {
    this.currentColor = hex;
    this.colorInput.value = hex;
    this.colorHex.innerText = hex.toUpperCase();
  }

  setTool(toolName) {
    this.currentTool = toolName;
    [this.btnPencil, this.btnBucket, this.btnEraser, this.btnPicker].forEach(btn => {
      btn.classList.remove('active');
    });

    if (toolName === 'pencil') this.btnPencil.classList.add('active');
    if (toolName === 'bucket') this.btnBucket.classList.add('active');
    if (toolName === 'eraser') this.btnEraser.classList.add('active');
    if (toolName === 'picker') this.btnPicker.classList.add('active');
  }

  initEvents() {
    this.spriteSelect.addEventListener('change', (e) => {
      this.loadSpritePreset(e.target.value);
    });

    this.colorInput.addEventListener('input', (e) => {
      this.setColor(e.target.value);
    });

    this.btnPencil.addEventListener('click', () => this.setTool('pencil'));
    this.btnBucket.addEventListener('click', () => this.setTool('bucket'));
    this.btnEraser.addEventListener('click', () => this.setTool('eraser'));
    this.btnPicker.addEventListener('click', () => this.setTool('picker'));

    this.pixelCanvas.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
      this.handleCanvasClick(e);
    });

    this.pixelCanvas.addEventListener('mousemove', (e) => {
      if (this.isMouseDown) {
        this.handleCanvasClick(e);
      }
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    this.btnApplyGame.addEventListener('click', () => this.applyToGame());
    this.btnDownload.addEventListener('click', () => this.downloadPNG());
    this.btnCopyCode.addEventListener('click', () => this.copyDataURI());
    this.btnResetSprite.addEventListener('click', () => this.resetSprite());
    this.btnClear.addEventListener('click', () => this.clearCanvas());
  }

  getGridCoords(e) {
    const rect = this.pixelCanvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / (rect.width / this.gridSize));
    const y = Math.floor((e.clientY - rect.top) / (rect.height / this.gridSize));
    return {
      x: Math.max(0, Math.min(this.gridSize - 1, x)),
      y: Math.max(0, Math.min(this.gridSize - 1, y))
    };
  }

  handleCanvasClick(e) {
    const { x, y } = this.getGridCoords(e);

    if (this.currentTool === 'pencil') {
      this.pixels[y][x] = this.currentColor;
    } else if (this.currentTool === 'eraser') {
      this.pixels[y][x] = null;
    } else if (this.currentTool === 'picker') {
      if (this.pixels[y][x]) {
        this.setColor(this.pixels[y][x]);
        this.setTool('pencil');
      }
    } else if (this.currentTool === 'bucket') {
      const targetColor = this.pixels[y][x];
      this.floodFill(x, y, targetColor, this.currentColor);
    }

    this.syncCurrentFrameToFullCanvas();
    this.render();
  }

  floodFill(startX, startY, targetColor, replacementColor) {
    if (targetColor === replacementColor) return;
    const queue = [{ x: startX, y: startY }];

    while (queue.length > 0) {
      const { x, y } = queue.pop();
      if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) continue;
      if (this.pixels[y][x] !== targetColor) continue;

      this.pixels[y][x] = replacementColor;
      queue.push({ x: x + 1, y });
      queue.push({ x: x - 1, y });
      queue.push({ x, y: y + 1 });
      queue.push({ x, y: y - 1 });
    }
  }

  loadSpritePreset(key) {
    const canvas = spriteGen.get(key);
    if (!canvas) return;

    // Checar se é uma Spritesheet Multi-Quadro (Personagens ou NPCs 4x3)
    if (canvas.width >= 192 && canvas.height >= 144) {
      this.isMultiFrame = true;
      if (this.frameSelectorGroup) this.frameSelectorGroup.style.display = 'block';

      // Copiar a spritesheet completa para o canvas offscreen
      this.fullCanvas.width = canvas.width;
      this.fullCanvas.height = canvas.height;
      this.fullCtx.clearRect(0, 0, canvas.width, canvas.height);
      this.fullCtx.drawImage(canvas, 0, 0);

      const frameWidth = Math.floor(canvas.width / 4);
      const frameHeight = Math.floor(canvas.height / 3);

      // Amostrar os 12 quadros para a memória this.framesData[col][row][32][32]
      for (let c = 0; c < 4; c++) {
        for (let r = 0; r < 3; r++) {
          const offsetX = c * frameWidth;
          const offsetY = r * frameHeight;
          const imgData = this.fullCtx.getImageData(offsetX, offsetY, frameWidth, frameHeight);

          for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
              const srcX = Math.floor(x * (frameWidth / this.gridSize));
              const srcY = Math.floor(y * (frameHeight / this.gridSize));
              const idx = (srcY * frameWidth + srcX) * 4;

              const red = imgData.data[idx];
              const green = imgData.data[idx + 1];
              const blue = imgData.data[idx + 2];
              const alpha = imgData.data[idx + 3];

              if (alpha > 10) {
                const hex = `#${((1 << 24) + (red << 16) + (green << 8) + blue).toString(16).slice(1)}`;
                this.framesData[c][r][y][x] = hex;
              } else {
                this.framesData[c][r][y][x] = null;
              }
            }
          }
        }
      }

      this.selectedCol = 0; // Sul
      this.selectedRow = 0; // Parado
      this.pixels = this.framesData[0][0];
      this.renderFrameSelectorGrid();
      this.syncCurrentFrameToFullCanvas();
      this.render();
    } else {
      this.isMultiFrame = false;
      if (this.frameSelectorGroup) this.frameSelectorGroup.style.display = 'none';

      const tempCtx = canvas.getContext('2d');
      const imgData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);

      for (let y = 0; y < this.gridSize; y++) {
        for (let x = 0; x < this.gridSize; x++) {
          const srcX = Math.floor(x * (canvas.width / this.gridSize));
          const srcY = Math.floor(y * (canvas.height / this.gridSize));
          const idx = (srcY * canvas.width + srcX) * 4;

          const r = imgData.data[idx];
          const g = imgData.data[idx + 1];
          const b = imgData.data[idx + 2];
          const a = imgData.data[idx + 3];

          if (a > 10) {
            const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
            this.pixels[y][x] = hex;
          } else {
            this.pixels[y][x] = null;
          }
        }
      }
      this.render();
    }
  }

  renderFrameSelectorGrid() {
    if (!this.frameButtonsGrid) return;
    this.frameButtonsGrid.innerHTML = '';

    const directions = [
      { col: 0, label: '⬇️ Sul', icon: '⬇️' },
      { col: 1, label: '⬆️ Norte', icon: '⬆️' },
      { col: 2, label: '➡️ Leste', icon: '➡️' },
      { col: 3, label: '⬅️ Oeste', icon: '⬅️' }
    ];

    const frames = [
      { row: 0, label: 'Parado' },
      { row: 1, label: 'Passo 1' },
      { row: 2, label: 'Passo 2' }
    ];

    directions.forEach(dir => {
      frames.forEach(fr => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-tool';
        btn.style.padding = '4px 6px';
        btn.style.fontSize = '0.75rem';
        btn.innerText = `${dir.icon} ${fr.label}`;

        if (this.selectedCol === dir.col && this.selectedRow === fr.row) {
          btn.classList.add('active');
        }

        btn.addEventListener('click', () => {
          this.switchSubFrame(dir.col, fr.row);
        });

        this.frameButtonsGrid.appendChild(btn);
      });
    });
  }

  switchSubFrame(col, row) {
    this.selectedCol = col;
    this.selectedRow = row;
    this.pixels = this.framesData[col][row];
    this.renderFrameSelectorGrid();
    this.syncCurrentFrameToFullCanvas();
    this.render();
  }

  syncCurrentFrameToFullCanvas() {
    if (!this.isMultiFrame) return;

    const frameWidth = Math.floor(this.fullCanvas.width / 4);
    const frameHeight = Math.floor(this.fullCanvas.height / 3);
    const scaleX = frameWidth / this.gridSize;
    const scaleY = frameHeight / this.gridSize;

    this.fullCtx.clearRect(0, 0, this.fullCanvas.width, this.fullCanvas.height);

    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 3; r++) {
        const offsetX = c * frameWidth;
        const offsetY = r * frameHeight;

        for (let y = 0; y < this.gridSize; y++) {
          for (let x = 0; x < this.gridSize; x++) {
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

  clearCanvas() {
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        this.pixels[y][x] = null;
      }
    }
    this.syncCurrentFrameToFullCanvas();
    this.render();
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvasDisplaySize, this.canvasDisplaySize);

    // 1. Fundo xadrez de transparência
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        this.ctx.fillStyle = (x + y) % 2 === 0 ? '#26292e' : '#1a1d21';
        this.ctx.fillRect(x * this.pixelSize, y * this.pixelSize, this.pixelSize, this.pixelSize);
      }
    }

    // 2. Desenhar pixels pintados
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        if (this.pixels[y][x]) {
          this.ctx.fillStyle = this.pixels[y][x];
          this.ctx.fillRect(x * this.pixelSize, y * this.pixelSize, this.pixelSize, this.pixelSize);
        }
      }
    }

    // 3. Desenhar grade de guia
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= this.gridSize; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(i * this.pixelSize, 0);
      this.ctx.lineTo(i * this.pixelSize, this.canvasDisplaySize);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(0, i * this.pixelSize);
      this.ctx.lineTo(this.canvasDisplaySize, i * this.pixelSize);
      this.ctx.stroke();
    }

    this.updatePreviews();
  }

  animLoop(timestamp) {
    if (timestamp - this.lastAnimTime > CONFIG.ANIMATION_FRAME_MS) {
      this.lastAnimTime = timestamp;
      this.previewFrameIndex = (this.previewFrameIndex + 1) % 3;
      this.updatePreviews();
    }
    requestAnimationFrame((t) => this.animLoop(t));
  }

  updatePreviews() {
    this.ctx1x.imageSmoothingEnabled = false;
    this.ctx2x.imageSmoothingEnabled = false;

    this.ctx1x.clearRect(0, 0, 48, 48);
    this.ctx2x.clearRect(0, 0, 96, 96);

    if (this.isMultiFrame) {
      // Pré-visualização com animação do personagem caminhando em tempo real
      const frameWidth = Math.floor(this.fullCanvas.width / 4);
      const frameHeight = Math.floor(this.fullCanvas.height / 3);

      const srcX = this.selectedCol * frameWidth;
      const srcY = this.previewFrameIndex * frameHeight;

      this.ctx1x.drawImage(this.fullCanvas, srcX, srcY, frameWidth, frameHeight, 0, 0, 48, 48);
      this.ctx2x.drawImage(this.fullCanvas, srcX, srcY, frameWidth, frameHeight, 0, 0, 96, 96);
    } else {
      const scale1 = 48 / this.gridSize;
      const scale2 = 96 / this.gridSize;

      for (let y = 0; y < this.gridSize; y++) {
        for (let x = 0; x < this.gridSize; x++) {
          if (this.pixels[y][x]) {
            this.ctx1x.fillStyle = this.pixels[y][x];
            this.ctx1x.fillRect(Math.floor(x * scale1), Math.floor(y * scale1), Math.ceil(scale1), Math.ceil(scale1));

            this.ctx2x.fillStyle = this.pixels[y][x];
            this.ctx2x.fillRect(Math.floor(x * scale2), Math.floor(y * scale2), Math.ceil(scale2), Math.ceil(scale2));
          }
        }
      }
    }
  }

  async applyToGame() {
    this.syncCurrentFrameToFullCanvas();
    const key = this.spriteSelect.value;
    if (!key) return;

    try {
      const saved = localStorage.getItem('mmorpg_custom_sprites');
      const dict = saved ? JSON.parse(saved) : {};

      let dataUrl = '';
      if (this.isMultiFrame) {
        dataUrl = this.fullCanvas.toDataURL('image/png');
      } else {
        dataUrl = this.preview1x.toDataURL('image/png');
      }

      dict[key] = dataUrl;
      localStorage.setItem('mmorpg_custom_sprites', JSON.stringify(dict));

      // Sincronizar com o Banco de Dados Global Supabase (Tabela custom_sprites)
      if (supabase) {
        await supabase
          .from('custom_sprites')
          .upsert({
            sprite_key: key,
            data_url: dataUrl,
            updated_at: new Date().toISOString()
          });
      }

      // Atualizar o cache de sprites do jogo
      spriteGen.init();

      alert(`🚀 SPRITE '${key}' APLICADO COM SUCESSO E SALVO NO BANCO DE DADOS GLOBAL!\n\nTodos os jogadores que entrarem no jogo verão este sprite customizado!`);
    } catch (e) {
      console.error('Erro ao salvar sprite customizado:', e);
      alert('Erro ao salvar sprite no jogo.');
    }
  }

  async resetSprite() {
    const key = this.spriteSelect.value;
    if (!key) return;

    if (confirm(`Deseja restaurar o sprite '${key}' para o visual pixel-art original do jogo?`)) {
      try {
        const saved = localStorage.getItem('mmorpg_custom_sprites');
        if (saved) {
          const dict = JSON.parse(saved);
          delete dict[key];
          localStorage.setItem('mmorpg_custom_sprites', JSON.stringify(dict));
        }

        if (supabase) {
          await supabase
            .from('custom_sprites')
            .delete()
            .eq('sprite_key', key);
        }

        spriteGen.init();
        this.loadSpritePreset(key);
        alert(`↺ Sprite '${key}' restaurado ao visual original.`);
      } catch (e) {
        console.error('Erro ao restaurar sprite:', e);
      }
    }
  }

  downloadPNG() {
    this.syncCurrentFrameToFullCanvas();
    const link = document.createElement('a');
    const spriteName = this.spriteSelect.value || 'custom_sprite';
    link.download = `${spriteName}.png`;
    link.href = this.isMultiFrame ? this.fullCanvas.toDataURL('image/png') : this.preview1x.toDataURL('image/png');
    link.click();
  }

  copyDataURI() {
    this.syncCurrentFrameToFullCanvas();
    const dataUri = this.isMultiFrame ? this.fullCanvas.toDataURL('image/png') : this.preview1x.toDataURL('image/png');
    navigator.clipboard.writeText(dataUri).then(() => {
      alert('✅ Código DataURI do sprite completo copiado para a área de transferência!');
    }).catch(err => {
      prompt('Copie o código DataURI:', dataUri);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new SpriteEditorApp();
});
