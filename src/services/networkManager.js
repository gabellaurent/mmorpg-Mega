// Gerenciador de Rede Multiplayer Estável (Supabase Realtime & BroadcastChannel Local)
import { supabase, isSupabaseConfigured } from './supabaseClient.js';

export class NetworkManager {
  constructor(localPlayer, onRemotePlayerUpdate, onRemotePlayerLeave, onChatMessage, onMonsterHit, onMonsterRespawn, onItemSpawn, onItemPickup) {
    this.localPlayer = localPlayer;
    this.onRemotePlayerUpdate = onRemotePlayerUpdate;
    this.onRemotePlayerLeave = onRemotePlayerLeave;
    this.onChatMessage = onChatMessage;
    this.onMonsterHit = onMonsterHit;
    this.onMonsterRespawn = onMonsterRespawn;
    this.onItemSpawn = onItemSpawn;
    this.onItemPickup = onItemPickup;

    this.supabaseChannel = null;
    this.localChannel = null;
    this.useSupabase = false;
    this.isSupabaseSubscribed = false;

    this.lastSeenMap = new Map();
    this.heartbeatTimer = null;
    this.cleanupTimer = null;
    this.autoSaveTimer = null;
  }

  connect(mapId = 'map-1') {
    this.connectLocalBroadcast(mapId);

    if (isSupabaseConfigured && supabase) {
      this.useSupabase = true;
      this.connectSupabase(mapId);
    }

    this.startHeartbeat();
    this.startCleanupTask();
    this.setupAutoSave();
  }

  connectLocalBroadcast(mapId) {
    try {
      this.localChannel = new BroadcastChannel(`mmorpg-map-${mapId}`);

      this.localChannel.onmessage = (event) => {
        const { type, payload } = event.data;
        if (!payload || payload.id === this.localPlayer.id) return;

        this.handleMessage(type, payload);
      };

      console.log('⚡ Conectado via BroadcastChannel Local.');
      this.sendBroadcast('player_join', this.getPlayerDataPayload());
    } catch (err) {
      console.warn('Erro no BroadcastChannel local:', err);
    }
  }

  connectSupabase(mapId) {
    const roomName = `map:${mapId}`;
    this.supabaseChannel = supabase.channel(roomName, {
      config: {
        broadcast: { self: false },
        presence: { key: this.localPlayer.id }
      }
    });

    this.supabaseChannel.on('broadcast', { event: 'player_move' }, ({ payload }) => {
      this.handleMessage('player_move', payload);
    });

    this.supabaseChannel.on('broadcast', { event: 'player_heartbeat' }, ({ payload }) => {
      this.handleMessage('player_heartbeat', payload);
    });

    this.supabaseChannel.on('broadcast', { event: 'player_chat' }, ({ payload }) => {
      this.handleMessage('player_chat', payload);
    });

    this.supabaseChannel.on('broadcast', { event: 'player_leave' }, ({ payload }) => {
      this.handleMessage('player_leave', payload);
    });

    // Eventos de Monstros em Tempo Real
    this.supabaseChannel.on('broadcast', { event: 'monster_hit' }, ({ payload }) => {
      this.handleMessage('monster_hit', payload);
    });

    this.supabaseChannel.on('broadcast', { event: 'monster_respawn' }, ({ payload }) => {
      this.handleMessage('monster_respawn', payload);
    });

    // Eventos de Itens no Chão
    this.supabaseChannel.on('broadcast', { event: 'item_spawn' }, ({ payload }) => {
      this.handleMessage('item_spawn', payload);
    });

    this.supabaseChannel.on('broadcast', { event: 'item_pickup' }, ({ payload }) => {
      this.handleMessage('item_pickup', payload);
    });

    // Eventos de Corpos e Decomposição
    this.supabaseChannel.on('broadcast', { event: 'corpse_spawn' }, ({ payload }) => {
      this.handleMessage('corpse_spawn', payload);
    });

    this.supabaseChannel.subscribe((status) => {
      console.log('📡 Status Supabase Realtime:', status);
      if (status === 'SUBSCRIBED') {
        this.isSupabaseSubscribed = true;
        this.sendBroadcast('player_join', this.getPlayerDataPayload());
      } else {
        this.isSupabaseSubscribed = false;
      }
    });
  }

