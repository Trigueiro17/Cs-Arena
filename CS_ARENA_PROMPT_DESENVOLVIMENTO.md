# PROMPT MESTRE — CS ARENA
## Sistema completo de campeonato Counter-Strike 2 — Vite + React + TypeScript + Vercel + Neon PostgreSQL

> **Instrução para a IA desenvolvedora:** atue como uma equipe sênior de arquitetura de software, frontend, backend, banco de dados, segurança, testes e UX/UI. Construa um projeto **real, executável e completo**, não apenas mockups. Gere os arquivos de código, configurações, migrações, testes, documentação e instruções de instalação. Não substitua funcionalidades por botões decorativos, dados fixos ou telas falsas. Se o ambiente impedir alguma integração, implemente a estrutura funcional e documente exatamente o que falta configurar. Não declare que testou algo que não executou.

## 1. Objetivo
Construir o **CS ARENA**, plataforma web para campeonatos de Counter-Strike 2 (CS2) em formato **mata-mata / eliminação simples**. Os participantes se inscrevem **individualmente**, uma **roleta animada** realiza o sorteio para formar **equipes de cinco jogadores**, outra etapa sorteia os confrontos, e os vencedores avançam automaticamente pela chave até a final e o campeão. A quantidade de inscritos é variável.

**Stack obrigatória:**
- Frontend: Vite, React, TypeScript.
- UI: Tailwind CSS, shadcn/ui, Lucide React, Motion for React; responsiva e em português do Brasil.
- Backend: Vercel Functions (Node.js/TypeScript) sob `api/`, sem expor credenciais.
- Banco: **Neon Console / Neon PostgreSQL**.
- Acesso ao banco: Drizzle ORM e `@neondatabase/serverless`, considerando o runtime serverless.
- Validação: Zod; formulários: React Hook Form.
- Estado/cache: TanStack Query; Zustand somente para estados locais relevantes.
- Testes: Vitest, React Testing Library e testes de integração para a lógica de campeonato.
- Hospedagem: Vercel; versionamento: GitHub.
- Não usar Supabase e não exigir Next.js.
- Autenticação administrativa segura, com sessão HTTP-only, proteção CSRF conforme arquitetura, controle de permissões no servidor e hash seguro de senhas, ou provedor de auth compatível claramente configurado.

## 2. Experiência visual
Design gamer premium, inspirado em torneios de esports, sem copiar marcas registradas nem usar imagens sem licença. Fundo escuro, detalhes em laranja e azul, tipografia legível, cards, animações suaves, ícones consistentes, estados de carregamento/erro/vazio, contrastes acessíveis. Menu lateral desktop, navegação adaptada a mobile. Modo tela cheia da roleta e do chaveamento para OBS/streaming, compartilhamento de link público apenas para leitura. Animar giro da roleta de modo que o resultado **já tenha sido decidido pelo servidor** antes da animação; compatibilidade com usuários que preferem movimento reduzido.

## 3. Perfis e permissões
- **Administrador:** cria/edita campeonato, aprova inscrição, executa sorteios, altera membros antes de travar equipes, registra placares, corrige resultados de forma auditada, conclui/cancela campeonatos.
- **Jogador:** inscreve-se, acompanha status, equipe, confrontos e histórico; pode editar dados permitidos.
- **Visitante:** vê torneios públicos, chaves e resultados, sem alterar informações.
- Separar autenticação de autorização. API nunca aceita ações de administrador apenas por ocultar botões no frontend.

## 4. Telas e rotas
1. `/` — landing/dashboard público (torneios atuais, próximos jogos, campeões recentes).
2. `/login` — autenticação; `/admin` — visão geral de gestão.
3. `/admin/tournaments` e `/admin/tournaments/new` — gestão/criação de torneios.
4. `/tournaments/:id` — página pública de torneio, regras, status, inscrições e equipes.
5. `/tournaments/:id/register` — formulário de inscrição individual e termos.
6. `/admin/tournaments/:id/registrations` — aprovar inscrições, espera, desistências, busca e filtros.
7. `/admin/tournaments/:id/draw` — roleta e formação dos times; sorteio dos confrontos; confirmação.
8. `/tournaments/:id/teams` — lista das equipes, elenco, capitão, reservas e pontuação opcional.
9. `/tournaments/:id/bracket` — chave responsiva, zoom/pan, rodadas, BYEs, vencedor destacado.
10. `/admin/matches/:id` — placares por mapa, seleção/veto conforme modo, confirmação e evidências.
11. `/tournaments/:id/live` — visualização pública para transmissão (roleta/chave/placares).
12. `/players/:id` — perfil e histórico público permitido.
13. `/admin/settings` — regras padrão, papéis e configurações.

