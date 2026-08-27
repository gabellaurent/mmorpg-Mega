// Editor do Mapa do MMORPG (Relevo, Terrenos, Estruturas, NPCs e Spawns de Monstros)
import { CONFIG } from '../config.js';
import { GameMap } from '../engine/map.js';
import { MonsterManager } from '../engine/monsterManager.js';
import { spriteGen } from '../engine/spriteGenerator.js';
import { supabase } from '../services/supabaseClient.js';

class MapEditorApp {
  constructor() {
    this.currentMapId = 'map-1';
    this.selectedTool = 'paint'; // 'paint', 'fill', 'erase'
    this.selectedElement = { category: 'terrain', key: 'grass_0', type: CONFIG.TILE_TYPES.GRASS, isSolid: false };

    this.isMouseDown = false;
    this.spawns = [];
    this.npcs = [];

    this.paletteItems = [
      // Terrenos
      { category: 'terrain', key: 'grass_0', label: 'Grama Verde', type: CONFIG.TILE_TYPES.GRASS, isSolid: false },
      { category: 'terrain', key: 'grass_dry', label: 'Grama Seca', type: CONFIG.TILE_TYPES.GRASS, isSolid: false },
      { category: 'terrain', key: 'grass_dark', label: 'Grama Densa', type: CONFIG.TILE_TYPES.GRASS, isSolid: false },
      { category: 'terrain', key: 'grass_moss', label: 'Grama Musgosa', type: CONFIG.TILE_TYPES.GRASS, isSolid: false },
      { category: 'terrain', key: 'cobble', label: 'Paralelepípedo', type: CONFIG.TILE_TYPES.COBBLE, isSolid: false },
      { category: 'terrain', key: 'dirt', label: 'Trilha de Terra', type: CONFIG.TILE_TYPES.DIRT, isSolid: false },
      { category: 'terrain', key: 'cave_floor', label: 'Caverna Terrosa', type: CONFIG.TILE_TYPES.CAVE_FLOOR, isSolid: false },
      { category: 'terrain', key: 'magma_floor', label: 'Chão Vulcânico', type: CONFIG.TILE_TYPES.MAGMA_FLOOR, isSolid: false },
      { category: 'terrain', key: 'wood_floor', label: 'Piso de Madeira', type: CONFIG.TILE_TYPES.WOOD_FLOOR, isSolid: false },

      // Vegetação Passável
      { category: 'terrain', key: 'flowers_red', label: 'Flores Vermelhas', type: CONFIG.TILE_TYPES.FLOWERS, isSolid: false },
      { category: 'terrain', key: 'flowers_blue', label: 'Flores Azuis', type: CONFIG.TILE_TYPES.FLOWERS, isSolid: false },
      { category: 'terrain', key: 'flowers_purple', label: 'Flores Roxas', type: CONFIG.TILE_TYPES.FLOWERS, isSolid: false },
      { category: 'terrain', key: 'bush_berry', label: 'Amoras Silvestres', type: CONFIG.TILE_TYPES.BUSH, isSolid: false },
      { category: 'terrain', key: 'bush_large', label: 'Arbusto Grande', type: CONFIG.TILE_TYPES.BUSH, isSolid: false },
      { category: 'terrain', key: 'tall_grass', label: 'Grama Alta', type: CONFIG.TILE_TYPES.BUSH, isSolid: false },

      // Estruturas & Obstáculos
      { category: 'terrain', key: 'tree_trunk', label: 'Árvore Verde', type: CONFIG.TILE_TYPES.TREE, isSolid: true, canopyKey: 'tree_canopy' },
      { category: 'terrain', key: 'tree_pine_trunk', label: 'Pinheiro', type: CONFIG.TILE_TYPES.TREE, isSolid: true, canopyKey: 'tree_pine_canopy' },
      { category: 'terrain', key: 'rock', label: 'Rocha Rústica', type: CONFIG.TILE_TYPES.ROCK, isSolid: true },
      { category: 'terrain', key: 'cave_wall', label: 'Parede Caverna', type: CONFIG.TILE_TYPES.CAVE_WALL, isSolid: true },
      { category: 'terrain', key: 'obsidian_wall', label: 'Parede Vulcânica', type: CONFIG.TILE_TYPES.OBSIDIAN_WALL, isSolid: true },
      { category: 'terrain', key: 'wall_wood', label: 'Parede Madeira', type: CONFIG.TILE_TYPES.WALL_WOOD, isSolid: true },
      { category: 'terrain', key: 'cave_hole', label: 'Entrada Caverna', type: CONFIG.TILE_TYPES.CAVE_HOLE, isSolid: false },
      { category: 'terrain', key: 'cave_stairs', label: 'Escada Caverna', type: CONFIG.TILE_TYPES.CAVE_STAIRS, isSolid: false },
      { category: 'terrain', key: 'portal', label: 'Portal Praça', type: CONFIG.TILE_TYPES.PORTAL, isSolid: false },

      // Monstros (Spawns)
      { category: 'spawn', key: 'rat', label: 'Spawn: Cave Rat', monsterType: 'rat' },
      { category: 'spawn', key: 'rotworm', label: 'Spawn: Rotworm', monsterType: 'rotworm' },
      { category: 'spawn', key: 'demon_boss', label: 'Spawn: Guardião Magma', monsterType: 'demon_boss' },

      // NPCs
      { category: 'npc', key: 'npc_guard', label: 'NPC: Guardião Praça', npcType: 'guard' },
      { category: 'npc', key: 'npc_merchant', label: 'NPC: Mestre Elzar', npcType: 'merchant' }
    ];

    spriteGen.init();
    this.initDOM();
    this.initPalette();
    this.initEvents();
    this.loadMap(this.currentMapId);
  }

