-- =========================================================
-- ESQUEMA DO BANCO DE DADOS - MMORPG WEB (TIBIA STYLE)
-- =========================================================

-- 1. Tabela de Perfis de Usuário (vinculada à auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Personagens
CREATE TABLE IF NOT EXISTS public.characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT UNIQUE NOT NULL,
    sprite_id TEXT NOT NULL DEFAULT 'knight',
    map_id TEXT NOT NULL DEFAULT 'map-1',
    x INT NOT NULL DEFAULT 16,
    y INT NOT NULL DEFAULT 16,
    direction TEXT NOT NULL DEFAULT 'south',
    level INT NOT NULL DEFAULT 1,
    hp INT NOT NULL DEFAULT 100,
    max_hp INT NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

-- Políticas para Profiles
CREATE POLICY "Leitura pública de perfis" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Usuários podem atualizar próprio perfil" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Usuários podem inserir próprio perfil" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas para Characters
CREATE POLICY "Leitura pública de personagens" ON public.characters
    FOR SELECT USING (true);

CREATE POLICY "Usuários criam seus personagens" ON public.characters
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários atualizam seus personagens" ON public.characters
    FOR UPDATE USING (auth.uid() = user_id);

-- Trigger para atualizar automaticamente a coluna updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_characters_updated_at
    BEFORE UPDATE ON public.characters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
