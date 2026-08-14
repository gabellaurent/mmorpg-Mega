// Gerenciador de Rede Multiplayer Estável (Supabase Realtime & BroadcastChannel Local)
import { supabase, isSupabaseConfigured } from './supabaseClient.js';

export class NetworkManager {
  constructor(localPlayer, onRemotePlayerUpdate, onRemotePlayerLeave, onChatMessage) {
    this.localPlayer = localPlayer;
    this.onRemotePlayerUpdate = onRemotePlayerUpdate;
    this.onRemotePlayerLeave = onRemotePlayerLeave;
    this.onChatMessage = onChatMessage;

    this.supabaseChannel = null;
    this.localChannel = null;
    this.useSupabase = false;
    this.isSupabaseSubscribed = false;

    this.lastSeenMap = new Map(); // id -> timestamp
    this.heartbeatTimer = null;
    this.cleanupTimer = null;
    this.autoSaveTimer = null;
  }

  // Conecta ao canal de comunicação (Supabase Realtime ou BroadcastChannel Local)
  connect(mapId = 'map-1') {
    // 1. Sempre ativa o BroadcastChannel local para sincronização instantânea entre abas
    this.connectLocalBroadcast(mapId);

    // 2. Conecta ao Supabase Realtime se configurado
    if (isSupabaseConfigured && supabase) {
      this.useSupabase = true;
      this.connectSupabase(mapId);
    }

    // Heartbeat de estabilidade (a cada 2 segundos)
    this.startHeartbeat();

    // Limpeza de inativos (apenas se passar > 20s sem sinal)
    this.startCleanupTask();

    // Auto-Save no PostgreSQL
    this.setupAutoSave();
  }

  // Conexão Local Multi-Aba via BroadcastChannel
  connectLocalBroadcast(mapId) {
    try {
      this.localChannel = new BroadcastChannel(`mmorpg-map-${mapId}`);

      this.localChannel.onmessage = (event) => {
        const { type, payload } = event.data;
        if (!payload || payload.id === this.localPlayer.id) return;

        this.handleMessage(type, payload);
      };

      console.log('⚡ Conectado via BroadcastChannel Local.');
      
      // Anunciar entrada imediata
      this.sendBroadcast('player_join', this.getPlayerDataPayload());
    } catch (err) {
      console.warn('Erro no BroadcastChannel local:', err);
    }
  }

  // Conexão via Supabase Realtime WebSockets
  connectSupabase(mapId) {
    const roomName = `map:${mapId}`;
    this.supabaseChannel = supabase.channel(roomName, {
      config: {
        broadcast: { self: false },
        presence: { key: this.localPlayer.id }
      }
    });

    // Eventos de Broadcast do Supabase Realtime
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

    // Inscrever no canal do Supabase
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

  // Processa mensagens recebidas com estabilidade total
  handleMessage(type, payload) {
    if (!payload || payload.id === this.localPlayer.id) return;

    this.lastSeenMap.set(payload.id, Date.now());

    if (type === 'player_move' || type === 'player_heartbeat' || type === 'player_join') {
      this.onRemotePlayerUpdate(payload);
    } else if (type === 'player_leave') {
      this.onRemotePlayerLeave(payload.id);
      this.lastSeenMap.delete(payload.id);
    } else if (type === 'player_chat') {
      this.onChatMessage(payload);
    }
  }

  // Prepara o pacote de dados do jogador local
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

  // Envia qualquer mensagem de broadcast para o canal ativo
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

  // Transmite movimentação do jogador local
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

  // Transmite mensagem de chat
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

  // Heartbeat periódico (a cada 2 segundos)
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.sendBroadcast('player_heartbeat', this.getPlayerDataPayload());
    }, 2000);

    window.addEventListener('beforeunload', () => {
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
      this.sendBroadcast('player_leave', { id: this.localPlayer.id });
    });
  }

  // Limpeza após 20 segundos de silêncio
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

  // Auto-Save no banco de dados Supabase
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
