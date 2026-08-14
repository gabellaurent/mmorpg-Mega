// Gerenciador de Rede Multiplayer Estável (Supabase Realtime & BroadcastChannel Local)
import { supabase, isSupabaseConfigured } from './supabaseClient.js';

export class NetworkManager {
  constructor(localPlayer, onRemotePlayerUpdate, onRemotePlayerLeave, onChatMessage, onMonsterHit, onMonsterRespawn) {
    this.localPlayer = localPlayer;
    this.onRemotePlayerUpdate = onRemotePlayerUpdate;
    this.onRemotePlayerLeave = onRemotePlayerLeave;
    this.onChatMessage = onChatMessage;
    this.onMonsterHit = onMonsterHit;
    this.onMonsterRespawn = onMonsterRespawn;

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

    // Ignorar eventos do próprio jogador local para evitar duplicação de ataques
    if (payload.id === this.localPlayer.id && type !== 'monster_hit' && type !== 'monster_respawn') return;

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
}
