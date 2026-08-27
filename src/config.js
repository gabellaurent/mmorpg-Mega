// Configurações Globais do MMORPG
export const CONFIG = {
  // Configurações do Grid do Mapa
  GRID_WIDTH: 32,
  GRID_HEIGHT: 32,
  TILE_SIZE: 48, // Tamanho de renderização de cada tile em pixels (48x48)
  
  // Animação e Movimentação
  STEP_DURATION_MS: 500, // Tempo de transição entre tiles (0.5s)
  ANIMATION_FRAME_MS: 160, // Velocidade das pernas ao caminhar
  
  // Persistência
  AUTO_SAVE_INTERVAL_MS: 30000, // Salvar coordenadas no banco a cada 30 segundos
  
  // Identificadores de Terreno / Obstáculos
  TILE_TYPES: {
    GRASS: 0,
    COBBLE: 1,
    TREE: 2,
    ROCK: 3,
    WATER: 4,
    PORTAL: 5,
    DIRT: 6,
    FLOWERS: 7,
    GATE: 8,
    WALL_WOOD: 9,
    WOOD_FLOOR: 10,
    HOUSE_DOOR: 11,
    HOUSE_BED: 12,
    HOUSE_TABLE: 13,
    HOUSE_FIREPLACE: 14,
    HOUSE_CHEST: 15,
    CAVE_FLOOR: 17,
    CAVE_WALL: 18,
    CAVE_HOLE: 19,
    CAVE_STAIRS: 20,
    MAGMA_FLOOR: 21,
    OBSIDIAN_WALL: 22,
    FENCE_H: 23,
    FENCE_V: 24,
    FENCE_CORNER_TL: 25,
    FENCE_CORNER_TR: 26,
    FENCE_CORNER_BL: 27,
    FENCE_CORNER_BR: 28,
    FENCE_END_L: 29,
    FENCE_END_R: 30
  },

  // Flags de Colisão por tipo de Tile
  SOLID_TILES: [2, 3, 4, 8, 9, 12, 13, 14, 15, 18, 22, 23, 24, 25, 26, 27, 28, 29, 30], // TREE, ROCK, WATER, GATE, WALL_WOOD, BED, TABLE, FIREPLACE, CHEST, FENCES são sólidos

  // Outfits de Personagens disponíveis
  CLASSES: [
    { id: 'knight', name: 'Guerreiro (Knight)', description: 'Mestre no combate corpo a corpo', primaryColor: '#2b6cb0' },
    { id: 'mage', name: 'Mago (Mage)', description: 'Dominador das artes arcanas', primaryColor: '#6b46c1' },
    { id: 'paladin', name: 'Paladino (Ranger)', description: 'Especialista em ataques à distância', primaryColor: '#2f855a' }
  ],

  // Definição do Catálogo de Itens do Jogo
  ITEMS: {
    gold: { id: 'gold', name: 'Moedas de Ouro', description: 'Moeda de troca usada no reino.', stackable: true, type: 'currency', spriteKey: 'item_gold' },
    health_potion: { id: 'health_potion', name: 'Poção de Vida', description: 'Restaura +35 Pontos de Vida (HP).', stackable: true, type: 'consumable', healHp: 35, spriteKey: 'item_health_potion' },
    mana_potion: { id: 'mana_potion', name: 'Elixir Mágico', description: 'Restaura +50 HP com energia arcana.', stackable: true, type: 'consumable', healHp: 50, spriteKey: 'item_health_potion' },
    cheese: { id: 'cheese', name: 'Fatia de Queijo', description: 'Restaura +15 Pontos de Vida (HP).', stackable: true, type: 'consumable', healHp: 15, spriteKey: 'item_cheese' },
    rat_tail: { id: 'rat_tail', name: 'Rabo de Rato', description: 'Item troféu coletado de ratos.', stackable: true, type: 'material', spriteKey: 'item_rat_tail' },
    steel_sword: { id: 'steel_sword', name: 'Espada de Aço', description: 'Lâmina afiada forjada em aço (+8 Ataque).', stackable: false, type: 'equipment', spriteKey: 'item_gold' },
    bronze_shield: { id: 'bronze_shield', name: 'Escudo de Bronze', description: 'Escudo pesado de bronze (+5 Defesa).', stackable: false, type: 'equipment', spriteKey: 'item_gold' },
    hunting_bow: { id: 'hunting_bow', name: 'Arco de Caça', description: 'Arco longo de carvalho para tiros à distância.', stackable: false, type: 'equipment', spriteKey: 'item_gold' }
  },

  // Tabela de Drops de Monstros
  LOOT_TABLES: {
    rat: [
      { itemId: 'gold', chance: 0.85, minQty: 1, maxQty: 5 },
      { itemId: 'health_potion', chance: 0.35, minQty: 1, maxQty: 1 },
      { itemId: 'cheese', chance: 0.45, minQty: 1, maxQty: 1 },
      { itemId: 'rat_tail', chance: 0.30, minQty: 1, maxQty: 1 }
    ]
  }
};