  handleMessage(type, payload) {
    if (!payload) return;

    // Ignorar eventos do próprio jogador local para evitar duplicação
    if (payload.id === this.localPlayer.id && type !== 'monster_hit' && type !== 'monster_respawn' && type !== 'item_spawn' && type !== 'item_pickup' && type !== 'corpse_spawn') return;

    if (payload.id && payload.id !== this.localPlayer.id) {
      this.lastSeenMap.set(payload.id, Date.now());
    }

    if (type === 'player_move' || type === 'player_heartbeat' || type === 'player_join') {
      this.onRemotePlayerUpdate(payload);
    } else if (type === 'player_leave') {
      this.onRemotePlayerLeave(payload.id);
      this.lastSeenMap.delete(payload.id);
    } else if (type === 'player_chat') {
      this.onChatMessage(payload);
    } else if (type === 'monster_hit') {
      if (payload.attackerId !== this.localPlayer.id && this.onMonsterHit) {
        this.onMonsterHit(payload);
      }
    } else if (type === 'monster_respawn') {
      if (this.onMonsterRespawn) {
        this.onMonsterRespawn(payload);
      }
    } else if (type === 'item_spawn') {
      if (this.onItemSpawn) {
        this.onItemSpawn(payload);
      }
    } else if (type === 'item_pickup') {
      if (this.onItemPickup) {
        this.onItemPickup(payload);
      }
    } else if (type === 'corpse_spawn') {
      if (this.onCorpseSpawn) {
        this.onCorpseSpawn(payload);
      }
    } else if (type === 'monster_move') {
      if (this.onMonsterMove) {
        this.onMonsterMove(payload);
      }
    }
  }

  getPlayerDataPayload() {
    return {
      id: this.localPlayer.id,
      name: this.localPlayer.name,
      spriteId: this.localPlayer.spriteId,
      x: this.localPlayer.gridX,
      y: this.localPlayer.gridY,
      direction: this.localPlayer.direction,
      level: this.localPlayer.level,
      hp: this.localPlayer.hp,
      maxHp: this.localPlayer.maxHp
    };
  }

  sendBroadcast(event, payload) {
    if (this.useSupabase && this.supabaseChannel && this.isSupabaseSubscribed) {
      this.supabaseChannel.send({
        type: 'broadcast',
        event: event,
        payload
      });
    }

    if (this.localChannel) {
      this.localChannel.postMessage({ type: event, payload });
    }
  }

  sendMove(gridX, gridY, direction) {
    const payload = {
      id: this.localPlayer.id,
      name: this.localPlayer.name,
      spriteId: this.localPlayer.spriteId,
      x: gridX,
      y: gridY,
      direction: direction,
      level: this.localPlayer.level,
      hp: this.localPlayer.hp,
      maxHp: this.localPlayer.maxHp
    };

    this.sendBroadcast('player_move', payload);
  }

  // Envia evento de dano no Monstro em Tempo Real
  sendMonsterHit(ratId, damage, attackerName) {
    const payload = {
      attackerId: this.localPlayer.id,
      attackerName: attackerName,
      ratId: ratId,
      damage: damage,
      timestamp: Date.now()
    };

    this.sendBroadcast('monster_hit', payload);
  }

  // Envia evento de respawn do Monstro em Tempo Real
  sendMonsterRespawn(ratId) {
    const payload = {
      ratId: ratId,
      timestamp: Date.now()
    };

    this.sendBroadcast('monster_respawn', payload);
  }

  // Envia evento de item caindo no chão em Tempo Real
  sendItemSpawn(itemData) {
    this.sendBroadcast('item_spawn', itemData);
  }

  // Envia evento de item coletado do chão em Tempo Real
  sendItemPickup(itemId) {
    this.sendBroadcast('item_pickup', { id: itemId, collectorId: this.localPlayer.id });
  }

  // Envia evento de criação de corpo no chão em Tempo Real
  sendCorpseSpawn(corpseData) {
    this.sendBroadcast('corpse_spawn', corpseData);
  }

  // Envia movimento e alvo do monstro em Tempo Real
  sendMonsterMove(ratId, gridX, gridY, targetPlayerId) {
    this.sendBroadcast('monster_move', {
      ratId,
      gridX,
      gridY,
      targetPlayerId,
      senderId: this.localPlayer.id
    });
  }

