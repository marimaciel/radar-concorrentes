# Plano v2 — Radar de Concorrentes (port Soft Shadows + interatividade + tracking longo)

> Spec para sessão de execução. Trabalhar no worktree `C:\Users\nicol\Voyager\.tmp\radar-aula6`
> (branch `feat/aula-radar-concorrentes`) — o checkout principal do divos-da-ia está ocupado
> por outra sessão. Skills do plugin `stitch-skills` disponíveis a partir desta sessão.

## Decisão de design (usuário, 2026-07-05)

Variante escolhida: **Soft Shadows 1** (light, humanizada, paleta Amanda clara).

**Fontes de verdade (em `docs/stitch-variantes/`):**
- `code.html` — HTML/CSS completo da tela escolhida. **É a referência de port** (tokens claros,
  sombras, componentes). Extrair as CSS variables daqui.
- `screen.png` — screenshot em alta da tela escolhida (conferência visual).
- `DESIGN.md` — ATENÇÃO: contém o design system DARK original ("Obsidian Pulse") do projeto
  Stitch, não os tokens claros. Usar só para tipografia/spacing/regras de componente;
  cores vêm do `code.html`.
- Projeto Stitch: `projects/8259580764416891543`, tela soft-shadows-1 = `screens/f50fca33f431482dbf13f26a3b483a90`
  (variante 2 do mesmo estilo: `screens/fd293046d388401cb68c1f911021e928`).

**Estrutura visual a portar:** top bar (logo + tabs Dashboard/Relatórios/Insights + Configurações
+ CTA berry "Coletar agora") · sidebar (Visão Geral, Competidores, Tendências, Anúncios, Arquivo,
item ativo em pill coral) · faixa de resumo 4 stats · painel "Comparativo direto" (barras finas
arredondadas) · grid "Radares ativos" (cards com avatar circular, sparkline, 4 métricas, chips de
fontes verdes/vermelho, top posts com thumb, anúncios ativos) · fundo creme, painéis brancos,
sombras suaves em vez de bordas duras.

## Fase 1 — Port do layout (maior peça)

1. `app/globals.css`: substituir tokens pelo tema claro extraído do `code.html`
   (fundo creme ~#faf6f0/#fff8f0, painéis #fff, texto grafite quente, berry/coral/gold/verde
   mantidos). Manter `prefers-reduced-motion` e focus-visible.
2. Componentizar: `components/Sidebar.tsx`, `TopBar.tsx`, `ResumoStrip.tsx`, `CardConcorrente.tsx`,
   `Barra.tsx`, `Sparkline.tsx`, `Chips.tsx` (hoje tudo inline em `app/page.tsx`).
3. `app/layout.tsx`: shell com top bar + sidebar (sidebar = navegação real entre rotas).
4. Manter TODA a informação atual do card (métricas, deltas, taxa engaj, coment/post,
   engajamento por formato, top posts, vídeo em alta, anúncios, chips com erros humanizados).
5. Dados reais continuam vindo do Supabase — nada de mock; textos do code.html são placeholder.

## Fase 2 — Interatividade e novas páginas

1. `/` (Visão Geral) — o dashboard portado.
2. `/concorrente/[id]` (Competidores) — detalhe: gráfico de linha temporal dos snapshots
   (seguidores + engajamento, SVG ou recharts — decidir na sessão; preferir SVG puro, zero deps),
   histórico de top posts, todos os anúncios.
3. Seletor de período (client component): 7/30/90 dias/tudo — filtra snapshots nas consultas.
4. `/tendencias` — ranking de crescimento (Δ seguidores/semana), quem acelerou/desacelerou.
5. `/anuncios` — agregado de criativos ativos de todos os concorrentes.
6. "Coletar agora" na top bar dispara a coleta (mesma lógica do /setup) com feedback inline.
7. `/setup` vira "Configurações" (mesma página, visual novo).

## Fase 3 — Tracking longo

1. Vercel cron semanal: `vercel.json` com cron chamando `GET /api/cron/coletar`
   (rota nova que itera concorrentes; proteger com `CRON_SECRET`).
2. Seção "O que mudou" no detalhe do concorrente: diff entre os 2 últimos snapshots —
   bio alterada, título/oferta do site alterado, anúncios novos/removidos (comparar arrays).
3. `SETUP.md`: documentar cron + CRON_SECRET.

## Verificação (cada fase)

- `npx tsc --noEmit` limpo e `npm run build` limpo (NUNCA rodar build com dev server aberto —
  corrompe `.next`; parar o dev antes).
- Teste visual vs `screen.png`.
- E2E: coleta real já validada (Supabase self-hosted `supabase.nickbargiela.com.br`,
  tabelas criadas; `.env.local` do worktree completo, incl. `ANYAPI_KEY`).
- Commits atômicos por fase no branch `feat/aula-radar-concorrentes` (push no remote kursku).

## Fora de escopo v2

- Autenticação (v3 / aula avançada)
- Mobile-first (grid responsivo básico basta)
- Alterar coleta/fallbacks (prontos: TikHub, Apify→RSS, Apify→AnyAPI)

## Pós-execução

- Atualizar `PRODUCT.md` (tema claro, novas páginas) e `CLAUDE.md` do projeto
- Atualizar roteiro/guia/material-aluno se screenshots mudarem de cara
- Avisar Amanda (handoff) que o visual mudou antes de ela criar o repo público