Todas as telas devem exibir dados reais do banco através da API, ter mensagens claras e tratar falhas.

## 5. Regras de inscrição e equipes
- Identificação de jogador: UUID, nickname obrigatório, Steam ID opcional, avatar opcional, função preferida (AWP, Entry, Support, IGL, Flex), nível/skill rating opcional; Steam ID não substitui login sem autenticação Steam apropriada.
- Não permitir inscrição duplicada do mesmo jogador no mesmo campeonato; validar nomes, limites, status e elegibilidade.
- Campeonato aceita quantidade variável de jogadores, mas **cada equipe ativa tem exatamente cinco jogadores**.
- Para N jogadores elegíveis, formar `floor(N / 5)` equipes completas; os `N % 5` demais ficam na lista de **reservas**, seguindo política de reserva transparente e auditada. Não descartar inscritos sem informação.
- Se houver menos de **duas equipes completas**, impedir início de um campeonato 5x5 e explicar o motivo.
- Sorteio de equipes: (a) totalmente aleatório com chances iguais, (b) balanceado por habilidade declarado como modo diferente, (c) capitães selecionados e escolha alternada. Modos devem ser independentes, não chamar um sorteio balanceado de totalmente aleatório.
- Capitão opcional por equipe. Mudanças de elenco após confirmação exigem permissão, justificativa, regras explícitas de substituição por reservas e auditoria; travar alteração após início salvo procedimento autorizado.
- Se houver 10, 15, 20, 30, 40, 43 ou 75 inscritos, o sistema deve tratar corretamente as equipes, reservas e a chave.

## 6. Sorteio por roleta — exigência central
- Roleta visual de alta qualidade, com nomes/nicknames, avatares opcionais, ponteiro, desaceleração, efeitos sonoros com controle de volume/mudo, contagem regressiva opcional, confetes e destaque do sorteado.
- Sorteio oficial ocorre **no backend**, com aleatoriedade criptograficamente segura (`crypto.randomInt` ou equivalente, utilizando Fisher–Yates correto). Não usar `Math.random()` para resultados oficiais.
- Antes de animar, API realiza a seleção atomicamente e salva evento, candidatos elegíveis, ordem/resultado, operador, timestamp, identificador de sorteio e versão das regras. UI apenas reproduz o resultado já persistido.
- Garantir que jogador sorteado para uma equipe não entre em outra; usar transações, constraints e mecanismo de idempotência para requisições duplicadas.
- Opções: sortear passo a passo por jogador ou tudo de uma vez; pausar animação visual (sem alterar resultado); modo apresentação e confirmação final.
- Reexecução de sorteio confirmado é restrita, exige motivo e autorização e nunca sobrescreve silenciosamente o sorteio anterior; preservar histórico.
- Segunda roleta sorteia confrontos/posições iniciais da chave. O resultado deve ser único, verificável e não manipulável por quem está assistindo.
- Para sorteio balanceado, implementar algoritmo explícito, testável e documentado (ex.: alocação para minimizar diferença entre totais de skill). Informar visualmente que não é sorteio uniforme.

## 7. Chaveamento mata-mata
- Eliminação simples: perdeu confronto, eliminado; venceu, avança automaticamente para slot definido na próxima rodada.
- Número de equipes pode não ser potência de 2. Criar chave com `nextPowerOfTwo(teamCount)` posições e aplicar **BYEs** distribuídos por sorteio transparente ou seeding configurado. Nunca eliminar uma equipe apenas para fechar potência de dois.
- BYE significa avanço automático, **não** vitória disputada; não contar no ranking como jogo vencido.
- Evitar partidas BYE × BYE e assegurar que cada equipe alcance uma posição válida na chave. Se houver apenas 2 equipes, final direta.
- Preencher confrontos da primeira fase; gerar rodadas posteriores; preservar vínculo de `next_match_id` e `next_match_slot` (A/B) ou modelagem equivalente robusta.
- Partidas MD1, MD3 e MD5: respectivamente 1, 2 ou 3 mapas ganhos para vencer série. Registrar mapas, placares, vencedores, status, horários, links de transmissão e evidências.
- Não permitir empate final de mapa ou série nem vencedor fora do confronto. Atualização de resultado deve ocorrer em transação: validar série, finalizar confronto, avançar vencedor e atualizar estado da chave.
- Não avançar incorretamente o mesmo time duas vezes. Impedir partidas novas antes de resolver dependências. Corrigir resultado com rodadas posteriores exige fluxo seguro (bloquear automaticamente ou invalidar descendentes mediante aprovação explícita e auditoria).
- Estados: `draft`, `registration_open`, `registration_closed`, `drawing`, `in_progress`, `completed`, `cancelled`. Definir transições autorizadas e validações.
- Finalizar torneio automaticamente ao concluir a grande final; destacar campeão, vice e estatísticas corretas.

