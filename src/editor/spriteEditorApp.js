// Editor de Sprites & Pixel Art em HTML5 Canvas para o MMORPG
import { CONFIG } from '../config.js';
import { spriteGen } from '../engine/spriteGenerator.js';

class SpriteEditorApp {
  constructor() {
    this.gridSize = 32; // Resolução da grade de edição (32x32 pixels)
    this.canvasDisplaySize = 384; // Tamanho visual da tela de desenho (384x384 px)
    this.pixelSize = this.canvasDisplaySize / this.gridSize; // Tamanho de cada pixel na tela (12px)

    this.pixels = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(null));
    this.currentTool = 'pencil'; // 'pencil', 'bucket', 'eraser', 'picker'
    this.currentColor = '#48bb78';
    this.isMouseDown = false;

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
      if (this.isMouseDown && (this.currentTool === 'pencil' || this.currentTool === 'eraser')) {
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

  applyToGame() {
    const key = this.spriteSelect.value;
    const dataUri = this.preview1x.toDataURL('image/png');
    spriteGen.saveCustomSprite(key, dataUri);
    alert(`🚀 Sprite '${key}' APLICADO COM SUCESSO NO SEU JOGO!\n\nSua arte personalizada já está salva no navegador e será exibida ao voltar para o jogo!`);
  }

  resetSprite() {
    const key = this.spriteSelect.value;
    if (confirm(`Deseja restaurar o sprite padrão de '${key}'?`)) {
      spriteGen.resetCustomSprite(key);
      this.loadSpritePreset(key);
      alert(`↺ Sprite '${key}' restaurado para o padrão original.`);
    }
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
      this.render();
    } else if (this.currentTool === 'eraser') {
      this.pixels[y][x] = null;
      this.render();
    } else if (this.currentTool === 'picker') {
      if (this.pixels[y][x]) {
        this.setColor(this.pixels[y][x]);
        this.setTool('pencil');
      }
    } else if (this.currentTool === 'bucket') {
      const targetColor = this.pixels[y][x];
      this.floodFill(x, y, targetColor, this.currentColor);
      this.render();
    }
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

  clearCanvas() {
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        this.pixels[y][x] = null;
      }
    }
    this.render();
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvasDisplaySize, this.canvasDisplaySize);

    // 1. Desenhar fundo xadrez indicador de transparência (Estilo Photoshop / Aseprite)
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

    // 3. Desenhar grade de guia visual
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

  updatePreviews() {
    const size = 48;
    this.ctx1x.imageSmoothingEnabled = false;
    this.ctx2x.imageSmoothingEnabled = false;

    this.ctx1x.clearRect(0, 0, 48, 48);
    this.ctx2x.clearRect(0, 0, 96, 96);

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

  downloadPNG() {
    const link = document.createElement('a');
    const spriteName = this.spriteSelect.value || 'custom_sprite';
    link.download = `${spriteName}.png`;
    link.href = this.preview1x.toDataURL('image/png');
    link.click();
  }

  copyDataURI() {
    const dataUri = this.preview1x.toDataURL('image/png');
    navigator.clipboard.writeText(dataUri).then(() => {
      alert('✅ Código DataURI copiado para a sua área de transferência!');
    }).catch(err => {
      prompt('Copie o código DataURI do sprite:', dataUri);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new SpriteEditorApp();
});
