# Admin Painel - Frontend

Painel administrativo frontend usando React, TypeScript, Vite e Supabase. Usa o mesmo contexto de autenticação do servidor principal.

## 🚀 Instalação

```bash
cd AdminPainel
npm install
```

## ⚙️ Configuração

As credenciais do Supabase ficam no arquivo `.env` (mesmo projeto do VenuzBET - Front):
- **URL**: `https://psoyhrnjnalroihnswoo.supabase.co`
- **VITE_SUPABASE_URL** e **VITE_SUPABASE_ANON_KEY** — frontend (`src/lib/supabase.ts`)
- **SUPABASE_SERVICE_KEY** — API Express (`index.js`), se usar o backend do painel

## 🏃 Executando

### Modo desenvolvimento:
```bash
npm run dev
```

O servidor de desenvolvimento estará disponível em `http://localhost:3002`

### Build para produção:
```bash
npm run build
```

### Preview da build:
```bash
npm run preview
```

## 📋 Funcionalidades

### 🔐 Autenticação
- Login com verificação de permissões de administrador
- Usa o mesmo contexto de autenticação do Supabase do servidor principal
- Apenas usuários com `cargo = 'admin'` podem acessar

### 📊 Dashboard
- Estatísticas gerais do sistema
- Total de usuários cadastrados
- Total de transações processadas
- Saldo total dos usuários
- Resumo financeiro (apostas, ganhos, lucro líquido)

### 👥 Gerenciamento de Usuários
- Lista todos os usuários cadastrados
- Busca por email ou CPF
- Visualização de saldo, cargo e data de cadastro
- Edição de saldo dos usuários

### 💳 Transações
- Lista todas as transações de jogos
- Filtro por tipo (Ganhou/Perdeu)
- Busca por jogo, ID de transação ou usuário
- Visualização detalhada de cada transação

## 🔒 Permissões

- Apenas usuários com `cargo = 'admin'` na tabela `usuarios` podem acessar o painel
- O contexto de autenticação verifica automaticamente as permissões ao fazer login
- Rotas protegidas redirecionam para login se não autenticado ou sem permissões

## 🛠️ Tecnologias

- **React 18** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **React Router** - Roteamento
- **Supabase** - Backend e autenticação
- **Tailwind CSS** - Estilização
- **Lucide React** - Ícones

## 📁 Estrutura

```
AdminPainel/
├── index.html              # HTML principal
├── package.json
├── vite.config.ts          # Configuração do Vite
├── tsconfig.json           # Configuração TypeScript
├── tailwind.config.js      # Configuração Tailwind
├── eslint.config.js        # Configuração ESLint
└── src/
    ├── main.tsx            # Entry point
    ├── App.tsx              # Componente principal e rotas
    ├── index.css           # Estilos globais
    ├── vite-env.d.ts       # Tipos do Vite
    ├── lib/
    │   └── supabase.ts     # Configuração do Supabase
    ├── contexts/
    │   └── AuthContext.tsx # Contexto de autenticação
    ├── components/
    │   ├── Layout.tsx      # Layout com sidebar
    │   └── LoadingSpinner.tsx
    └── pages/
        ├── LoginPage.tsx    # Página de login
        ├── DashboardPage.tsx # Dashboard com estatísticas
        ├── UsersPage.tsx    # Gerenciamento de usuários
        └── TransactionsPage.tsx # Lista de transações
```

## 📝 Notas

- Este frontend usa as mesmas credenciais do Supabase do servidor principal
- A autenticação é compartilhada - usuários logados no servidor principal podem usar o mesmo login aqui
- Todas as operações são feitas diretamente no Supabase usando o cliente JavaScript
- O frontend roda na porta 3002 por padrão (diferente do servidor principal)

## 🎨 Interface

O painel possui:
- Sidebar com navegação
- Design responsivo e moderno
- Cards de estatísticas no dashboard
- Tabelas com busca e filtros
- Modais para edição de dados
- Feedback visual para ações do usuário