## 8. Banco Neon PostgreSQL e migrações
Criar schema SQL/Drizzle com PK UUID, FKs, índices, constraints, timestamps UTC, unicidades e políticas de integridade:
- `users` / `sessions` (ou tabelas do provedor auth escolhido).
- `players` (nickname, steam_id opcional, avatar_url, preferred_role, skill_rating).
- `tournaments` (name, slug, format, team_size default 5, best_of, max_players opcional, status, rules, created_by, dates).
- `registrations` (tournament_id, player_id, status, registered_at; UNIQUE(tournament_id, player_id)).
- `teams` (tournament_id, name, captain_id opcional, seed opcional, status).
- `team_members` (team_id, player_id, tournament_id, joined_at; garantir unicidade por torneio, inclusive via constraint/índice composto adequado).
- `bracket_rounds` (tournament_id, round_number, name).
- `matches` (round_id, bracket_position, team_a_id, team_b_id, next_match_id, next_match_slot, winner_id, best_of, status, dates, version).
- `match_maps` (match_id, order_number, map_name, score_a, score_b, winner_id; UNIQUE(match_id, order_number)).
- `draws` (tournament_id, type, status, algorithm, options, performed_by, executed_at, idempotency_key, audit hash/metadata).
- `draw_results` (draw_id, player_id opcional, team_id opcional, bracket_position opcional, selection_order).
- `audit_logs` (actor_id, action, entity_type, entity_id, before, after, created_at).
- Tabelas auxiliares: `tournament_rules`, `map_pool`, `match_evidence`, substituições e convites, se necessários.

Impor que um jogador não fique em duas equipes do mesmo campeonato; lidar com concorrência em transações. Não guardar credenciais no banco em texto puro. Criar migrações versionadas e seed **somente de desenvolvimento** com dados fictícios, incluindo torneios de 8, 15, 30, 40 e 43 jogadores.

## 9. API segura
Implementar rotas REST na pasta `/api` com validação Zod, tipos compartilhados, paginação, filtros, códigos HTTP corretos, tratamento consistente de erros, auth/roles, rate limiting apropriado e registros de auditoria.
Endpoints esperados (pode adaptar caminhos mantendo a semântica):
- `GET/POST /api/tournaments`, `GET/PATCH /api/tournaments/:id`.
- `POST /api/tournaments/:id/register`, `GET /api/tournaments/:id/registrations`.
- `POST /api/tournaments/:id/close-registration`.
- `POST /api/tournaments/:id/draw-teams` e `POST /api/tournaments/:id/draw-bracket`.
- `GET /api/tournaments/:id/teams`, `GET /api/tournaments/:id/bracket`.
- `GET /api/matches/:id`, `POST /api/matches/:id/results`, `POST /api/matches/:id/confirm`.
- `GET /api/tournaments/:id/audit` (somente admins autorizados).
- Auth endpoints de acordo com a solução escolhida.

Como algumas funções serverless podem rodar concorrentemente, incluir transações e idempotência em operações de sorteio, encerramento de inscrição e avanço de chave. Para sincronismo ao vivo, iniciar com atualização por polling/SWR com invalidação eficiente; posteriormente adicionar solução realtime compatível com serverless, sem pressupor conexões WebSocket persistentes em Vercel Functions.

