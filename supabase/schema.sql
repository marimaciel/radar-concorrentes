-- Radar de Concorrentes — rodar no SQL Editor do Supabase

create table if not exists concorrentes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  instagram text,
  youtube text,
  site text,
  ads_query text,
  criado_em timestamptz not null default now()
);

create table if not exists snapshots (
  id uuid primary key default gen_random_uuid(),
  concorrente_id uuid not null references concorrentes(id) on delete cascade,
  coletado_em timestamptz not null default now(),
  seguidores integer,
  eng_medio integer,
  dados jsonb not null,
  erros jsonb
);

create index if not exists snapshots_concorrente_data
  on snapshots (concorrente_id, coletado_em desc);

-- Acesso só pelo servidor (service role). Nenhuma policy pública.
alter table concorrentes enable row level security;
alter table snapshots enable row level security;

-- ---------------------------------------------------------------- Fase 2: conteúdos
-- Bucket Storage `thumbs` (público-leitura) é criado pelo código na primeira necessidade.

create table if not exists conteudos (
  id uuid primary key default gen_random_uuid(),
  concorrente_id uuid not null references concorrentes(id) on delete cascade,
  fonte text not null check (fonte in ('instagram', 'youtube', 'ads')),
  chave text not null,         -- shortcode IG / videoId YT / hash do ad
  url text,
  titulo_ou_legenda text,
  transcript text,             -- texto corrido (IG: concat de transcripts[].text; YT: segmentos.map(s=>s.text).join(" "))
  transcript_segmentos jsonb,  -- array de segmentos YT {text,startMs,endMs,startTimeText}; null para IG/ads
  thumb_path text,             -- path no bucket `thumbs` (<chave>.jpg)
  custo_usd numeric,
  buscado_em timestamptz not null default now(),
  unique (concorrente_id, fonte, chave)
);

create index if not exists conteudos_concorrente
  on conteudos (concorrente_id, fonte, buscado_em desc);

-- Acesso só pelo servidor (service role). Nenhuma policy pública.
alter table conteudos enable row level security;

-- ---------------------------------------------------------------- Fase 6: análises IA
create table if not exists analises (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,                       -- ex: 'posicionamento'
  resultado text not null,                  -- markdown gerado
  snapshot_ids uuid[],                      -- snapshots usados como insumo
  custo_tokens_in int,
  custo_tokens_out int,
  gerado_em timestamptz not null default now()
);

create index if not exists analises_tipo_data
  on analises (tipo, gerado_em desc);

-- Acesso só pelo servidor (service role). Nenhuma policy pública.
alter table analises enable row level security;
