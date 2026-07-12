# Plano v3 — Radar de Concorrentes (camada de conteúdo + wizard + insights IA)

> Spec para sessão de execução. Worktree `C:\Users\nicol\Voyager\.tmp\radar-aula6`
> (branch `feat/aula-radar-concorrentes`). Base: v2 executado e pushado (775db7c) —
> tema claro soft-shadows, rotas novas, cron semanal.
> Objetivo declarado (usuário, 2026-07-05): "ferramenta jaw-dropping para os alunos"
> + wizard de first setup com as API keys.

## Decisões desta rodada

- **Coleta inteira migra pra AnyAPI** (decisão do usuário, 2026-07-05): TikHub,
  Apify e Firecrawl saem; app passa a exigir só 3 chaves (Supabase ×2 + `ANYAPI_KEY`,
  Anthropic opcional). Contratos dos endpoints substitutos validados ao vivo — ver Fase 1.
- **Transcrição 100% via AnyAPI** (já temos `ANYAPI_KEY`):
  - Reels/vídeos IG: `POST /v1/run/instagram.media_transcript` — **US$ 0,002/request**
    (testado 2026-07-05; retorna `transcripts[].{id,shortcode,text}`). O
    `instagram.reel_transcript` (US$ 0,025 + per-item) só se precisarmos de
    word-level timestamps + metadata completa — 12,5x mais caro, evitar.
  - YouTube: `POST /v1/run/youtube.video_transcript` — **US$ 0,002/request**
    (testado; `output.data.transcript` vem como STRING JSON-encoded de segmentos
    `{text,startMs,endMs,startTimeText}` — precisa de JSON.parse duplo).
  - Sem Whisper, sem actor Apify extra.
- **Inscritos do canal via `youtube.channel`** — US$ 0,002, testado: retorna
  `subscribers`, `videos`, `views`, `channelId` por handle. Resolve a dependência
  do Outlier (Fase 4).
- **Catálogo programático**: `GET https://api.getanyapi.com/v1/apis` (222 APIs,
  campos `slug, priceCredits, perItemCredits`). Conversão validada com 2 medições
  reais: **100.000 credits = US$ 1**. Erro de input inválido responde
  `"(no charge)"` com o schema esperado — ótimo pro botão Testar do wizard.

### Custos validados (2026-07-05, medições reais + catálogo)

| Endpoint | Uso no radar | US$/request |
|---|---|---|
| `instagram.media_transcript` | transcript de reel/post | 0,002 ✅ testado |
| `youtube.video_transcript` | transcript de vídeo | 0,002 ✅ testado |
| `youtube.channel` | inscritos (Outlier) | 0,002 ✅ testado |
| `instagram.reel_transcript` | (evitar — só se word-level) | 0,025 ✅ testado |
| `facebook.company_ads` | fallback ads (já em produção) | 0,002 |
| `facebook.ad_transcript` | transcript de VIDEO AD (Fase 6) | 0,002 |
| `instagram.profile` / `user_posts` | possível substituto TikHub | 0,0033 |
| `youtube.channel_videos` | possível substituto Apify YT | 0,0033 |
| `web.scrape` | possível substituto Firecrawl | 0,0011 |
| `youtube.video_sponsors` | patrocínios dos concorrentes | 0,002 |
| `instagram.reels_search` / `youtube.search` | sweep de nicho limitado | 0,002-0,0033 |
| `tiktok.profile` / `profile_videos` | 3º canal (v4) | 0,0033 |

**Custo por concorrente**: 1ª coleta com conteúdo ≈ US$ 0,014 (5 transcripts IG +
1 YT + canal + ads); coletas seguintes ≈ US$ 0,004 (só canal + conteúdo novo).
5 concorrentes ≈ **US$ 0,10/mês** no cron semanal. Documentar isso pra aluna.
- **Conteúdo é imutável → tabela própria `conteudos`**, nunca dentro de `snapshots.dados`
  (snapshot = métrica mutável; transcript/thumb = busca uma vez, nunca re-paga).
- **Seletivo por cota**: automático só top N (top 5 posts + vídeo em alta + outliers);
  botão "buscar transcrição" manual no detalhe pros demais. ~5-8 requests por
  concorrente na 1ª coleta, ~zero nas seguintes (só conteúdo novo).
