---
name: clarity-gate
description: Use antes de a aluna publicar página de vendas, email, legenda, bio ou anúncio — quando o texto parece difícil, cheio de jargão, ou ela quer garantir que uma criança de ~10 anos entenderia.
---

# clarity-gate — Gate de Clareza do Funil

Use antes de publicar qualquer página, email, legenda ou anúncio. Palavras difíceis não convencem — confundem. Texto simples vende mais.

> **Régua PT-BR:** "5ª série" = texto que uma criança de ~10 anos consegue ler sem travar. Frases curtas, palavras do dia a dia, sem jargão. Simples não significa sem personalidade.

## O que passar pelo gate

- Páginas de vendas e landing pages
- Emails e sequências de nutrição
- Legendas de posts e anúncios
- Bio e descrição de perfis

## Workflow (4 passos + gate permanente)

1. **Ler e classificar** — o LLM lê cada peça e dá uma nota de nível de leitura. Monta a lista: cada peça, sua nota, piores primeiro.
2. **Reescrever o que passou da linha** — tudo acima da 5ª série vira texto simples. A oferta, as afirmações e a sua voz ficam; o jargão, as frases longas e as palavras "chiques" saem. Mostrar antes e depois de cada peça.
3. **Onde não dá para simplificar** — se uma frase precisa ser técnica, coloca a versão em palavras simples logo ao lado, em vez de "simplificar e perder o significado".
4. **Reconfirmar** — relê o funil reescrito e confirma que tudo passou.

**Gate permanente:** instala uma verificação rápida para usar em cada peça nova antes de publicar. O LLM avalia a nota, sinaliza as linhas que passaram do limite e sugere a reescrita. Nada sai sem passar.

## Regras

- Simples não é sem graça. A oferta continua afiada — as palavras ficam menores.
- Se uma reescrita perde significado, o LLM sinaliza em vez de publicar assim mesmo.
- Dica: passe primeiro sua peça de melhor performance pelo gate. Se até ela não passar, é prova de que o resto do funil precisa do tratamento.

## Sem dados do radar

Essa skill não usa dados do Supabase — ela age diretamente sobre textos que você cola ou aponta na conversa.

## Referência

Prompt original em inglês: `references/prompt-original.md`
