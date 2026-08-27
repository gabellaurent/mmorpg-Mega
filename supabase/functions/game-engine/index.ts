import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// Funções Auxiliares de Nível e XP
function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor((50 / 3) * (Math.pow(level, 3) - 6 * Math.pow(level, 2) + 17 * level - 12));
}

function getMaxHp(level: number): number {
  return 100 + ((level - 1) * 20);
}

// Hash de senha SHA-256 no servidor com Salt para segurança
async function hashPasswordWithSalt(password: string, salt = "mmorpg_mega_secure_salt_2026"): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Validação de Distância no Grid para prevenir Tele-Attack e Tele-Loot
function isWithinRange(x1: number, y1: number, x2: number, y2: number, maxDist: number): boolean {
  if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) return true;
  const dist = Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
  return dist <= maxDist;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const sAdm = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    let res: any = {};

    switch (action) {
      // 1. REGISTRO DE CONTA SEGURO
      case 'register': {
        const { username, password, spriteId, x, y } = body;
        const cleanUsername = (username || '').trim();

        if (!cleanUsername || cleanUsername.length < 3) {
          return new Response(JSON.stringify({ success: false, message: 'O nome de usuário deve ter pelo menos 3 caracteres.' }), { headers: corsHeaders });
        }
        if (!password || password.length < 4) {
          return new Response(JSON.stringify({ success: false, message: 'A senha deve ter pelo menos 4 caracteres.' }), { headers: corsHeaders });
        }

        const { data: existing } = await sAdm
          .from('players')
          .select('id')
          .ilike('username', cleanUsername)
          .maybeSingle();

        if (existing) {
          return new Response(JSON.stringify({ success: false, message: 'Este nome de usuário já está em uso por outro jogador.' }), { headers: corsHeaders });
        }

        const passwordHash = await hashPasswordWithSalt(password);
        const insertData = {
          username: cleanUsername,
          password_hash: passwordHash,
          level: 1,
          experience: 0,
          hp: 100,
          gold: 0,
          inventory: Array(24).fill(null),
          sprite_id: spriteId || 'knight',
          x: x || 16,
          y: y || 16
        };

        const { data: created, error } = await sAdm
          .from('players')
          .insert([insertData])
          .select('*')
          .single();

        if (error) {
          console.error('[EDGE REGISTER ERROR]', error);
          return new Response(JSON.stringify({ success: false, message: 'Erro ao criar conta no banco de dados.' }), { headers: corsHeaders });
        }

        res = { success: true, player: created };
        break;
      }

      // 2. LOGIN SEGURO
      case 'login': {
        const { username, password } = body;
        const cleanUsername = (username || '').trim();
        const passwordHash = await hashPasswordWithSalt(password);

        const { data: player, error } = await sAdm
          .from('players')
          .select('*')
          .ilike('username', cleanUsername)
          .eq('password_hash', passwordHash)
          .maybeSingle();

        if (error || !player) {
          return new Response(JSON.stringify({ success: false, message: 'Usuário ou senha incorretos.' }), { headers: corsHeaders });
        }

        res = { success: true, player };
        break;
      }

      // 3. COMBATE AUTORITATIVO COM VALIDAÇÃO DE DISTÂNCIA
      case 'attack_monster': {
        const { playerId, ratId, spriteKey, currentGridX, currentGridY } = body;

        const { data: player, error: pErr } = await sAdm
          .from('players')
          .select('*')
          .eq('id', playerId)
          .single();

        if (pErr || !player) {
          return new Response(JSON.stringify({ success: false, message: 'Jogador não encontrado.' }), { headers: corsHeaders });
        }

        if (player.hp <= 0) {
          return new Response(JSON.stringify({ success: false, message: 'Você está morto e precisa renascer.' }), { headers: corsHeaders });
        }

        // Validação do alcance de ataque de acordo com a classe do jogador
        const maxRange = player.sprite_id === 'paladin' ? 5 : player.sprite_id === 'mage' ? 4 : 2;
        if (currentGridX !== undefined && currentGridY !== undefined) {
          const { data: monsterState } = await sAdm
            .from('world_monsters')
            .select('*')
            .eq('id', ratId)
            .maybeSingle();

          if (monsterState && monsterState.grid_x !== undefined) {
            if (!isWithinRange(player.x, player.y, monsterState.grid_x, monsterState.grid_y, maxRange)) {
              return new Response(JSON.stringify({ success: false, message: 'Alvo fora do alcance de ataque!' }), { headers: corsHeaders });
            }
          }
        }

        // Cálculo de Dano no Servidor (Base + Variação)
        const baseDmg = Math.floor(Math.random() * 9) + 8;
        const bonusDmg = player.strength ? Math.floor(player.strength * 0.5) : 0;
        const damage = baseDmg + bonusDmg;

        const { data: monsterState } = await sAdm
          .from('world_monsters')
          .select('*')
          .eq('id', ratId)
          .maybeSingle();

        let monsterHp = monsterState ? (monsterState.is_dead ? 0 : 30) : 30;
        const newMonsterHp = Math.max(0, monsterHp - damage);
        const isDead = newMonsterHp <= 0;

        let gainedXp = 0;
        let leveledUp = false;
        let newLevel = player.level;
        let newXp = Number(player.experience || 0);
        let newHp = player.hp;

        if (isDead) {
          if (spriteKey === 'demon_boss') gainedXp = 250;
          else if (spriteKey === 'goblin') gainedXp = 65;
          else if (spriteKey === 'spider') gainedXp = 50;
          else if (spriteKey === 'rotworm') gainedXp = 45;
          else if (spriteKey === 'wolf') gainedXp = 35;
          else gainedXp = 25;

          newXp += gainedXp;

          while (newXp >= getXpForLevel(newLevel + 1)) {
            newLevel += 1;
            leveledUp = true;
          }

          if (leveledUp) {
            newHp = getMaxHp(newLevel);
          }

          await sAdm.from('players').update({
            level: newLevel,
            experience: newXp,
            hp: newHp
          }).eq('id', playerId);

          const respawnTime = new Date(Date.now() + 8000).toISOString();
          await sAdm.from('world_monsters').upsert({
            id: ratId,
            map_id: body.mapId || 'map-1',
            is_dead: true,
            death_time: new Date().toISOString(),
            respawn_time: respawnTime
          });
        }

        res = {
          success: true,
          damage,
          isDead,
          gainedXp,
          leveledUp,
          newLevel,
          newXp,
          newHp
        };
        break;
      }

      // 4. MOVIMENTO DO JOGADOR
      case 'player_move': {
        const { playerId, x, y } = body;
        if (playerId) {
          await sAdm.from('players').update({ x, y, last_seen: new Date().toISOString() }).eq('id', playerId);
        }
        res = { success: true };
        break;
      }

      // 5. SAQUE DE CORPO COM VALIDAÇÃO DE DISTÂNCIA
      case 'loot_corpse': {
        const { corpseId, playerId } = body;
        const { data: corpse } = await sAdm.from('world_corpses').select('*').eq('id', corpseId).maybeSingle();

        if (!corpse || !corpse.loot || corpse.loot.length === 0) {
          return new Response(JSON.stringify({ success: false, message: 'O corpo está vazio.' }), { headers: corsHeaders });
        }

        const { data: player } = await sAdm.from('players').select('x, y, gold').eq('id', playerId).single();

        if (player && corpse.grid_x !== undefined && corpse.grid_y !== undefined) {
          if (!isWithinRange(player.x, player.y, corpse.grid_x, corpse.grid_y, 2)) {
            return new Response(JSON.stringify({ success: false, message: 'Você está muito longe para saquear este corpo!' }), { headers: corsHeaders });
          }
        }

        const lootedItems = [...corpse.loot];
        await sAdm.from('world_corpses').update({ loot: [] }).eq('id', corpseId);

        const goldLoot = lootedItems.find((item: any) => item.itemId === 'gold');
        if (goldLoot && player) {
          await sAdm.from('players').update({ gold: Number(player.gold || 0) + goldLoot.quantity }).eq('id', playerId);
        }

        res = { success: true, lootedItems };
        break;
      }

      default:
        return new Response(JSON.stringify({ success: false, message: 'Ação inválida: ' + action }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify(res), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (err: any) {
    console.error('[EDGE SERVER ERROR]', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