- **Thumbs IG/Meta expiram** (CDN assinado) → download na coleta → Supabase Storage
  (self-hosted), path na `conteudos`. Thumbs YouTube (`i.ytimg.com`) são estáveis → hotlink.
- **Chaves continuam só em env var** — wizard valida ao vivo mas não persiste em banco.
- Prompts do compilado Jens que NÃO viram feature (operam sobre material da aluna,
  não sobre concorrentes): algoritmo do nicho, arquivo→conteúdo, content coach,
  clarity gate → viram biblioteca de prompts (Fase 6).

## Fase 1 — Migração da coleta pra AnyAPI (uma chave só)

Contratos validados ao vivo (2026-07-05), todos `POST https://api.getanyapi.com/v1/run/<slug>`
com `Authorization: Bearer $ANYAPI_KEY`; resposta em `{output: {data}, costUsd}`;
input inválido responde 400 com schema esperado e "(no charge)":

| Slug | Input | data retornado | US$ |
|---|---|---|---|
| `instagram.profile` | `{handle}` | `{followers, bio, avatarUrl, posts, verified, displayName}` | 0,002 |
| `instagram.user_posts` | `{handle, cursor?}` | 12 posts `{caption, likes, comments, createdAt (epoch string), url, id}` | 0,002 |
| `youtube.channel` | `{handle}` | `{subscribers, videos, views, channelId}` | 0,002 |
| `youtube.channel_videos` | `{handle\|channelId, sort?}` | 30 vídeos `{title, views, url, id, lengthText, publishedTime relativo}` | 0,002 |
| `web.scrape` | `{url}` | `{markdown, title, description}` | 0,0009 |
| `facebook.company_ads` | `{companyName, status}` | ads (já em produção como fallback — vira primário) | 0,002 |

1. Reescrever `lib/coleta.ts`: helper único `anyapi(slug, body)` (Bearer, retry 3x,
   humanizarErro); manter o shape `DadosColeta` (perfil, posts, videos, site, ads) —
   dashboard e snapshots antigos continuam compatíveis.
2. Gap: `user_posts` não traz `tipo`/`views`/thumb → enriquecer só os top 5 posts com
   `instagram.post {url}` (US$ 0,0033 — dá media URLs + type). Posts não-enriquecidos
   entram como tipo `"post"`.
3. **Bônus 1**: posts ganham data real (`createdAt`) — mata a limitação conhecida do
   TikHub (`taken_at` null); atualizar CLAUDE.md.
   **Bônus 2**: `avatarUrl` do perfil (CDN expira → baixar pro Storage na Fase 2).
4. `/api/estado`, `.env.example` e SETUP.md: removem TIKHUB/APIFY/FIRECRAWL; chaves
   viram `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANYAPI_KEY`
   (+ `ANTHROPIC_API_KEY` opcional, `CRON_SECRET` no deploy).
5. Somar `costUsd` das respostas e gravar custo total da coleta no snapshot
   (`dados.custo_usd`) — alimenta o card de custo no dashboard.

## Fase 2 — Camada de conteúdo

1. `supabase/schema.sql`: tabela `conteudos`
   (id, concorrente_id FK, fonte `instagram|youtube|ads`, chave UNIQUE — code/videoId/hash do ad,
   url, titulo_ou_legenda, transcript text null, transcript_segmentos jsonb null,
   thumb_path text null, buscado_em). RLS on, service role only.
   Bucket Storage `thumbs` (público-leitura).
2. `lib/conteudo.ts`: `buscarTranscript(fonte, url)` via AnyAPI
   (`instagram.media_transcript` / `youtube.video_transcript`, retry + erro humanizado,
   padrão de `lib/coleta.ts`), `salvarThumb(url)` → download → Storage → path,
   `garantirConteudo(concorrente, itens[])` — dedup pela chave, só busca o que não existe.
   Thumb de post IG: vem do enriquecimento `instagram.post` da Fase 1 (media URLs) —
   mesma chamada, custo zero adicional. Avatar do perfil idem (`avatarUrl`).
   Gravar `custo_usd` (campo `costUsd` da resposta AnyAPI) em cada linha de `conteudos`.
