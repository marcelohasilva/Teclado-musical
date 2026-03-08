# Teclado Musical Pro

Projeto de teclado musical em HTML, CSS e JavaScript com visual de workstation e audio via Tone.js.

## Recursos

- Teclado com 8 oitavas (ajustavel por controle).
- Atalhos de teclado (A S D F G H J / W E T Y U).
- Controles: instrumento, oitava, volume, sustain e reverb.
- Layout responsivo com scroll horizontal em telas pequenas.
- Modo paisagem automatico em retrato (celular/tablet).

## Estrutura do projeto

- index.html: layout e estrutura da interface.
- style.css: estilos visuais e responsividade.
- script.js: logica do teclado, audio e interacoes.
- notas/: pasta reservada para samples (nao usada no modo synth).

## Como usar

1. Abra o arquivo index.html no navegador.
2. Clique em "Ativar audio" para liberar o som.
3. Toque nas teclas com mouse, toque ou teclado.

## Controles

- Instrumento: troca o timbre (poly, fm, mono, am).
- Oitava do teclado: define a oitava tocada nos atalhos.
- Oitavas visiveis: muda o numero de oitavas no teclado.
- Volume: ajusta o volume geral.
- Sustain: segura as notas por ate 2s.
- Reverb: ativa ou desativa reverberacao.

## Teclas de atalho

Brancas: A S D F G H J
Pretas: W E T Y U

## Observacoes

- O navegador pode bloquear audio ate interacao do usuario.
- Para melhor desempenho, use um navegador moderno (Chrome/Edge/Firefox).

## Personalizacao rapida

- Tamanho das teclas: ajuste variaveis em :root no style.css.
- Tempo do sustain: altere o timeout em script.js.
- Oitavas visiveis: mude o valor inicial no index.html.