  initDOM() {
    this.mapSelect = document.getElementById('map-select');
    this.canvas = document.getElementById('map-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.paletteContainer = document.getElementById('palette-grid');
    this.hoverCoords = document.getElementById('hover-coords');
    this.mapStats = document.getElementById('map-stats');

    this.btnPaint = document.getElementById('tool-paint');
    this.btnFill = document.getElementById('tool-fill');
    this.btnErase = document.getElementById('tool-erase');
    this.btnSelect = document.getElementById('tool-select');

    this.btnApplyMap = document.getElementById('btn-apply-map');
    this.btnResetMap = document.getElementById('btn-reset-map');
    this.btnExportJson = document.getElementById('btn-export-json');
    this.btnImportJson = document.getElementById('btn-import-json');
    this.fileImportJson = document.getElementById('file-import-json');

    this.inspectorCoords = document.getElementById('inspector-coords');
    this.inspectorSprite = document.getElementById('inspector-sprite');
    this.inspectorIsSolid = document.getElementById('inspector-is-solid');

    this.teleportTargetMap = document.getElementById('teleport-target-map');
    this.teleportTargetX = document.getElementById('teleport-target-x');
    this.teleportTargetY = document.getElementById('teleport-target-y');
    this.btnSaveTeleport = document.getElementById('btn-save-teleport');
    this.btnRemoveTeleport = document.getElementById('btn-remove-teleport');

    this.btnZoomIn = document.getElementById('btn-zoom-in');
    this.btnZoomOut = document.getElementById('btn-zoom-out');
    this.btnZoomReset = document.getElementById('btn-zoom-reset');
    this.zoomLevelText = document.getElementById('zoom-level-text');

    this.zoomLevel = 1.0;
    this.activeTileCoords = null;
    this.teleports = {};
  }

  initPalette() {
    this.paletteContainer.innerHTML = '';

    this.paletteItems.forEach(item => {
      const opt = document.createElement('div');
      opt.className = `tile-option ${item.key === this.selectedElement.key ? 'selected' : ''}`;

      const iconCanvas = document.createElement('canvas');
      iconCanvas.width = 36;
      iconCanvas.height = 36;
      const iconCtx = iconCanvas.getContext('2d');
      iconCtx.imageSmoothingEnabled = false;

      const spr = spriteGen.get(item.key) || spriteGen.get('grass_0');
      if (spr) {
        iconCtx.drawImage(spr, 0, 0, 36, 36);
      }

      const label = document.createElement('span');
      label.innerText = item.label;

      opt.appendChild(iconCanvas);
      opt.appendChild(label);

      opt.addEventListener('click', () => {
        document.querySelectorAll('.tile-option').forEach(el => el.classList.remove('selected'));
        opt.classList.add('selected');
        this.selectedElement = item;
      });

      this.paletteContainer.appendChild(opt);
    });
  }

  initEvents() {
    this.mapSelect.addEventListener('change', async (e) => {
      this.currentMapId = e.target.value;
      await this.loadMap(this.currentMapId);
    });

    this.btnPaint.addEventListener('click', () => this.setTool('paint'));
    this.btnFill.addEventListener('click', () => this.setTool('fill'));
    this.btnErase.addEventListener('click', () => this.setTool('erase'));
    if (this.btnSelect) {
      this.btnSelect.addEventListener('click', () => this.setTool('select'));
    }

    if (this.inspectorIsSolid) {
      this.inspectorIsSolid.addEventListener('change', (e) => {
        if (this.activeTileCoords) {
          const tile = this.gameMap.getTile(this.activeTileCoords.x, this.activeTileCoords.y);
          if (tile) {
            tile.isSolid = e.target.checked;
            this.render();
          }
        }
      });
    }

    if (this.btnZoomIn) this.btnZoomIn.addEventListener('click', () => this.adjustZoom(0.2));
    if (this.btnZoomOut) this.btnZoomOut.addEventListener('click', () => this.adjustZoom(-0.2));
    if (this.btnZoomReset) this.btnZoomReset.addEventListener('click', () => this.setZoom(1.0));

    this.canvas.parentElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      this.adjustZoom(delta);
    }, { passive: false });

