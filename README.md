# ⚔️ MMORPG Web 2D - Grid-Based (Tibia Style)

Um **MMORPG 2D Multiplayer em Tempo Real** rodando direto no navegador, construído com **HTML5 Canvas 2D**, **Vite**, **Supabase Auth & PostgreSQL** e **Supabase Realtime (WebSockets)**.

---

## 🌟 Funcionalidades

- 🗺️ **Mapa Grid 32×32:** Movimentação passo a passo em grid com interpolação suave (LERP) a 60 FPS (Estilo Tibia clássico).
- 🎨 **Gráficos Procedurais Pixel-Art:** 
  - Tiles procedurais de grama, caminhos de pedra, rochas, água e portal.
  - Copas de árvores renderizadas em z-index elevado (jogadores caminham por baixo das árvores).
  - Outfits procedurais para 3 classes (**Guerreiro/Knight**, **Mago/Mage**, **Paladino/Paladin**) com animações de caminhada nas 4 direções.
- 📡 **Multiplayer em Tempo Real (Supabase Realtime & BroadcastChannel):**
  - Sincronização instantânea de posições, direções e mensagens de chat.
  - Presence de jogadores online.
  - Fallback automático para `BroadcastChannel` local para testes sem servidor.
- 🗺️ **Minimapa Radar 32×32:** Radar visual no canto superior do HUD mostrando o radar do grid com a posição relativa de todos os jogadores online e cálculo de distância em tiles.
- 💬 **Chat Global & Balões de Fala:** Balões de chat mágicos animados sobre a cabeça dos personagens e log de chat global.
- 🛡️ **Interface Retro Dark Fantasy:** Card de estatísticas do personagem, HP, nível, coordenadas X, Y e controles virtuais (D-Pad) para dispositivos de toque/mobile.

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js (v18+ recomendado)
- npm ou yarn

### Passo a Passo

1. **Clonar o Repositório:**
   ```bash
   git clone https://github.com/gabellaurent/mmorpg-Mega.git
   cd mmorpg-Mega
   ```

2. **Instalar Dependências:**
   ```bash
   npm install
   ```

3. **Configurar Variáveis de Ambiente:**
   Crie um arquivo `.env` baseado no `.env.example`:
   ```env
   VITE_SUPABASE_URL=https://sua-url-do-supabase.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-do-supabase
   ```

4. **Executar o Servidor de Desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse no navegador: `http://localhost:5173/`

---

## 💾 Configuração do Banco de Dados (Supabase)

Execute o script contido em `supabase/schema.sql` no Editor de SQL do seu projeto Supabase para criar as tabelas `profiles` e `characters` com as políticas de segurança RLS (Row Level Security).

---

## 🌐 Deploy (Vercel / Netlify)

1. Importe este repositório do GitHub no painel da **Vercel** ou **Netlify**.
2. Adicione as variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Clique em **Deploy**!
