# Setup — Radar de Concorrentes

App Next.js + Supabase. Os dados ficam no banco: fechar a sessão não perde nada,
e cada coleta vira um snapshot — com o tempo você enxerga a evolução dos concorrentes.

> Configure primeiro as variáveis de autenticação abaixo e crie seu usuário no Supabase. O app exige login antes de abrir as páginas do Radar.

## 1. Criar o banco (Supabase) — 5 min

1. Entre em [supabase.com](https://supabase.com) → **New project** (nome: `radar-concorrentes`)
2. Menu lateral → **SQL Editor** → cole o conteúdo de `supabase/schema.sql` → **Run**
3. Menu lateral → **Project Settings → API** e copie:
   - **Project URL** → vai virar `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable key** → vai virar `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **Secret key** → vai virar `SUPABASE_SERVICE_ROLE_KEY` (somente servidor)
4. Menu lateral → **Authentication → Users → Add user**: crie seu usuário do Radar com e-mail e senha.
5. Em **Authentication → URL Configuration**, use `http://localhost:3000` como Site URL e adicione `http://localhost:3000/**` em Redirect URLs.

## 2. Chave da API de coleta

Uma chave só cobre tudo (Instagram, YouTube, site e anúncios):

| Chave | Onde pegar | Custo |
|-------|-----------|-------|
| `ANYAPI_KEY` | [getanyapi.com](https://getanyapi.com) → Dashboard → API Keys | ~US$ 0,014 por concorrente na 1ª coleta; ~US$ 0,004 nas seguintes (5 concorrentes ≈ US$ 0,10/mês no cron semanal) |
| `ANTHROPIC_API_KEY` *(opcional)* | [console.anthropic.com](https://console.anthropic.com) → API Keys | só para os Insights IA — o app funciona sem |

## 3. Rodar no seu computador

```
copie .env.local.example para .env.local e preencha as variáveis obrigatórias
npm install
npm run dev
```

Preencha `RADAR_ALLOWED_EMAIL` com o mesmo e-mail do usuário autorizado criado no Supabase. Abra `http://localhost:3000/login` e entre com esse e-mail e senha.

Depois do login, abra `http://localhost:3000/setup` para cadastrar concorrentes e disparar coletas.

## 4. Publicar na internet (Vercel) — 10 min

1. Suba o projeto para um repositório no GitHub (o `.gitignore` já protege suas chaves)
2. Em [vercel.com](https://vercel.com) → **Add New Project** → importe o repositório
3. Em **Settings → Environment Variables**, adicione as variáveis do `.env.local` uma por vez, incluindo `RADAR_ALLOWED_EMAIL`
4. **Deploy** → pronto: seu radar tem uma URL própria, acessível de qualquer lugar

> Mantenha o cadastro público de novos usuários desativado no Supabase e configure `RADAR_ALLOWED_EMAIL` para autorizar somente sua conta.

## 5. Coleta automática semanal (Vercel Cron) — opcional

O projeto já traz um `vercel.json` que agenda uma coleta automática toda
segunda-feira às 08:00 (horário de Brasília), chamando `GET /api/cron/coletar`.

1. Gere um segredo qualquer (ex.: rode `openssl rand -hex 16` ou invente uma senha longa)
2. Na Vercel, em **Settings → Environment Variables**, adicione `CRON_SECRET` com esse valor
3. Faça um novo deploy — a Vercel passa a chamar a rota semanalmente, enviando
   o header `Authorization: Bearer <CRON_SECRET>` automaticamente
4. Para conferir: aba **Cron Jobs** do projeto na Vercel mostra as execuções

> Sem `CRON_SECRET` configurado a rota responde erro e ninguém consegue
> disparar sua coleta por fora — o segredo é obrigatório.

## Dia a dia

- **Coletar:** botão ▶ **Coletar agora** na barra do topo (ou automático via cron semanal)
- **Analisar:** dashboard mostra deltas (▲▼) comparando com a coleta anterior
- **Adicionar concorrente:** `/setup`, formulário — sem editar arquivo nenhum

## Problemas comuns

| Sintoma | Causa provável |
|---------|----------------|
| Badge `supabase ✘` no /setup | `.env.local` sem URL/key ou faltou reiniciar `npm run dev` |
| Coleta com `instagram ✘` | AnyAPI instável (tente de novo — já tem retry) ou sem crédito |
| `ads: pulado` | Concorrente sem página no Facebook / campo vazio |
| Dashboard vazio | Nenhuma coleta ainda — dispare no /setup |
