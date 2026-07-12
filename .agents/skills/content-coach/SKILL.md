---
name: content-coach
description: Use quando a aluna quer feedback honesto do próprio conteúdo, sente que caiu no piloto automático, ou quer saber qual único ajuste mais eleva o que ela publica.
---

# content-coach — Coaching de Conteúdo Real

Use quando quiser olhar para o seu próprio conteúdo com olhos de fora: entender onde você travou no piloto automático, o que já funciona de verdade, e qual é a única mudança que mais importa agora.

## Como puxar o seu material

O radar guarda os dados de quem está cadastrado como **concorrente** — mas você pode cadastrar o seu próprio perfil. Assim o app coleta seus posts, legendas e transcripts da mesma forma.

**Opção A — cadastrar seu próprio perfil no radar:**
1. Abra `/setup` → clique em "Adicionar concorrente"
2. Coloque seu próprio usuário do Instagram e/ou canal do YouTube
3. Clique em "Coletar agora" — o radar vai buscar seus últimos posts e vídeos
4. Peça ao LLM: "puxe meus últimos 20 conteúdos da tabela `conteudos` onde o `concorrente_id` for o meu"

**Opção B — export manual:**
- Baixe seus posts/vídeos como arquivo de texto, pasta ou link
- Cole o caminho ou os textos direto na conversa com o LLM

## Workflow (5 passos)

1. **Ler tudo primeiro** — o LLM lê cada peça sem julgar. Anota padrões: como você abre, como estrutura, como fecha, o que repete quando está sem ideia.
2. **Entrevista** — para cada peça: o que você estava tentando fazer, para quem era, o que você achava que funcionou. O LLM compara a intenção com o que a peça realmente faz.
3. **Diagnóstico** — os vícios que enfraquecem o seu conteúdo, com 3 exemplos reais tirados do seu material. Nome do vício + as linhas exatas + o que fazer diferente.
4. **Crédito pelo que funciona** — os movimentos que você deve fazer mais, com exemplos. Importante: para você não se "consertar" e virar outra pessoa.
5. **Uma única mudança** — o ajuste que levanta tudo que você fizer depois, mais como praticar nos 3 próximos conteúdos.

## Regras

- Específico, não gentil. O LLM cita suas próprias linhas de volta para você.
- Se algo é bom, ele diz por quê, para você repetir de propósito.
- Sem invenção: cada achado precisa ter um exemplo real do seu material.
- Repita a cada 20 peças novas e compare com o relatório anterior.

## Referência

Prompt original em inglês: `references/prompt-original.md`