    this.canvas.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
      this.handleCanvasClick(e);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const { x, y } = this.getGridCoords(e);
      this.hoverCoords.innerText = `X: ${x}, Y: ${y}`;
      if (this.isMouseDown && this.selectedTool === 'paint') {
        this.handleCanvasClick(e);
      }
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    this.btnApplyMap.addEventListener('click', () => this.saveCustomMap());
    this.btnResetMap.addEventListener('click', () => this.resetCustomMap());

    if (this.btnExportJson) {
      this.btnExportJson.addEventListener('click', () => this.exportMapJSON());
    }
    if (this.btnImportJson) {
      this.btnImportJson.addEventListener('click', () => this.fileImportJson.click());
    }
    if (this.fileImportJson) {
      this.fileImportJson.addEventListener('change', (e) => this.importMapJSON(e));
    }

    if (this.btnSaveTeleport) {
      this.btnSaveTeleport.addEventListener('click', () => this.saveTeleportForTile());
    }

    if (this.btnRemoveTeleport) {
      this.btnRemoveTeleport.addEventListener('click', () => this.removeTeleportForTile());
    }
  }

  exportMapJSON() {
    const mapData = {
      mapId: this.currentMapId,
      name: this.gameMap.name,
      width: this.width,
      height: this.height,
      grid: this.gameMap.grid,
      spawns: this.spawns,
      npcs: this.npcs,
      teleports: this.teleports
    };
    const jsonStr = JSON.stringify(mapData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.currentMapId}_custom.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importMapJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (data.grid) {
          this.gameMap.grid = data.grid;
          if (data.spawns) this.spawns = data.spawns;
          if (data.npcs) this.npcs = data.npcs;
          if (data.teleports) this.teleports = data.teleports;
          this.render();
          alert(`📥 Mapa '${data.name || this.currentMapId}' IMPORTADO COM SUCESSO!\n\nClique em '🚀 APLICAR E SALVAR MAPA NO JOGO' para salvar no seu jogo.`);
        } else {
          alert('Arquivo JSON inválido.');
        }
      } catch (err) {
        alert('Erro ao ler o arquivo JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  adjustZoom(delta) {
    this.setZoom(Math.max(0.5, Math.min(2.5, this.zoomLevel + delta)));
  }

  setZoom(level) {
    this.zoomLevel = Math.round(level * 10) / 10;
    if (this.zoomLevelText) {
      this.zoomLevelText.innerText = `${Math.round(this.zoomLevel * 100)}%`;
    }
    const displaySize = 600 * this.zoomLevel;
    this.canvas.style.width = `${displaySize}px`;
    this.canvas.style.height = `${displaySize}px`;
  }

  saveTeleportForTile() {
    if (!this.activeTileCoords) {
      alert('Selecione um tile no mapa primeiro usando a ferramenta 🔍 Seleção!');
      return;
    }
    const posKey = `${this.activeTileCoords.x},${this.activeTileCoords.y}`;
    const targetMapId = this.teleportTargetMap.value;
    const targetX = Number(this.teleportTargetX.value);
    const targetY = Number(this.teleportTargetY.value);

    this.teleports[posKey] = { targetMapId, targetX, targetY };
    this.render();
    alert(`🌀 Teleporte configurado no tile (${this.activeTileCoords.x}, ${this.activeTileCoords.y})!\n\nLeva o jogador para o mapa '${targetMapId}' na posição (X: ${targetX}, Y: ${targetY}).`);
  }

  removeTeleportForTile() {
    if (!this.activeTileCoords) return;
    const posKey = `${this.activeTileCoords.x},${this.activeTileCoords.y}`;
    if (this.teleports[posKey]) {
      delete this.teleports[posKey];
      this.render();
      alert(`🗑️ Teleporte removido do tile (${this.activeTileCoords.x}, ${this.activeTileCoords.y}).`);
    } else {
      alert('Não há teleporte configurado neste tile.');
    }
  }

  setTool(toolName) {
    this.selectedTool = toolName;
    [this.btnPaint, this.btnFill, this.btnErase, this.btnSelect].forEach(btn => {
      if (btn) btn.classList.remove('active');
    });
    if (toolName === 'paint' && this.btnPaint) this.btnPaint.classList.add('active');
    if (toolName === 'fill' && this.btnFill) this.btnFill.classList.add('active');
    if (toolName === 'erase' && this.btnErase) this.btnErase.classList.add('active');
    if (toolName === 'select' && this.btnSelect) this.btnSelect.classList.add('active');
  }

  async loadMap(mapId) {
    this.gameMap = new GameMap(mapId);
    await this.gameMap.loadGlobalMapFromDatabase();

    this.width = this.gameMap.width;
    this.height = this.gameMap.height;
    this.tileSize = Math.floor(600 / Math.max(this.width, this.height));

    this.canvas.width = this.width * this.tileSize;
    this.canvas.height = this.height * this.tileSize;

    this.activeTileCoords = null;
    if (this.teleportSelectedPos) {
      this.teleportSelectedPos.innerText = 'Nenhum';
    }

    // Carregar customizações salvas (do banco ou local)
    const customData = this.getCustomMapData(mapId);
    if (customData) {
      if (customData.grid) {
        this.gameMap.grid = customData.grid;
      }
      this.spawns = customData.spawns || [];
      this.npcs = customData.npcs || [];
      this.teleports = customData.teleports || {};
    } else {
      this.spawns = this.getDefaultSpawns(mapId);
      this.npcs = this.getDefaultNpcs(mapId);
      this.teleports = {};
    }

    this.render();
  }

  getDefaultSpawns(mapId) {
    if (mapId === 'map-2') {
      return [
        { id: 'f_1', key: 'rat', name: 'Rato Selvagem', x: 6, y: 8 },
        { id: 'f_2', key: 'rat', name: 'Rato Selvagem', x: 25, y: 8 },
        { id: 'f_3', key: 'rat', name: 'Rato Selvagem', x: 10, y: 14 },
        { id: 'f_4', key: 'rat', name: 'Rato Selvagem', x: 21, y: 14 }
      ];
    } else if (mapId === 'map-cave-1') {
      return [
        { id: 'rw_1', key: 'rotworm', name: 'Rotworm', x: 6, y: 6 },
        { id: 'rw_2', key: 'rotworm', name: 'Rotworm', x: 16, y: 6 },
        { id: 'rw_3', key: 'rotworm', name: 'Rotworm', x: 10, y: 12 }
      ];
    } else if (mapId === 'map-cave-2') {
      return [
        { id: 'boss_1', key: 'demon_boss', name: '🔥 Guardião de Magma', x: 12, y: 12 }
      ];
    } else {
      return [
        { id: 'r_1', key: 'rat', name: 'Cave Rat', x: 4, y: 4 },
        { id: 'r_2', key: 'rat', name: 'Cave Rat', x: 27, y: 4 },
        { id: 'r_3', key: 'rat', name: 'Cave Rat', x: 4, y: 27 },
        { id: 'r_4', key: 'rat', name: 'Cave Rat', x: 27, y: 27 }
      ];
    }
  }

  getDefaultNpcs(mapId) {
    if (mapId === 'map-1') {
      return [
        { id: 'npc_1', key: 'npc_guard', name: 'Guardião da Praça', x: 15, y: 17 },
        { id: 'npc_2', key: 'npc_merchant', name: 'Mestre Elzar', x: 17, y: 15 }
      ];
    }
    return [];
  }

  getGridCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / (rect.width / this.width));
    const y = Math.floor((e.clientY - rect.top) / (rect.height / this.height));
    return {
      x: Math.max(0, Math.min(this.width - 1, x)),
      y: Math.max(0, Math.min(this.height - 1, y))
    };
  }

  handleCanvasClick(e) {
    const { x, y } = this.getGridCoords(e);
    const elem = this.selectedElement;

    this.activeTileCoords = { x, y };
    const currentTile = this.gameMap.getTile(x, y);
    const posKey = `${x},${y}`;

    if (this.inspectorCoords) {
      this.inspectorCoords.innerText = `X: ${x}, Y: ${y}`;
    }
    if (this.inspectorSprite) {
      this.inspectorSprite.innerText = currentTile ? currentTile.spriteKey : 'grass_0';
    }
    if (this.inspectorIsSolid) {
      this.inspectorIsSolid.checked = currentTile ? !!currentTile.isSolid : false;
    }

    if (this.teleports[posKey]) {
      const existingTp = this.teleports[posKey];
      if (this.teleportTargetMap) this.teleportTargetMap.value = existingTp.targetMapId;
      if (this.teleportTargetX) this.teleportTargetX.value = existingTp.targetX;
      if (this.teleportTargetY) this.teleportTargetY.value = existingTp.targetY;
    }

    // Se estiver no modo SELEÇÃO, apenas inspeciona o tile sem alterar sua pintura
    if (this.selectedTool === 'select') {
      this.render();
      return;
    }

    if (this.selectedTool === 'erase') {
      // Remover Spawns, NPCs ou Teleporte na posição
      this.spawns = this.spawns.filter(s => !(s.x === x && s.y === y));
      this.npcs = this.npcs.filter(n => !(n.x === x && n.y === y));
      delete this.teleports[posKey];
      this.render();
      return;
    }

    if (elem.category === 'terrain') {
      const tile = this.gameMap.getTile(x, y);
      if (tile) {
        tile.type = elem.type;
        tile.isSolid = elem.isSolid;
        tile.spriteKey = elem.key;
        tile.canopyKey = elem.canopyKey || null;
      }
    } else if (elem.category === 'spawn') {
      // Adicionar spawn de monstro
      this.spawns = this.spawns.filter(s => !(s.x === x && s.y === y));
      this.spawns.push({
        id: `custom_${Date.now()}_${Math.floor(Math.random() * 100)}`,
        key: elem.key,
        name: elem.label.replace('Spawn: ', ''),
        x,
        y
      });
    } else if (elem.category === 'npc') {
      // Adicionar NPC
      this.npcs = this.npcs.filter(n => !(n.x === x && n.y === y));
      this.npcs.push({
        id: `npc_${Date.now()}`,
        key: elem.key,
        name: elem.label.replace('NPC: ', ''),
        x,
        y
      });
    }

    this.render();
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.imageSmoothingEnabled = false;

    // 1. Renderizar Tiles do Mapa
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.gameMap.getTile(x, y);
        const sprKey = tile ? tile.spriteKey : 'grass_0';
        const spr = spriteGen.get(sprKey) || spriteGen.get('grass_0');

        this.ctx.drawImage(spr, x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);

        if (tile && tile.isSolid) {
          this.ctx.fillStyle = 'rgba(229, 62, 62, 0.15)';
          this.ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
        }
      }
    }

    // 2. Renderizar Copas de Árvores Sobrepostas
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.gameMap.getTile(x, y);
        if (tile && tile.type === CONFIG.TILE_TYPES.TREE) {
          const cKey = tile.canopyKey || 'tree_canopy';
          const cSpr = spriteGen.get(cKey) || spriteGen.get('tree_canopy');
          const cSize = this.tileSize * 1.6;
          const cOffset = (cSize - this.tileSize) / 2;
          this.ctx.drawImage(cSpr, x * this.tileSize - cOffset, y * this.tileSize - cSize + this.tileSize / 1.5, cSize, cSize);
        }
      }
    }

    // 3. Renderizar Teleportes Customizados (Destaque Azul)
    Object.keys(this.teleports).forEach(posKey => {
      const [tx, ty] = posKey.split(',').map(Number);
      this.ctx.fillStyle = 'rgba(66, 153, 225, 0.35)';
      this.ctx.fillRect(tx * this.tileSize, ty * this.tileSize, this.tileSize, this.tileSize);
      this.ctx.strokeStyle = '#3182ce';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(tx * this.tileSize, ty * this.tileSize, this.tileSize, this.tileSize);

      this.ctx.font = 'bold 11px Inter, sans-serif';
      this.ctx.fillStyle = '#63b3ed';
      this.ctx.fillText('🌀 TP', tx * this.tileSize + 2, ty * this.tileSize + 12);
    });

    // 4. Renderizar Spawns de Monstros (Indicador Vermelho)
    this.spawns.forEach(s => {
      const spr = spriteGen.get(s.key) || spriteGen.get('rat');
      this.ctx.drawImage(spr, s.x * this.tileSize, s.y * this.tileSize, this.tileSize, this.tileSize);
      this.ctx.strokeStyle = '#e53e3e';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(s.x * this.tileSize, s.y * this.tileSize, this.tileSize, this.tileSize);
    });

    // 5. Renderizar NPCs (Indicador Amarelo)
    this.npcs.forEach(n => {
      const spr = spriteGen.get(n.key) || spriteGen.get('npc_guard');
      this.ctx.drawImage(spr, n.x * this.tileSize, n.y * this.tileSize, this.tileSize, this.tileSize);
      this.ctx.strokeStyle = '#ecc94b';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(n.x * this.tileSize, n.y * this.tileSize, this.tileSize, this.tileSize);
    });

    // 6. Highlight do Tile Ativo
    if (this.activeTileCoords) {
      const { x, y } = this.activeTileCoords;
      this.ctx.strokeStyle = '#4299e1';
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
    }

    // 7. Linhas da Grade do Mapa
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= this.width; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(i * this.tileSize, 0);
      this.ctx.lineTo(i * this.tileSize, this.canvas.height);
      this.ctx.stroke();
    }
    for (let i = 0; i <= this.height; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, i * this.tileSize);
      this.ctx.lineTo(this.canvas.width, i * this.tileSize);
      this.ctx.stroke();
    }

    this.updateStats();
  }

  updateStats() {
    const tpCount = Object.keys(this.teleports).length;
    this.mapStats.innerHTML = `
      <strong>Dimensões:</strong> ${this.width}x${this.height}<br>
      <strong>Spawns Monstros:</strong> ${this.spawns.length}<br>
      <strong>NPCs Posicionados:</strong> ${this.npcs.length}<br>
      <strong>Teleportes Ativos:</strong> ${tpCount}
    `;
  }

  getCustomMapData(mapId) {
    try {
      const saved = localStorage.getItem('mmorpg_custom_maps');
      if (!saved) return null;
      const dict = JSON.parse(saved);
      return dict[mapId] || null;
    } catch (e) {
      return null;
    }
  }

  async saveCustomMap() {
    try {
      const saved = localStorage.getItem('mmorpg_custom_maps');
      const dict = saved ? JSON.parse(saved) : {};
      dict[this.currentMapId] = {
        grid: this.gameMap.grid,
        spawns: this.spawns,
        npcs: this.npcs,
        teleports: this.teleports
      };
      localStorage.setItem('mmorpg_custom_maps', JSON.stringify(dict));

      // Sincronizar com o Banco de Dados Global Supabase
      if (supabase) {
        const { error } = await supabase
          .from('custom_maps')
          .upsert({
            map_id: this.currentMapId,
            name: this.gameMap.name,
            width: this.width,
            height: this.height,
            grid: this.gameMap.grid,
            spawns: this.spawns,
            npcs: this.npcs,
            teleports: this.teleports,
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error('Erro ao salvar mapa no Supabase DB:', error);
          alert(`⚠️ Salvo localmente, mas ocorreu um aviso ao sincronizar no banco global: ${error.message}`);
        } else {
          alert(`🌐 MAPA '${this.gameMap.name}' PUBLICADO COM SUCESSO NO BANCO DE DADOS SUPABASE!\n\nAs alterações já estão salvas no servidor global e ativas para TODOS os jogadores do mundo!`);
        }
      } else {
        alert(`🚀 Mapa '${this.gameMap.name}' salvo localmente!`);
      }
    } catch (e) {
      console.error('Erro ao salvar mapa:', e);
    }
  }

  async resetCustomMap() {
    if (confirm(`Deseja restaurar o mapa '${this.gameMap.name}' para a geografia e spawns originais?`)) {
      try {
        const saved = localStorage.getItem('mmorpg_custom_maps');
        if (saved) {
          const dict = JSON.parse(saved);
          delete dict[this.currentMapId];
          localStorage.setItem('mmorpg_custom_maps', JSON.stringify(dict));
        }

        if (supabase) {
          await supabase.from('custom_maps').delete().eq('map_id', this.currentMapId);
        }

        this.loadMap(this.currentMapId);
        alert(`↺ Mapa '${this.gameMap.name}' restaurado ao estado original no servidor global.`);
      } catch (e) {
        console.error('Erro ao resetar mapa:', e);
      }
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new MapEditorApp();
});
