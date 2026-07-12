# PRODUCT.md — Radar de Concorrentes

## O que é
Dashboard de benchmarking de concorrentes para criadoras de conteúdo (alunas do Clube
Divos da IA). Usuária em tarefa: revisar a semana dos concorrentes e decidir o próprio
conteúdo. Registro: **product** (ferramenta, não marketing).

## Usuária
Criadora de conteúdo não-técnica. Fluente em Instagram, não em dados. Precisa de
leitura em 30 segundos: quem cresceu, o que performou, o que fazer.

## Register e tom visual
- Product / Restrained. Light UI "Soft Shadows" (variante escolhida no Stitch,
  2026-07-05), Inter como família única, escala fixa rem.
- Paleta clara humanizada: bg creme `#fff7ec`, painéis brancos `#ffffff` com
  sombras suaves (borda `#e8e1d7`), texto grafite quente `#2a2020`,
  acentos coral `#e8a89e` (destaques/estado), gold `#d4a574` (dados),
  berry `#741e31` (ação primária), verde `#7bb583` só para positivo/sucesso.
- Acento é estado e dado, nunca decoração. Sombras suaves no lugar de bordas duras.

## Estrutura de navegação
- Shell fixo: top bar (logo, tabs, Configurações, CTA berry "Coletar agora")
  + sidebar (Visão Geral `/`, Competidores `/concorrentes`, Tendências
  `/tendencias`, 💡 Ideias `/ideias`, 🧭 Posicionamento `/posicionamento`,
  Anúncios `/anuncios`, Configurações `/setup`).
- First-run: sem chaves configuradas, `/` redireciona pro wizard `/setup/wizard`
  (3 passos de chave com teste ao vivo + geração do .env.local).
- `/ideias`: vídeos outlier (views ≥ 5x inscritos do canal) = temas validados
  pelo público. `/posicionamento`: análise white-space via Claude API (opcional,
  exige `ANTHROPIC_API_KEY`), cache em banco, regenera só sob demanda.
- Conteúdo imutável (transcripts + thumbs) em tabela própria `conteudos` —
  busca uma vez via AnyAPI (~US$ 0,002/transcript), nunca re-paga.
- Detalhe por concorrente em `/concorrente/[id]`: gráfico de linha temporal
  (SVG puro), seção "O que mudou" (diff dos 2 últimos snapshots), histórico
  de top posts, todos os anúncios.
- Seletor de período (7/30/90 dias/tudo) no dashboard e no detalhe.
- Coleta automática semanal via Vercel Cron (`/api/cron/coletar` + `CRON_SECRET`).

## Hierarquia de informação (ordem de leitura)
1. Deltas desde a última coleta (quem se moveu)
2. Comparativo entre concorrentes (barras)
3. Detalhe por concorrente (top posts, vídeo, anúncios)
4. Saúde da coleta (status por fonte — visível mas discreto; erro de cota ≠ erro do usuário)

## Regras específicas
- Erro de fonte nunca em vermelho-pânico: chip por fonte com causa em linguagem humana
  ("créditos da AnyAPI esgotados — recarregue em getanyapi.com").
- Empty states ensinam o próximo passo (→ /setup).
- Números formatados pt-BR compacto (1,2 mi). Tabular-nums em métricas.
- Motion: só transição de estado 150-200ms; reduced-motion respeitado.
