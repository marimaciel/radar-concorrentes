# Radar de Concorrentes

Projeto de referência da Aula 6 do Clube Divos da IA. App Next.js + Supabase
(padrão das aulas da Amanda: planner, sistema-financeiro). Coleta dados públicos
de concorrentes e guarda cada coleta como snapshot — histórico permanente.

## Stack

- Next.js 15 (App Router, TS) + Supabase (Postgres) + deploy Vercel
- Coleta server-side 100% via AnyAPI (getanyapi.com): Instagram, YouTube, Meta Ads Library e site —
  chave única `ANYAPI_KEY`; resposta padrão `{output:{data}, costUsd}`, custo somado em `dados.custo_usd`
- Sem autenticação na v1 (demo de aula); chaves só em env vars server-side

## Estrutura

| Path | Papel |
|------|-------|
| `app/page.tsx` | Visão Geral: resumo, comparativo, grid de cards, seletor de período |
| `app/concorrentes/page.tsx` | Lista de competidores com sparkline, linka pro detalhe |
| `app/concorrente/[id]/page.tsx` | Detalhe: gráfico temporal SVG, "O que mudou", top posts, anúncios |
| `app/tendencias/page.tsx` | Ranking Δ seguidores/semana, acelerando/desacelerando |
| `app/anuncios/page.tsx` | Criativos ativos agregados de todos os concorrentes |
| `app/setup/page.tsx` | Configurações: chaves (status), CRUD concorrentes, coleta com log |
| `app/layout.tsx` | Shell: TopBar + Sidebar fixos (tema claro soft-shadows) |
| `components/` | TopBar, Sidebar, ColetarAgora, ResumoStrip, CardConcorrente, Barra, Sparkline, Chips, GraficoLinha, OQueMudou, SeletorPeriodo |
| `app/api/concorrentes` | GET/POST/DELETE na tabela `concorrentes` |
| `app/api/coletar` | POST {id} — coleta 1 concorrente (4 fontes em paralelo), grava snapshot |
| `app/api/cron/coletar` | GET — coleta todos (Vercel Cron semanal, exige `CRON_SECRET`) |
| `app/api/estado` | Presença das chaves (booleano) + última coleta |
| `lib/coleta.ts` | Lógica de coleta (port testado de `_v1-local/coletar.mjs`) |
| `lib/ui.ts` | fmt pt-BR, CORES, tempoRelativo, filtro de período |
| `supabase/schema.sql` | Tabelas `concorrentes` e `snapshots` (RLS on, acesso via service role) |
| `vercel.json` | Agenda do cron (segunda 08:00 BRT) |
| `SETUP.md` | Passo a passo da aluna (Supabase → chaves → local → Vercel → cron) |
| `docs/stitch-variantes/` | Design de referência (code.html + screen.png = fonte do tema claro) |
| `_v1-local/` | Versão 1 (scripts locais + HTML estático) — referência histórica |

## Comandos

```
npm run dev     # localhost:3000 (/setup para configurar)
npm run build   # verificação
```

## Skills

Skills da aluna em `.agents/skills/` — abra qualquer uma perguntando ao LLM "use a skill X":

| Skill | Path | Quando usar |
|-------|------|-------------|
| `radar-setup` | `.agents/skills/radar-setup/SKILL.md` | First setup: onde pegar as 3 chaves, rodar schema.sql, testar via wizard, troubleshooting dos chips |
| `radar-coleta` | `.agents/skills/radar-coleta/SKILL.md` | Operar coleta com segurança: custo real, quando disparar manual, chips de erro, CRON_SECRET |
| `radar-analise` | `.agents/skills/radar-analise/SKILL.md` | Ler o radar: outliers /ideias, tendências, "O que mudou", posicionamento, roteiro semanal |
| `content-coach` | `.agents/skills/content-coach/SKILL.md` | Coaching do seu próprio conteúdo: lê tudo, entrevista, diagnostica vícios com exemplos reais, uma mudança |
| `arquivo-para-conteudo` | `.agents/skills/arquivo-para-conteudo/SKILL.md` | Arquivo → próximo trimestre: mapeia temas recorrentes, escolhe 10 peças fortes, remonta cada uma como família (thread + newsletter + 3 shorts) |
| `clarity-gate` | `.agents/skills/clarity-gate/SKILL.md` | Gate de clareza: avalia nível de leitura, reescreve acima da 5ª série, instala verificação permanente antes de publicar |
| `algoritmo-do-nicho` | `.agents/skills/algoritmo-do-nicho/SKILL.md` | Deep research do algoritmo no seu nicho: separa regras de mitos, playbook de 5 regras com prova, protocolo de teste — rodar por trimestre |

## Regras

- Só dados públicos; coleta semanal máx (cotas)
- Chave nunca vai ao browser — API /estado retorna só booleanos
- Falha por fonte não derruba coleta: vai em `snapshots.erros`
- Posts do Instagram têm data real (`createdAt` do AnyAPI `instagram.user_posts`) — a antiga
  limitação do TikHub (`taken_at` null) morreu na migração; vídeos do YouTube têm data aproximada
  (convertida de "3 weeks ago")