3. Integrar na coleta (`lib/coleta.ts` ou pós-coleta em `/api/coletar` e `/api/cron/coletar`):
   após gravar snapshot, `garantirConteudo` para top 5 posts IG + vídeo YouTube em alta
   + criativos de ads. Falha de conteúdo NUNCA derruba a coleta (vai em `snapshots.erros`
   como aviso).
4. `POST /api/conteudo` `{concorrente_id, chave}` — busca manual sob demanda (botão no detalhe).

## Fase 3 — Layout visual (o dashboard ganha cara de produto)

1. `next.config.ts`: `images.remotePatterns` (Supabase Storage + i.ytimg.com).
2. Cards (`CardConcorrente`): top posts com thumb 40x40 (como o mockup soft-shadows
   original), fallback pro quadrado neutro atual quando sem thumb.
3. Detalhe `/concorrente/[id]`: grade visual de posts (thumb + legenda + métricas +
   badge "transcrito"), transcript expansível (`<details>`), botão "buscar transcrição"
   nos itens sem conteúdo.
4. `/anuncios`: criativo visual quando tiver thumb, texto como fallback.

## Fase 4 — Ideias Outlier (YouTube)

1. Coleta YouTube passa a capturar `inscritos` via AnyAPI `youtube.channel`
   (US$ 0,002, testado — retorna `subscribers` por handle).
2. `/ideias`: vídeos dos concorrentes com ratio views/inscritos ≥ 5:1, rankeados por
   ratio, com receipts (link, views, inscritos, data) + transcript quando existir.
   Entra na sidebar como "💡 Ideias". Honestidade no vazio: explicar que o filtro só
   varre canais cadastrados (sweep de nicho inteiro = fora de escopo, custo imprevisível).
3. Card de ideia com "por que passou no filtro" em linguagem de aluna.

## Fase 5 — Wizard de first setup

1. Detecção de first-run: sem concorrentes E chaves faltando → `/` redireciona pra `/setup/wizard`.
2. `/setup/wizard` multi-step (client), só 3 passos de chave: Supabase (URL + service role)
   → AnyAPI → Anthropic (opcional, rotulada "Insights IA"). Cada passo: onde pegar a chave
   (link + 2 linhas), campo pra colar, botão **Testar** → `POST /api/validar-chave`
   `{fonte, chave}` (testa contra o provedor server-side, NÃO persiste, não loga).
3. Passo final: gera bloco `.env.local` pronto (copy + download) + instruções Vercel
   env vars + cadastro do 1º concorrente + coleta de teste com log — termina no
   dashboard vivo.
4. `/setup` atual ganha link "refazer wizard".

## Fase 6 — Insights IA + biblioteca de prompts

1. `ANTHROPIC_API_KEY` opcional em `/api/estado`; páginas IA mostram estado
   "configure a chave pra ativar" quando ausente.
2. `/posicionamento`: análise white-space — envia pra Claude API bio + site.markdown +
   transcripts + ads de todos os concorrentes; retorna mapa de promessas (o que está
   saturado, o que ninguém ocupa, recomendação de posição com as palavras exatas dos
   concorrentes citadas). Cache do resultado em tabela `analises` (re-gera só sob demanda
   ou quando snapshot novo) — nunca por page-view.
3. Sidebar: "🧭 Posicionamento".
   (A biblioteca de prompts saiu daqui — virou pack de skills, Fase 7.)

## Fase 7 — Pack de skills (Claude + Codex, só esses dois)

Skills da aluna moram no repo do projeto em `.agents/skills/<nome>/SKILL.md`
(fonte única), com descoberta dupla:
- Claude Code: referenciadas no `CLAUDE.md` do projeto (padrão já usado nos skills
  `divos-*` deste repo) — ou junction pra `.claude/skills/` se preferirem nativo.
- Codex: referenciadas no `AGENTS.md` do projeto (mesmos arquivos, zero duplicação).
- Corpo de cada SKILL.md ≤ ~1.000 tokens; detalhe vai em `references/`.

