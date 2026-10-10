# CS ARENA 🏆
### Sistema Completo de Campeonatos de Counter-Strike 2 (5x5 Mata-mata)

Plataforma web profissional para gestão e realização de torneios de Counter-Strike 2 (CS2) em formato **mata-mata / eliminação simples**, com **inscrição individual**, **roleta animada oficial com aleatoriedade criptográfica**, **formação de equipes de 5 jogadores**, **gerenciamento de reservas auditados** e **chaveamento automático com propagação de BYEs até a grande final e consagração do campeão**.

---

## 🚀 Tecnologias Utilizadas

- **Frontend:** [Vite](https://vitejs.dev/) + [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Estilização e Design:** [Tailwind CSS](https://tailwindcss.com/), design gamer premium (escuro, detalhes em laranja CS2, cyan e âmbar), microanimações e contrastes de esports.
- **Ícones & Efeitos:** [Lucide React](https://lucide.dev/), [Canvas-Confetti](https://www.npmjs.com/package/canvas-confetti), Web Audio API sintetizador de som para roleta e vitórias (sem depender de arquivos de áudio externos).
- **Backend:** Vercel Functions (Node.js/TypeScript) sob `/api`, arquitetura RESTful com validação, controle de acesso e auditoria.
- **Banco de Dados:** [Neon Console / Neon PostgreSQL](https://neon.tech/) Serverless com schema isolado `cs_arena`.
- **Acesso ao Banco:** [Drizzle ORM](https://orm.drizzle.team/) e `@neondatabase/serverless`.
- **Autenticação & Segurança:** Sessões HTTP-only seguras, senhas criptografadas com `bcryptjs`, tokens JWT assinados via Web Crypto (`jose`), proteção RBAC no servidor com bloqueio HTTP 401/403 para ações não autorizadas.
- **Testes Automatizados:** [Vitest](https://vitest.dev/) com suíte completa de testes unitários e testes de integração E2E contra o Neon.
- **Hospedagem & Deploy:** [Vercel](https://vercel.com/) com suporte a SPA deep links sem conflito com endpoints `/api`.

---

## 📋 Regras de Negócio e Algoritmos

1. **Inscrição Individual:**
   - Participantes se inscrevem informando Nickname, Steam ID (opcional), função preferida (AWP, Entry, Support, IGL, Flex) e Skill Rating.
   - Bloqueio estrito de inscrições duplicadas no mesmo campeonato.
2. **Formação de Equipes (5x5):**
   - Para $N$ participantes: são formadas $\lfloor N / 5 \rfloor$ equipes completas de 5 jogadores.
   - Os $N \pmod 5$ jogadores restantes são alocados transparentemente como **Reservas** auditados.
   - É exigido um mínimo de 10 inscritos (2 equipes completas) para autorizar o início do campeonato 5x5.
   - Algoritmos disponíveis:
     - **100% Aleatório:** Embaralhamento Fisher–Yates com `crypto.randomInt` (aleatoriedade criptograficamente segura, nunca `Math.random()`).
     - **Balanceado:** Snake draft ordenado por skill rating para equalizar o nível total das equipes.
     - **Por Capitães:** Os melhores jogadores lideram cada elenco como capitães.
3. **Roleta Oficial (Exigência Central):**
   - O sorteio oficial é executado e persistido **atomicamente no servidor Neon** antes do início da animação visual.
   - A interface do usuário apenas reproduz a sequência persistida com efeitos de desaceleração suave, ticks mecânicos a cada fatia e fanfarra com confetes.
   - Suporte a modo tela cheia para transmissões de streaming / OBS Clean Feed (`/tournaments/:id/live`).
4. **Chaveamento Mata-mata (Eliminação Simples):**
   - A chave é dimensionada para $P = 2^{\lceil \log_2(T) \rceil}$ posições.
   - Equipes excedentes recebem **BYEs** distribuídos por seeding padrão. Partidas com BYE avançam o time automaticamente sem computar vitória disputada de ranking.
   - Séries em MD1, MD3 e MD5.
   - Empates em mapas de CS2 são proibidos (regras de prorrogação).
   - O vencedor avança automaticamente para o slot correspondente da próxima rodada até a Grande Final.

---

## 🛠️ Instalação e Execução Local

### 1. Clonar o Repositório
```bash
git clone https://github.com/Trigueiro17/Cs-Arena.git
cd "Cs-Arena"
```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:
```env
DATABASE_URL=postgresql://neondb_owner:npg_YCe9IGASuJM4@ep-small-pine-acofea18-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
AUTH_SECRET=cs-arena-super-secure-jwt-secret-key-2026-production
APP_URL=http://localhost:5173
```

### 4. Executar Migrações do Banco
Cria o schema isolado `cs_arena` e todas as tabelas, índices e constraints no Neon:
```bash
npm run db:migrate
```

### 5. Executar Seed de Desenvolvimento
Popula o banco com o usuário administrador, jogadores realistas de CS2 e torneios de 8, 15, 30, 40, 43 e 75 inscritos:
```bash
npm run db:seed
```

### 6. Iniciar Servidor de Desenvolvimento
Inicia o Vite dev server com middleware da API no mesmo host:
```bash
npm run dev
```
Acesse no navegador: `http://localhost:5173`

---

## 🔑 Credenciais de Demonstração

| Perfil | E-mail | Senha | Papel |
|---|---|---|---|
| **Administrador** | `admin@csarena.com` | `admin123` | Cria torneios, opera roleta, aprova placares |
| **Jogador Teste** | `player@csarena.com` | `player123` | Visualiza e se inscreve |

*(Na tela de login, há botões de 1 clique para preencher automaticamente as credenciais de teste).*

---

## 🧪 Testes Automatizados

O projeto conta com suíte automatizada cobrindo todos os cenários obrigatórios:
```bash
npm test
```

### Cenários validados com sucesso:
- **4 inscritos:** 0 equipes, 4 reservas, bloqueia início de torneio 5x5 com mensagem explicativa.
- **10 inscritos:** 2 equipes, final direta.
- **15 inscritos:** 3 equipes, chave de 4 posições com 1 BYE.
- **20 inscritos:** 4 equipes, semifinais e final.
- **30 inscritos:** 6 equipes, chave de 8 posições com 2 BYEs.
- **40 inscritos:** 8 equipes, quartas, semifinais e final sem BYEs.
- **43 inscritos:** Exatamente 8 equipes completas de 5 e 3 reservas auditados, 0 jogadores duplicados.
- **75 inscritos:** 15 equipes, chave de 16 com 1 BYE.
- **Segurança RBAC:** Usuário comum tentando ações de administrador recebe **HTTP 403 Forbidden**.
- **Regras de MD3:** Série com apenas 1 mapa não declara vitória nem avança equipe. Empate em mapa de CS2 é rejeitado.
- **Demo Real de Aceitação (43 Jogadores):** Execução do sorteio, geração de chaveamento, simulação de 4 vitórias nas quartas, 2 nas semis e consagração do campeão na final com persistência real no Neon PostgreSQL.

---

## 🌐 Deploy na Vercel

O projeto foi configurado com `vercel.json` contendo regras de rewrite:
- As rotas `/api/(.*)` são tratadas pela Vercel Function Serverless (`/api/index.ts`).
- Todas as rotas profundas da SPA (`/tournaments/:id/bracket`, `/admin/tournaments/:id/draw`, etc.) carregam diretamente `/index.html` sem sequestrar requisições de API nem gerar erro 404 ao recarregar a página.

Variáveis a configurar nas configurações do projeto na Vercel:
- `DATABASE_URL` = sua string de conexão Neon
- `AUTH_SECRET` = segredo para assinatura de tokens JWT
