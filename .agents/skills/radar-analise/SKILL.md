---
name: radar-analise
description: Use quando a aluna abriu o Radar e não sabe o que fazer com os dados (/ideias, /tendencias, "O que mudou" no detalhe, /posicionamento) ou quer montar o resumo semanal de conteúdo.
---

# radar-analise — Ler o Radar e Agir

Use quando a aluna quiser extrair insights do Radar para planejar conteúdo ou entender o que os concorrentes estão fazendo.

## O que cada página mostra

### /ideias — Temas validados pelo público
Lista vídeos dos concorrentes com **ratio views/inscritos ≥ 5** — ou seja, vídeos que performaram muito acima do esperado para o tamanho do canal.

**Como ler:**
- Ratio 8 = o vídeo teve 8x mais views que o número de inscritos do canal → o tema ressoou com pessoas de fora do canal (Reels, busca, indicação)
- Quanto maior o ratio, mais o tema "furou a bolha"
- Quando tem transcript disponível, você pode ler o roteiro do vídeo direto no app

**O que fazer com isso:** um tema com ratio alto de um concorrente é forte evidência de que o público quer esse assunto. Não copie. Adapte para a sua voz e ângulo.

> Atenção: o filtro só analisa canais que você cadastrou. Ele não varre o YouTube inteiro.

### /tendencias — Quem está crescendo (ou encolhendo)
Ranking dos concorrentes por Δ seguidores/semana — a variação entre a coleta atual e a anterior.

- Seta verde ▲ = crescendo
- Seta vermelha ▼ = perdendo seguidores
- Se um concorrente acelerou muito de repente, vale investigar o que postou naquela semana

### Detalhe do concorrente — "O que mudou"
Dentro de `/concorrente/[id]`: seção **O que mudou** compara a coleta mais recente com a anterior.

Mostra variações em seguidores, posts, vídeos novos e anúncios ativos. É o lugar para identificar movimentos pontuais: "lançou uma campanha de ads esta semana", "parou de postar vídeos".

### /posicionamento — Análise de espaço em branco (requer chave Anthropic)
Envia bio, site e transcripts de todos os concorrentes para a IA e retorna:
- O que está **saturado** no nicho (todo mundo fala)
- O que **ninguém ocupa** (oportunidade de posicionamento)
- Recomendação com as palavras exatas que os concorrentes usam

Se a chave `ANTHROPIC_API_KEY` não estiver configurada, a página mostra as instruções para ativar — o resto do app funciona normalmente.

---

## Roteiro do resumo semanal (15 min toda segunda)

1. Abra `/tendencias` → note quem cresceu e quem encolheu
2. Abra `/ideias` → veja os 3 temas com maior ratio esta semana
3. Para cada tema interessante, clique para abrir o vídeo e leia o transcript (se disponível)
4. Abra o detalhe dos 2 concorrentes que mais se movimentaram → leia "O que mudou"
5. Anote 3 aprendizados:
   - Um tema a testar no seu canal
   - Um movimento dos concorrentes para ficar de olho
   - Uma lacuna de posicionamento que você pode ocupar

Com esses 3 pontos você já tem pauta para a semana.
