import { createClient } from "@supabase/supabase-js";

export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local");
  return createClient(url, key, { auth: { persistSession: false } });
}

export type Concorrente = {
  id: string;
  nome: string;
  instagram: string | null;
  youtube: string | null;
  site: string | null;
  ads_query: string | null;
  criado_em: string;
};

export type Snapshot = {
  id: string;
  concorrente_id: string;
  coletado_em: string;
  seguidores: number | null;
  eng_medio: number | null;
  dados: DadosColeta;
  erros: Record<string, string> | null;
};

export type Post = {
  code: string | null;
  url: string | null;
  // "post" = não enriquecido (user_posts não traz o tipo de mídia)
  tipo: "foto" | "video" | "carrossel" | "post";
  legenda: string;
  likes: number;
  comentarios: number;
  views: number | null;
  data?: string | null; // ISO — createdAt real do AnyAPI
  thumb?: string | null; // URL CDN (expira — Fase 2 baixa pro Storage)
};

export type Video = {
  titulo: string;
  views: number | null;
  data: string | null;
  url: string | null;
  id?: string | null; // videoId — usado pra transcript
};

export type DadosColeta = {
  avisos?: Record<string, string>;
  custo_usd?: number; // soma dos costUsd da coleta (AnyAPI)
  perfil?: {
    username: string;
    nomeCompleto: string | null;
    seguidores: number;
    totalPosts: number;
    bio: string;
    avatarUrl?: string | null;
  };
  posts?: Post[];
  videos?: Video[];
  canal?: { inscritos: number | null; channelId: string | null };
  site?: { url: string; titulo: string | null; markdown: string };
  ads?: {
    pagina: string | null;
    texto: string;
    ativoDesde: string | null;
    id?: string | null;
    link?: string | null;
    plataformas?: string[] | null;
    formato?: string | null;
    ativoAte?: string | null;
  }[];
};

// Fase 2 — linha da tabela `conteudos`
export type Conteudo = {
  id: string;
  concorrente_id: string;
  fonte: "instagram" | "youtube" | "ads";
  chave: string;          // shortcode IG / videoId YT / hash do ad
  url: string | null;
  titulo_ou_legenda: string | null;
  transcript: string | null;
  transcript_segmentos: any[] | null; // segmentos YT {text,startMs,endMs,startTimeText}
  thumb_path: string | null;          // path no bucket `thumbs`
  custo_usd: number | null;
  buscado_em: string;
};