Skills do pack da aluna:
1. `radar-setup` — first setup guiado: onde pegar cada uma das 3 chaves, como testar,
   troubleshooting dos chips de erro (espelho do wizard).
2. `radar-coleta` — operar coleta com segurança: custo real por coleta, cotas,
   significado de cada chip, quando re-coletar.
3. `radar-analise` — ler outliers, tendências e "o que mudou"; gerar resumo semanal.
4. `content-coach` — prompt 08 do compilado como skill: puxa top posts + transcripts
   do radar da aluna (Supabase) e roda o coaching sobre material real.
5. `arquivo-para-conteudo` — prompt 07: arquivo→famílias de conteúdo.
6. `clarity-gate` — prompt 01: grade de clareza pro funil.
7. `algoritmo-do-nicho` — prompt 04: pesquisa do algoritmo com nicho/tamanho já
   preenchidos a partir dos dados do radar.

Skill nossa (skillshare da máquina, fora do repo público):
- `anyapi-radar` — contratos validados: 8 endpoints com schema real, conversão
  100.000 credits = US$ 1, padrão `{output:{data}, costUsd}`, erro 400 "(no charge)"
  com schema. A sessão de execução da v3 usa essa skill direto.

## Stretch (só se sobrar sessão)

- `/hooks`: primeiras linhas das legendas dos top posts rankeadas por engajamento,
  padrões nomeados via IA quando chave presente.

## Modo de execução (diretriz do usuário, 2026-07-05)

- **Agentes em plano de fundo**: delegar trabalho pesado a subagentes — exploração/grep
  com `haiku`, implementação com `sonnet`, orquestração no modelo principal.
  Fases independentes (ex.: Fase 5 wizard e Fase 4 outlier) podem rodar em paralelo
  via subagentes após a Fase 1 estabilizar o contrato da coleta.
- **Cadência**: uma fase por vez como unidade de verificação — subagente entrega,
  orquestrador verifica (tsc + build + teste real), commita, só então avança.
- **Checkpoint de custo**: requests AnyAPI reais só na verificação de fase, nunca
  em loop de desenvolvimento (mock/fixture local com os schemas documentados acima).
- Dev server na porta 3000 pode estar aberto de sessão anterior — derrubar antes
  de qualquer `npm run build`.

## Verificação (cada fase)

- `npx tsc --noEmit` e `npm run build` limpos (NUNCA build com dev server aberto).
- Fase 1: coleta real de 1 concorrente via AnyAPI; conferir snapshot com mesmo shape
  do formato antigo (dashboard renderiza sem mudança) + custo somado em `dados.custo_usd`.
- Fase 2: `conteudos` populada + thumb no Storage.
- Fase 5: wizard completo com chaves reais do `.env.local` (caminho feliz e chave inválida).
- Fase 6: `/posicionamento` com dados reais; sem `ANTHROPIC_API_KEY` a página degrada
  com instrução, não com erro.
- Commits atômicos por fase, push no remote kursku.

## Decidir depois (viáveis agora, fora do v3 por foco)

- **Sweep de nicho limitado no Outlier**: `youtube.search`/`instagram.reels_search` a
  US$ 0,002-0,0033/busca tornaram viável o que era caro via Apify — N buscas por
  keyword do nicho, cap fixo, custo previsível.
- **`youtube.video_sponsors`** (US$ 0,002): detectar patrocínios nos vídeos dos
  concorrentes — "quem monetiza com quem" no Posicionamento.
- **`facebook.ad_transcript`** (US$ 0,002): transcrever video ads dos concorrentes →
  alimenta o Posicionamento com a promessa falada, não só o texto.
- **TikTok/Threads/Google Ads** como canais novos (endpoints prontos no catálogo).

## Fora de escopo v3
- Whisper/transcrição própria (AnyAPI cobre)
- Autenticação (v-próxima)
- Chaves persistidas em banco (regra: env var only)

## Pós-execução

- Atualizar PRODUCT.md, CLAUDE.md, SETUP.md (wizard vira o caminho principal)
- Recapturar screenshots do material da aula (pendência herdada da v2)
- Handoff Amanda: escopo novo + custo por request do AnyAPI documentado
