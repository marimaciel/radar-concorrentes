---
name: radar-coleta
description: Use quando a aluna vai disparar uma coleta manual, quer entender o custo em créditos, vê chip de erro na coleta (instagram/youtube/ads/401/429/timeout), ou não entende como funciona o cron semanal.
---

# radar-coleta — Operar a Coleta com Segurança

Use quando a aluna quiser entender custos, disparar uma coleta manual ou diagnosticar chips de erro na coleta.

## Custo real (medido em 2026-07-05)

| Situação | Custo por concorrente |
|----------|-----------------------|
| 1ª coleta (com conteúdo — transcripts + enriquecimento) | ~US$ 0,014 |
| Coletas seguintes (só dados novos) | ~US$ 0,004 |
| 5 concorrentes, cron semanal (1 mês) | ~US$ 0,10 |

O custo de cada coleta fica registrado em `dados.custo_usd` no banco — você pode ver no histórico.

## Quando re-coletar

- **Automático (recomendado):** o cron roda toda segunda às 08h (horário de Brasília) via Vercel. Não precisa fazer nada — só configurar o `CRON_SECRET` uma vez (veja o SETUP.md).
- **Manual — quando faz sentido:**
  - Um concorrente lançou algo relevante hoje e você quer ver agora
  - A coleta automática falhou (chip aparece com ✘ no /setup)
- **Evite:** coletar várias vezes no mesmo dia sem motivo — cada coleta consome créditos do AnyAPI.

## Como disparar uma coleta manual

No app: botão **▶ Coletar agora** na barra do topo (ou dentro de `/setup`).

Você pode coletar todos os concorrentes de uma vez ou um por vez clicando no ícone individual.

## Chips de erro da coleta

| Chip | O que aconteceu | O que fazer |
|------|----------------|-------------|
| `instagram ✘` | AnyAPI instável ou sem crédito no IG | Tente de novo (o app já tenta 3x automaticamente) |
| `youtube ✘` | Mesmo motivo, canal do YouTube | Tente de novo |
| `ads: pulado` | Concorrente sem página no Facebook ou campo vazio | Normal — não é erro; só preencha o campo `facebook_page` se souber |
| `401` no log | Chave `ANYAPI_KEY` inválida ou expirada | Gere uma nova chave em getanyapi.com |
| `429` no log | Muitas requisições em pouco tempo (rate limit) | Aguarde alguns minutos e tente de novo |
| `timeout` no log | Conexão lenta ou AnyAPI fora do ar | Tente novamente mais tarde |

## Falha parcial não derruba a coleta

Se o Instagram falhar mas o YouTube funcionar, o snapshot é gravado com o que funcionou — a falha fica registrada em `erros` e você vê o chip de alerta. O histórico não é perdido.

## CRON_SECRET — para que serve

O `CRON_SECRET` é uma senha que protege a rota `/api/cron/coletar`. Sem ela, qualquer pessoa com a URL do seu Radar poderia disparar coletas e gastar seus créditos. Configure uma vez na Vercel e esqueça — a Vercel envia a senha automaticamente toda segunda.
