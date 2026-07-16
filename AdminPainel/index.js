import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import adminRoutes from './src/routes/admin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração do Supabase (mesmas credenciais do VenuzBET - Front)
const supabaseUrl = process.env.SUPABASE_URL || 'https://psoyhrnjnalroihnswoo.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzb3locm5qbmFscm9paG5zd29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NjY4MjUsImV4cCI6MjA5OTQ0MjgyNX0.qZPWZ4f2RgVyim4BHiEn31bMSSrUQqzMVyeT1cd2bPA';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseServiceKey) {
  console.warn('⚠️  SUPABASE_SERVICE_KEY não configurada. Algumas funcionalidades podem ter limitações.');
}

// Middleware CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:5173', 'http://localhost:3000'];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Middleware para parsing JSON
app.use(express.json());

// Middleware para logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Rotas administrativas
app.use('/api/admin', adminRoutes);

// Rota de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Admin Painel API',
    version: '1.0.0'
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'Admin Painel API',
    version: '1.0.0',
    endpoints: {
      login: 'POST /api/admin/auth/login - Login administrativo',
      users: 'GET /api/admin/users - Lista usuários',
      user: 'GET /api/admin/users/:id - Detalhes do usuário',
      updateBalance: 'PUT /api/admin/users/:id/saldo - Atualiza saldo',
      transactions: 'GET /api/admin/transactions - Lista transações',
      stats: 'GET /api/admin/stats - Estatísticas do sistema',
      health: 'GET /health'
    },
    authentication: 'Todas as rotas (exceto /api/admin/auth/login) requerem header: Authorization: Bearer <token>'
  });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Admin Painel API rodando na porta ${PORT}`);
  console.log(`🔐 Login: http://localhost:${PORT}/api/admin/auth/login`);
  console.log(`📊 Estatísticas: http://localhost:${PORT}/api/admin/stats`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`\n⚠️  Lembre-se de configurar SUPABASE_SERVICE_KEY no arquivo .env`);
});