## 10. Vercel + Neon: implantação
- Projeto único com frontend Vite e funções em `api/`; frontend build output `dist`.
- Configurar roteamento para SPA de modo que páginas React carreguem via navegação direta **sem sequestrar endpoints `/api`**. Testar fallback e assets no deploy.
- Usar `DATABASE_URL` somente no servidor, com string de conexão segura/pooler quando apropriado; configurar no Vercel Project Settings ou pela integração Neon.
- Frontend pode ter `VITE_PUBLIC_*` apenas para configurações que sejam realmente públicas. **Nunca usar `VITE_DATABASE_URL`, `VITE_DATABASE_PASSWORD` ou chave secreta no cliente.**
- Criar `.env.example` sem valores reais, `.gitignore`, `README.md` com setup local, variáveis, migrações, seed de desenvolvimento, comandos de execução e implantação.
- Preferir migrações realizadas em etapa controlada do deploy/CI, não a cada request da Function.
- Logs úteis sem expor segredos, cuidados com limites e cold starts da Vercel.
- Documentar conexão Neon e branches de banco para desenvolvimento/teste quando viável.

Exemplo de variáveis (somente nomes/pseudo-valores):
```env
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
AUTH_SECRET=replace-with-strong-secret
APP_URL=http://localhost:5173
```

## 11. Casos de teste obrigatórios
Automatizar testes para:
1. 4 inscritos: 0 equipes, 4 reservas, não inicia torneio 5x5.
2. 10 inscritos: 2 equipes, final direta.
3. 15 inscritos: 3 equipes; chave de 4 posições com 1 BYE.
4. 20 inscritos: 4 equipes; semifinais e final.
5. 30 inscritos: 6 equipes; chave de 8 posições com 2 BYEs.
6. 40 inscritos: 8 equipes; quartas, semifinais e final.
7. 43 inscritos: 8 equipes e 3 reservas.
8. 75 inscritos: 15 equipes; chave de 16 posições com 1 BYE.
9. Duplo clique no botão sortear / requests simultâneas: apenas um sorteio oficial válido.
10. Repetição de jogador em times diferentes: bloqueada.
11. Usuário sem papel de admin tentando encerrar/confirmar: HTTP 403.
12. Resultado inválido, série MD3 com só um mapa vencido, vencedor ausente: não avança.
13. Alteração da final após encerramento: bloqueada ou processo formal auditado.
14. Reload de página: participantes, roleta confirmada e chave permanecem iguais.
15. Acesso direto às rotas SPA na Vercel e chamadas `/api` sem conflito.

## 12. Entregáveis exigidos
1. Código-fonte completo do projeto; nenhuma dependência de código fictício para o fluxo principal.
2. Estrutura de pastas coerente, componentes reutilizáveis e responsabilidades separadas.
3. Banco Drizzle schema + migrações + seeds de teste.
4. Implementação funcional de cadastro, inscrição, roleta, times, confrontos, placares, avanço e campeão.
5. Autenticação/controle de acesso, segurança mínima de produção e trilha de auditoria.
6. Configuração Vercel, `.env.example`, README, comandos de instalação, execução, testes e deploy.
7. Testes automatizados e resumo com resultados realmente obtidos.
8. Lista de pendências reais, limitações e próximos passos, sem apresentar mockups como se fossem funcionalidades prontas.

## 13. Ordem de execução solicitada
**Priorize uma jornada vertical utilizável antes de efeitos avançados.**
- Etapa A: inicializar Vite/React/TS, UI e rotas; definir contratos de API.
- Etapa B: configurar Neon, Drizzle, migrações, autenticação e permissões.
- Etapa C: criar campeonato, jogadores e inscrições.
- Etapa D: sorteio seguro de equipes com roleta visual e reservas.
- Etapa E: sorteio de confrontos, BYEs e chaveamento automático.
- Etapa F: resultados MD1/MD3/MD5 e avanço até o campeão.
- Etapa G: página pública/OBS, auditoria, acessibilidade, testes e deploy.

## 14. Critério de aceitação final (demo real)
Demonstrar com **43 inscrições**: gerar **8 equipes completas** e **3 reservas**; sortear 4 confrontos; registrar 4 vencedores nas quartas, 2 nas semifinais e 1 na final; exibir campeão; persistir estado no Neon; permitir recarregar sem perder informação. Mostrar que um usuário não-admin não pode alterar resultado, que o sorteio não duplica jogadores e que a aplicação abre diretamente uma rota profunda publicada na Vercel.

## 15. Instrução final para a IA
Comece implementando, não apenas descrevendo. Apresente decisões arquiteturais breves e siga para **criar os arquivos reais**. Onde for necessário um segredo, use variável de ambiente e indique como configurar na Neon Console/Vercel; jamais peça para colar senhas em código frontend. Não use dados simulados no fluxo de produção. Se houver limitações do ambiente, entregue o máximo de código funcional, enumere exatamente os passos restantes e não afirme que fez deploy, executou testes ou conectou ao Neon sem evidência.