  sendChat(text) {
    const payload = {
      id: this.localPlayer.id,
      sender: this.localPlayer.name,
      text: text,
      timestamp: Date.now()
    };

    this.sendBroadcast('player_chat', payload);
    this.onChatMessage(payload);
  }

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.sendBroadcast('player_heartbeat', this.getPlayerDataPayload());
    }, 2000);

    window.addEventListener('beforeunload', () => {
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
      this.sendBroadcast('player_leave', { id: this.localPlayer.id });
    });
  }

  startCleanupTask() {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      this.lastSeenMap.forEach((lastSeen, id) => {
        if (now - lastSeen > 20000) {
          this.onRemotePlayerLeave(id);
          this.lastSeenMap.delete(id);
        }
      });
    }, 5000);
  }

  setupAutoSave() {
    this.autoSaveTimer = setInterval(() => {
      this.savePositionToDatabase();
    }, 30000);

    window.addEventListener('beforeunload', () => {
      this.savePositionToDatabase();
    });
  }

  async savePositionToDatabase() {
    if (!isSupabaseConfigured || !supabase || !this.localPlayer.characterId) return;

    try {
      await supabase
        .from('characters')
        .update({
          x: this.localPlayer.gridX,
          y: this.localPlayer.gridY,
          direction: this.localPlayer.direction,
          hp: this.localPlayer.hp,
          level: this.localPlayer.level
        })
        .eq('id', this.localPlayer.characterId);
    } catch (err) {
      console.error('Erro ao salvar no banco:', err);
    }
  }

  // Salvar corpo no banco de dados Supabase
  async saveCorpseToDatabase(corpse, mapId = 'map-1') {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      await supabase.from('world_corpses').upsert({
        id: corpse.id,
        map_id: mapId,
        owner_name: corpse.ownerName,
        entity_type: corpse.entityType,
        grid_x: corpse.gridX,
        grid_y: corpse.gridY,
        loot: corpse.loot || [],
        created_at: new Date(corpse.createdAt).toISOString()
      });
    } catch (err) {
      console.error('Erro ao salvar corpo no banco:', err);
    }
  }

  // Atualizar/Remover corpo no banco de dados
  async updateCorpseInDatabase(corpseId, lootRemaining) {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      if (lootRemaining.length === 0) {
        await supabase.from('world_corpses').delete().eq('id', corpseId);
      } else {
        await supabase.from('world_corpses').update({ loot: lootRemaining }).eq('id', corpseId);
      }
    } catch (err) {
      console.error('Erro ao atualizar corpo no banco:', err);
    }
  }

  // Carregar corpos ativos (< 5 minutos) do mapa
  async loadCorpsesFromDatabase(mapId = 'map-1') {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      const fiveMinutesAgo = new Date(Date.now() - 300000).toISOString();
      const { data, error } = await supabase
        .from('world_corpses')
        .select('*')
        .eq('map_id', mapId)
        .gte('created_at', fiveMinutesAgo);

      if (error) {
        console.error('Erro ao carregar corpos:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        ownerName: row.owner_name,
        entityType: row.entity_type,
        gridX: row.grid_x,
        gridY: row.grid_y,
        loot: row.loot || [],
        createdAt: new Date(row.created_at).getTime()
      }));
    } catch (err) {
      console.error('Erro ao carregar corpos do banco:', err);
      return [];
    }
  }

  // Persistir estado de vida/morte de monstro no banco
  async saveMonsterStateToDatabase(ratId, isDead, respawnTime, mapId = 'map-1') {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      await supabase.from('world_monsters').upsert({
        id: ratId,
        map_id: mapId,
        is_dead: isDead,
        death_time: isDead ? new Date().toISOString() : null,
        respawn_time: isDead ? new Date(respawnTime).toISOString() : null
      });
    } catch (err) {
      console.error('Erro ao salvar estado de monstro no banco:', err);
    }
  }

  // Carregar estados dos monstros do banco
  async loadMonstersFromDatabase(mapId = 'map-1') {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      const { data, error } = await supabase
        .from('world_monsters')
        .select('*')
        .eq('map_id', mapId);

      if (error) {
        console.error('Erro ao carregar estado de monstros:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('Erro ao carregar monstros do banco:', err);
      return [];
    }
  }
}
