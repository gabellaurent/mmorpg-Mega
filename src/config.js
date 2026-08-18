// Configurações Globais do MMORPG
export const CONFIG = {
  // Configurações do Grid do Mapa
  GRID_WIDTH: 32,
  GRID_HEIGHT: 32,
  TILE_SIZE: 48, // Tamanho de renderização de cada tile em pixels (48x48)
  
  // Animação e Movimentação
  STEP_DURATION_MS: 180, // Tempo de interpolação entre tiles (estilo Tibia)
  ANIMATION_FRAME_MS: 120, // Velocidade das pernas ao caminhar
  
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
    GATE: 8
  },

  // Flags de Colisão por tipo de Tile
  SOLID_TILES: [2, 3, 4, 8], // TREE, ROCK, WATER, GATE são sólidos (bloqueiam passagem)

  // Outfits de Personagens disponíveis
  CLASSES: [
    { id: 'knight', name: 'Guerreiro (Knight)', description: 'Mestre no combate corpo a corpo', primaryColor: '#2b6cb0' },
    { id: 'mage', name: 'Mago (Mage)', description: 'Dominador das artes arcanas', primaryColor: '#6b46c1' },
    { id: 'paladin', name: 'Paladino (Ranger)', description: 'Especialista em ataques à distância', primaryColor: '#2f855a' }
  ]
};
