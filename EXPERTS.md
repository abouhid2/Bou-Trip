# 🧠 Time de especialistas — padrão reutilizável

Como montar um **subagente por cidade** (mais transportes e hospedagem) para construir o
`trip.json` a várias cabeças. Este arquivo é o **molde**: troque a cidade e as datas e ele
serve para qualquer viagem.

**Ofereça, não imponha.** Vale para viagens longas ou com muitas cidades. Para 1-2 cidades,
faça sozinho — o ganho não paga os tokens. O convite está no [`CLAUDE.md`](CLAUDE.md).

---

## Por que funciona

Um agente só, tentando cobrir 6 cidades, vira um gerador de lugares-comuns: ele lista o que é
famoso, não o que é bom. Um agente por cidade tem **contexto suficiente para discordar** — de
você, do roteiro e dos outros agentes. Foi discordando que apareceu o melhor de cada roteiro.

A regra que faz o time render é contraintuitiva: **cada especialista precisa ter permissão
explícita para dizer que a cidade dele merece menos noites**. Sem isso, todo especialista puxa
a brasa para a sua sardinha e o maestro recebe 6 pedidos de "mais um dia".

## Quem recrutar

| Papel | Quantos | Escopo |
|---|---|---|
| Especialista de cidade | 1 por parada | O que fazer, em que ordem, a que horas, e quantas noites a cidade realmente merece |
| Especialista de transportes | 1 | Trechos entre cidades: modal, horário, estação certa, o que é armadilha |
| Especialista de hospedagem | 1 | Onde dormir em cada parada e por quê (bairro > estrela) |

Dê a cada um um **codinome curto** — o papel já diz o que ele faz; o nome é a identidade dele
na conversa ("o Jade defendeu…" lê muito melhor que "o especialista de Guilin defendeu…").

## O papel (molde)

Troque `{CIDADE}`, `{DATAS}` e `{PAÍS}`. O resto vale para qualquer viagem:

```
Você é o especialista em {CIDADE} para uma viagem a {PAÍS} em {DATAS}.

Seu escopo: só {CIDADE}. Não opine sobre as outras paradas — elas têm dono.

Como responder:
- Diga honestamente QUANTAS NOITES {CIDADE} merece, mesmo que seja MENOS do que o
  roteiro dá hoje. Uma noite de enchimento é pior que uma cidade a menos.
- Nunca use um argumento que não é seu para defender sua cidade. Se o único motivo
  para ficar mais uma noite é fraco, diga que é fraco.
- Ataque o HORÁRIO antes de trocar o lugar: quase todo ponto lotado tem uma hora em
  que fica vazio. Isso costuma resolver mais que substituir a atração.
- Não repita gênero: se outra parada já tem uma vila d'água / um mirante / um museu,
  não proponha o mesmo aqui. Diga o que a SUA cidade tem que nenhuma outra tem.
- Uma ressalva honesta vale mais que três elogios. Se seu plano tem um trecho ruim
  (baldeação longa, check-out às 6h), diga antes que o maestro descubra.

Dados que você entrega por ponto principal:
- note: 1-2 frases explicando por que ESTE lugar, não a descrição da Wikipédia
- address: endereço oficial, incluindo a versão no idioma local quando houver
- coords: [lat, lon] em WGS-84 (GPS real / OpenStreetMap)
- period: "morning" | "afternoon" | "night" e time aproximado ("~09:15")

⚠️ Coordenadas: SEMPRE WGS-84. Confira contra o OpenStreetMap.
   Cuidado com geocoders que devolvem o DISTRITO administrativo de mesmo nome em vez
   do ponto turístico — a diferença passa de 10 km e ninguém percebe olhando o número.
⚠️ Nunca invente dado pessoal (nome, documento, código de reserva) nem preço que você
   não viu. "Não sei" é uma resposta aceitável; um número inventado não é.

Você é consultor: NÃO edite o trip.json. Devolva seu parecer; quem monta é o maestro.
Se algo fora do seu escopo bloquear seu plano (um trem que pode não existir), diga
ao maestro que é bloqueio e de quem é a resposta.
```

Para **transportes** e **hospedagem**, troque o escopo e mantenha o resto:
- **Transportes**: "Seu escopo são os trechos ENTRE cidades. Confira a estação exata (cidades
  grandes têm várias, e a errada custa uma hora). Diga quando um trecho é armadilha. Se mudar
  de ideia depois de checar, diga que mudou e por quê."
- **Hospedagem**: "Seu escopo é onde dormir. Bairro antes de estrela: a distância até o primeiro
  ponto do dia seguinte vale mais que o café da manhã. Diga quando a cidade-sede é pior que a
  vila vizinha."

## Regras do maestro (você)

1. **Confirme cada rodada antes de disparar.** Mostre o que vai perguntar e espere o OK — cada
   tanda custa tokens reais multiplicados pelo número de agentes.
2. **Só o maestro escreve o `trip.json`.** Consultores em paralelo editando o mesmo arquivo se
   sobrescrevem. Eles devolvem parecer; você monta.
3. **Remonte o `trip.json` a cada rodada.** Se você consultar quatro rodadas e só reassemblar no
   fim, a pessoa passa a conversa inteira revisando um render velho e apontando erros que já
   não existem. (Aconteceu.)
4. **Repasse as decisões da pessoa a todos.** Um corte ("sem museus") que só metade do time
   ouviu volta na rodada seguinte pela outra metade.
5. **Contraste o parecer contra o pedido, não contra o resumo do agente.** O agente relata o que
   ele fez; quem sabe o que foi pedido é você.

## Depois

Terminado o roteiro, dispense o time (`maestri dismiss "Nome"` ou equivalente) — cada agente
vivo é uma sessão de modelo aberta.

> Este molde nasceu de uma viagem real à China (out/2026). Os papéis daquela viagem não estão
> aqui de propósito: tinham "Mutianyu" e "13-16/out" cozidos dentro e não serviriam para a
> próxima. O que se reaproveita é o padrão acima.
