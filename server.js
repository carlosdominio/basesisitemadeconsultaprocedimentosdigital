const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');

const app = express();
const port = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "https://vercel.live"],
            imgSrc: ["'self'", "data:", "blob:"],
            frameSrc: ["'self'", "https://vercel.live"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
}));

// CORS configurado de forma permissiva para permitir Vercel
const corsOptions = {
    origin: function (origin, callback) {
        // Permitir todas as origens em produção (Vercel usa origens dinâmicas)
        if (!origin || process.env.NODE_ENV === 'production') {
            callback(null, true);
        } else {
            callback(null, true);
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting geral para API
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 requisições por IP
    message: { error: 'Muitas requisições. Tente novamente mais tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting mais restritivo para login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 tentativas de login por IP
    message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Função para sanitizar entrada e prevenir SQL injection (mas permite todo HTML)
const sanitizeInput = (value) => {
    if (typeof value !== 'string') return value;
    // Não sanitizar dados que parecem ser base64 (usados para imagens)
    if (value.startsWith('data:image/') || /^[A-Za-z0-9+/=]+$/.test(value)) {
        return value;
    }
    // Não sanitizar - permitir todo HTML
    return value;
};

// Middleware para sanitizar parâmetros de entrada (exceto procedure_text que pode ter HTML)
const sanitizeParams = (req, res, next) => {
    if (req.params) {
        for (const key in req.params) {
            if (req.params[key] && typeof req.params[key] === 'string') {
                req.params[key] = sanitizeInput(req.params[key]);
            }
        }
    }
    if (req.body) {
        for (const key in req.body) {
            // Não sanitizar procedure_text e name pois podem conter HTML ou nomes válidos
            if (key === 'procedure_text' || key === 'name' || key === 'ids') continue;
            if (req.body[key] && typeof req.body[key] === 'string') {
                req.body[key] = sanitizeInput(req.body[key]);
            }
        }
    }
    if (req.query) {
        for (const key in req.query) {
            if (req.query[key] && typeof req.query[key] === 'string') {
                req.query[key] = sanitizeInput(req.query[key]);
            }
        }
    }
    next();
};

// Middleware para tratar erros e não expor detalhes internos
const errorHandler = (err, req, res, next) => {
    console.error('Erro:', err.message);
    
    // Em produção, não expor detalhes do erro
    if (process.env.NODE_ENV === 'production') {
        res.status(500).json({ error: 'Erro interno do servidor' });
    } else {
        // Em desenvolvimento, mostrar erro detalhado
        res.status(500).json({ error: err.message });
    }
};

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Aplicar rate limiting na API
app.use('/api', apiLimiter);

// Middleware de sanitização para todas as rotas API
app.use('/api', sanitizeParams);

// Force HTTPS em produção
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('X-Forwarded-Proto') !== 'https') {
            res.redirect(`https://${req.header('host')}${req.url}`);
        } else {
            next();
        }
    });
}

const crypto = require('crypto');
const SESSION_SECRET = process.env.SESSION_SECRET || 'sistema-consulta-procedimentos-2026-secret-key';
const SESSION_EXPIRY = 60 * 60 * 1000; // 1 hora

// Função para criar token JWT simples
function createToken(user) {
    const payload = {
        id: user.id,
        username: user.username,
        exp: Date.now() + SESSION_EXPIRY
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('hex');
    return `${encoded}.${signature}`;
}

// Função para verificar token
function verifyToken(token) {
    try {
        const [encoded, signature] = token.split('.');
        const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('hex');
        if (signature !== expectedSig) return null;
        const payload = JSON.parse(Buffer.from(encoded, 'base64').toString());
        if (Date.now() > payload.exp) return null;
        return payload;
    } catch (e) {
        return null;
    }
}

// Middleware de autenticação
const requireAuth = (req, res, next) => {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) {
        return res.status(401).json({ error: 'Não autorizado' });
    }
    
    const user = verifyToken(sessionId);
    if (!user) {
        return res.status(401).json({ error: 'Sessão expirada ou inválida' });
    }
    
    req.user = user;
    next();
};

// Routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/login', loginLimiter, (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});

// Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Initialize database
(async () => {
    try {
        // Verificar se a conexão com o banco de dados está disponível
        await pool.query('SELECT 1');
        console.log('Conexão com o banco de dados estabelecida com sucesso');
        
        await pool.query(`CREATE TABLE IF NOT EXISTS clients (
            id SERIAL PRIMARY KEY,
            name TEXT
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS client_procedures (
            id SERIAL PRIMARY KEY,
            client_id INTEGER REFERENCES clients (id),
            procedure_text TEXT,
            image_data TEXT,
            order_index INTEGER DEFAULT 0
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS providers (
            id SERIAL PRIMARY KEY,
            name TEXT,
            image TEXT
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS provider_procedures (
            id SERIAL PRIMARY KEY,
            provider_id INTEGER REFERENCES providers (id),
            sinistro_type TEXT,
            procedure_text TEXT,
            image_data TEXT,
            order_index INTEGER DEFAULT 0
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS additional_provider_procedures (
            id SERIAL PRIMARY KEY,
            provider_id INTEGER REFERENCES providers (id),
            sinistro_type TEXT,
            procedure_text TEXT,
            image_data TEXT,
            order_index INTEGER DEFAULT 0
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS sinistro_procedures (
            id SERIAL PRIMARY KEY,
            sinistro_type TEXT,
            procedure_text TEXT
        )`);

         await pool.query(`CREATE TABLE IF NOT EXISTS users (
             id SERIAL PRIMARY KEY,
             username TEXT UNIQUE NOT NULL,
             password TEXT NOT NULL,
             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
         )`);

         // Create admin user if not exists (only one admin)
         const adminUsername = 'admin';
         const adminPassword = 'Anovasenhae8763';
         const hashedPassword = await bcrypt.hash(adminPassword, 10);
         
         const existingAdmin = await pool.query("SELECT id FROM users WHERE username = $1", [adminUsername]);
         if (existingAdmin.rows.length === 0) {
             await pool.query("INSERT INTO users (username, password) VALUES ($1, $2)", [adminUsername, hashedPassword]);
             console.log('Admin user created successfully');
         }

        // Insert default data if not exists
        const result = await pool.query("SELECT COUNT(*) as count FROM clients");
        if (parseInt(result.rows[0].count) === 0) {
            await insertDefaultData();
            // Update sequences to avoid duplicate key errors
            await pool.query("SELECT setval('clients_id_seq', (SELECT MAX(id) FROM clients))");
            await pool.query("SELECT setval('client_procedures_id_seq', (SELECT MAX(id) FROM client_procedures))");
            await pool.query("SELECT setval('providers_id_seq', (SELECT MAX(id) FROM providers))");
            await pool.query("SELECT setval('provider_procedures_id_seq', (SELECT MAX(id) FROM provider_procedures))");
            await pool.query("SELECT setval('additional_provider_procedures_id_seq', (SELECT MAX(id) FROM additional_provider_procedures))");
            await pool.query("SELECT setval('sinistro_procedures_id_seq', (SELECT MAX(id) FROM sinistro_procedures))");
        }
    } catch (err) {
        console.error('Error initializing database:', err);
        console.error('Stack trace:', err.stack);
    }
})();

async function insertDefaultData() {
    const clients = [
        { id: 1, name: 'Cliente A', procedures: ['Contato inicial', 'Análise de requisitos', 'Proposta', 'Negociação', 'Fechamento'] },
        { id: 2, name: 'Cliente B', procedures: ['Reunião de briefing', 'Desenvolvimento', 'Testes', 'Entrega'] },
        { id: 3, name: 'Cliente C', procedures: ['Avaliação', 'Planejamento', 'Execução', 'Acompanhamento'] }
    ];

    const providers = [
        { id: 1, name: 'Prestador X', image: '', procedures: { acidentes: ['Avaliação de danos', 'Contato com cliente', 'Relatório de acidente'], avarias: ['Inspeção visual', 'Fotografia de avarias', 'Orçamento de reparo'], roubo: ['Verificação de documentos', 'Contato com polícia', 'Bloqueio de bens'], exclusoes: ['Análise contratual', 'Consulta jurídica', 'Decisão de cobertura'] }, additionalProcedures: { acidentes: ['Revisão', 'Aprovação'], avarias: [], roubo: [], exclusoes: [] } },
        { id: 2, name: 'Prestador Y', image: '', procedures: { acidentes: ['Registro do sinistro', 'Avaliação médica', 'Processamento de indenização'], avarias: ['Avaliação técnica', 'Negociação com oficinas', 'Acompanhamento de reparos'], roubo: ['Investigação preliminar', 'Verificação de seguros', 'Liberação de valores'], exclusoes: ['Revisão de cláusulas', 'Parecer técnico', 'Comunicação ao cliente'] }, additionalProcedures: { acidentes: ['Treinamento', 'Manutenção'], avarias: [], roubo: [], exclusoes: [] } },
        { id: 3, name: 'Prestador Z', image: '', procedures: { acidentes: ['Análise de responsabilidade', 'Cálculo de prejuízos', 'Pagamento de indenização'], avarias: ['Perícia especializada', 'Definição de reparos', 'Controle de qualidade'], roubo: ['Análise de risco', 'Recuperação de bens', 'Compensação financeira'], exclusoes: ['Auditoria contratual', 'Decisão final', 'Arquivamento do caso'] }, additionalProcedures: { acidentes: ['Suporte pós-venda', 'Atualizações'], avarias: [], roubo: [], exclusoes: [] } }
    ];

    const sinistroProcedures = [
        { sinistro_type: 'acidentes', procedure_text: 'Notificar imediatamente' },
        { sinistro_type: 'acidentes', procedure_text: 'Documentar o acidente' },
        { sinistro_type: 'acidentes', procedure_text: 'Contato com autoridades' },
        { sinistro_type: 'avarias', procedure_text: 'Avaliar danos' },
        { sinistro_type: 'avarias', procedure_text: 'Fotografar avarias' },
        { sinistro_type: 'avarias', procedure_text: 'Solicitar orçamento' },
        { sinistro_type: 'roubo', procedure_text: 'Registrar boletim de ocorrência' },
        { sinistro_type: 'roubo', procedure_text: 'Bloquear cartões/bens' },
        { sinistro_type: 'roubo', procedure_text: 'Notificar seguradora' },
        { sinistro_type: 'exclusoes', procedure_text: 'Verificar cláusulas contratuais' },
        { sinistro_type: 'exclusoes', procedure_text: 'Consultar especialista' },
        { sinistro_type: 'exclusoes', procedure_text: 'Documentar decisão' }
    ];

    for (const client of clients) {
        await pool.query("INSERT INTO clients (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING", [client.id, client.name]);
        let orderIndex = 1;
        for (const proc of client.procedures) {
            await pool.query("INSERT INTO client_procedures (client_id, procedure_text, order_index) VALUES ($1, $2, $3) ON CONFLICT (client_id, procedure_text) DO NOTHING", [client.id, proc, orderIndex]);
            orderIndex++;
        }
    }

    for (const provider of providers) {
        await pool.query("INSERT INTO providers (id, name, image) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING", [provider.id, provider.name, provider.image]);
        for (const sinistro in provider.procedures) {
            let orderIndex = 1;
            for (const proc of provider.procedures[sinistro]) {
                await pool.query("INSERT INTO provider_procedures (provider_id, sinistro_type, procedure_text, order_index) VALUES ($1, $2, $3, $4) ON CONFLICT (provider_id, sinistro_type, procedure_text) DO NOTHING", [provider.id, sinistro, proc, orderIndex]);
                orderIndex++;
            }
        }
        for (const sinistro in provider.additionalProcedures) {
            let orderIndex = 1;
            for (const proc of provider.additionalProcedures[sinistro]) {
                await pool.query("INSERT INTO additional_provider_procedures (provider_id, sinistro_type, procedure_text, order_index) VALUES ($1, $2, $3, $4) ON CONFLICT (provider_id, sinistro_type, procedure_text) DO NOTHING", [provider.id, sinistro, proc, orderIndex]);
                orderIndex++;
            }
        }
    }

    for (const proc of sinistroProcedures) {
        await pool.query("INSERT INTO sinistro_procedures (sinistro_type, procedure_text) VALUES ($1, $2)", [proc.sinistro_type, proc.procedure_text]);
    }
}

// Login endpoint - autenticação usando banco de dados
app.post('/api/login', loginLimiter, async (req, res, next) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
        }

        // Buscar usuário no banco de dados
        const userResult = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Usuário ou senha inválidos' });
        }

        const user = userResult.rows[0];
        
        // Verificar senha com bcrypt
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Usuário ou senha inválidos' });
        }

        // Criar token JWT
        const sessionId = createToken({ id: user.id, username: user.username });

        res.json({ 
            sessionId, 
            user: { id: user.id, username: user.username },
            expiresAt: SESSION_EXPIRY
        });
    } catch (err) {
        next(err);
    }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
    res.json({ message: 'Logout realizado' });
});

// Verify session endpoint
app.get('/api/verify-session', (req, res) => {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) {
        return res.status(401).json({ valid: false });
    }
    
    const user = verifyToken(sessionId);
    if (!user) {
        return res.status(401).json({ valid: false });
    }
    
    res.json({ valid: true, user: { id: user.id, username: user.username } });
});

// Rotas autenticadas
app.get('/api/clients', requireAuth, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM clients");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({error: 'Erro ao buscar clientes'});
    }
});

app.get('/api/clients/:id/procedures', requireAuth, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM client_procedures WHERE client_id = $1 ORDER BY order_index", [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({error: 'Erro ao buscar procedimentos'});
    }
});

app.get('/api/providers', requireAuth, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM providers");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({error: 'Erro ao buscar prestadores'});
    }
});

app.get('/api/providers/:id/procedures/:sinistro', requireAuth, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM provider_procedures WHERE provider_id = $1 AND sinistro_type = $2 ORDER BY order_index", [req.params.id, req.params.sinistro]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({error: 'Erro ao buscar procedimentos'});
    }
});

app.get('/api/providers/:id/additional-procedures/:sinistro', requireAuth, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM additional_provider_procedures WHERE provider_id = $1 AND sinistro_type = $2 ORDER BY order_index", [req.params.id, req.params.sinistro]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({error: 'Erro ao buscar procedimentos'});
    }
});

// Add provider
app.post('/api/providers', requireAuth, async (req, res) => {
    try {
        const { name, image } = req.body;
        const result = await pool.query("INSERT INTO providers (name, image) VALUES ($1, $2) RETURNING id", [name, image || '']);
        res.json({id: result.rows[0].id});
    } catch (err) {
        res.status(500).json({error: 'Erro ao adicionar prestador'});
    }
});

// Edit provider
app.put('/api/providers/:id', requireAuth, async (req, res) => {
    try {
        const { name, image } = req.body;
        const result = await pool.query("UPDATE providers SET name = $1, image = $2 WHERE id = $3", [name, image || '', req.params.id]);
        res.json({changes: result.rowCount});
    } catch (err) {
        res.status(500).json({error: 'Erro ao editar prestador'});
    }
});

// Delete provider
app.delete('/api/providers/:id', requireAuth, async (req, res) => {
    try {
        const result = await pool.query("DELETE FROM providers WHERE id = $1", [req.params.id]);
        res.json({changes: result.rowCount});
    } catch (err) {
        res.status(500).json({error: 'Erro ao excluir prestador'});
    }
});

// Add client
app.post('/api/clients', requireAuth, async (req, res) => {
    try {
        const { name } = req.body;
        const existing = await pool.query("SELECT id FROM clients WHERE name = $1", [name]);
        if (existing.rows.length > 0) {
            return res.status(400).json({error: "Cliente com este nome já existe."});
        }
        const result = await pool.query("INSERT INTO clients (name) VALUES ($1) RETURNING id", [name]);
        res.json({id: result.rows[0].id});
    } catch (err) {
        res.status(500).json({error: 'Erro ao adicionar cliente'});
    }
});

// Edit client
app.put('/api/clients/:id', requireAuth, async (req, res) => {
    try {
        const { name } = req.body;
        const result = await pool.query("UPDATE clients SET name = $1 WHERE id = $2", [name, req.params.id]);
        res.json({changes: result.rowCount});
    } catch (err) {
        res.status(500).json({error: 'Erro ao editar cliente'});
    }
});

// Delete client
app.delete('/api/clients/:id', requireAuth, async (req, res) => {
    try {
        await pool.query("DELETE FROM client_procedures WHERE client_id = $1", [req.params.id]);
        const result = await pool.query("DELETE FROM clients WHERE id = $1", [req.params.id]);
        res.json({changes: result.rowCount});
    } catch (err) {
        res.status(500).json({error: 'Erro ao excluir cliente'});
    }
});

// Add client procedure
app.post('/api/clients/:id/procedures', requireAuth, async (req, res) => {
    try {
        const { procedure_text } = req.body;
        const maxOrder = await pool.query("SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM client_procedures WHERE client_id = $1", [req.params.id]);
        const orderIndex = maxOrder.rows[0].next_order;
        const result = await pool.query("INSERT INTO client_procedures (client_id, procedure_text, order_index) VALUES ($1, $2, $3) RETURNING id", [req.params.id, procedure_text, orderIndex]);
        res.json({id: result.rows[0].id});
    } catch (err) {
        res.status(500).json({error: 'Erro ao adicionar procedimento'});
    }
});

// Edit client procedure
app.put('/api/clients/:id/procedures/:procId', requireAuth, async (req, res) => {
    try {
        const { procedure_text } = req.body;
        const result = await pool.query("UPDATE client_procedures SET procedure_text = $1 WHERE id = $2 AND client_id = $3", [procedure_text, req.params.procId, req.params.id]);
        res.json({changes: result.rowCount});
    } catch (err) {
        res.status(500).json({error: 'Erro ao editar procedimento'});
    }
});

// Reorder client procedures
app.put('/api/clients/:id/reorder-procedures', requireAuth, async (req, res) => {
    try {
        const { ids } = req.body;
        for (let i = 0; i < ids.length; i++) {
            await pool.query("UPDATE client_procedures SET order_index = $1 WHERE id = $2 AND client_id = $3", [i + 1, ids[i], req.params.id]);
        }
        res.json({message: 'Reordered successfully'});
    } catch (err) {
        res.status(500).json({error: 'Erro ao reordenar procedimentos'});
    }
});

// Delete client procedure
app.delete('/api/clients/:id/procedures/:procId', requireAuth, async (req, res) => {
    try {
        const result = await pool.query("DELETE FROM client_procedures WHERE id = $1 AND client_id = $2", [req.params.procId, req.params.id]);
        res.json({changes: result.rowCount});
    } catch (err) {
        res.status(500).json({error: 'Erro ao excluir procedimento'});
    }
});

// Add provider procedure
app.post('/api/providers/:id/procedures/:sinistro', requireAuth, async (req, res) => {
    try {
        const { procedure_text } = req.body;
        const maxOrder = await pool.query("SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM provider_procedures WHERE provider_id = $1 AND sinistro_type = $2", [req.params.id, req.params.sinistro]);
        const orderIndex = maxOrder.rows[0].next_order;
        const result = await pool.query("INSERT INTO provider_procedures (provider_id, sinistro_type, procedure_text, order_index) VALUES ($1, $2, $3, $4) RETURNING id", [req.params.id, req.params.sinistro, procedure_text, orderIndex]);
        res.json({id: result.rows[0].id});
    } catch (err) {
        res.status(500).json({error: 'Erro ao adicionar procedimento'});
    }
});

// Edit provider procedure
app.put('/api/providers/:id/procedures/:procId', requireAuth, async (req, res) => {
    try {
        const { procedure_text } = req.body;
        const result = await pool.query("UPDATE provider_procedures SET procedure_text = $1 WHERE id = $2 AND provider_id = $3", [procedure_text, req.params.procId, req.params.id]);
        res.json({changes: result.rowCount});
    } catch (err) {
        res.status(500).json({error: 'Erro ao editar procedimento'});
    }
});

// Reorder provider procedures
app.put('/api/providers/:id/procedures/:sinistro/reorder', requireAuth, async (req, res) => {
    try {
        const { ids } = req.body;
        for (let i = 0; i < ids.length; i++) {
            await pool.query("UPDATE provider_procedures SET order_index = $1 WHERE id = $2 AND provider_id = $3 AND sinistro_type = $4", [i + 1, ids[i], req.params.id, req.params.sinistro]);
        }
        res.json({message: 'Reordered successfully'});
    } catch (err) {
        res.status(500).json({error: 'Erro ao reordenar procedimentos'});
    }
});

// Delete provider procedure
app.delete('/api/providers/:id/procedures/:procId', requireAuth, async (req, res) => {
    try {
        const result = await pool.query("DELETE FROM provider_procedures WHERE id = $1 AND provider_id = $2", [req.params.procId, req.params.id]);
        res.json({changes: result.rowCount});
    } catch (err) {
        res.status(500).json({error: 'Erro ao excluir procedimento'});
    }
});

// Add additional provider procedure
app.post('/api/providers/:id/additional-procedures/:sinistro', requireAuth, async (req, res) => {
    try {
        const { procedure_text } = req.body;
        const maxOrder = await pool.query("SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM additional_provider_procedures WHERE provider_id = $1 AND sinistro_type = $2", [req.params.id, req.params.sinistro]);
        const orderIndex = maxOrder.rows[0].next_order;
        const result = await pool.query("INSERT INTO additional_provider_procedures (provider_id, sinistro_type, procedure_text, order_index) VALUES ($1, $2, $3, $4) RETURNING id", [req.params.id, req.params.sinistro, procedure_text, orderIndex]);
        res.json({id: result.rows[0].id});
    } catch (err) {
        res.status(500).json({error: 'Erro ao adicionar procedimento'});
    }
});

// Edit additional provider procedure
app.put('/api/providers/:id/additional-procedures/:procId', requireAuth, async (req, res) => {
    try {
        const { procedure_text } = req.body;
        const result = await pool.query("UPDATE additional_provider_procedures SET procedure_text = $1 WHERE id = $2 AND provider_id = $3", [procedure_text, req.params.procId, req.params.id]);
        res.json({changes: result.rowCount});
    } catch (err) {
        res.status(500).json({error: 'Erro ao editar procedimento'});
    }
});

// Reorder additional provider procedures
app.put('/api/providers/:id/additional-procedures/:sinistro/reorder', requireAuth, async (req, res) => {
    try {
        const { ids } = req.body;
        for (let i = 0; i < ids.length; i++) {
            await pool.query("UPDATE additional_provider_procedures SET order_index = $1 WHERE id = $2 AND provider_id = $3 AND sinistro_type = $4", [i + 1, ids[i], req.params.id, req.params.sinistro]);
        }
        res.json({message: 'Reordered successfully'});
    } catch (err) {
        res.status(500).json({error: 'Erro ao reordenar procedimentos'});
    }
});

// Delete additional provider procedure
app.delete('/api/providers/:id/additional-procedures/:procId', requireAuth, async (req, res) => {
    try {
        const result = await pool.query("DELETE FROM additional_provider_procedures WHERE id = $1 AND provider_id = $2", [req.params.procId, req.params.id]);
        res.json({changes: result.rowCount});
    } catch (err) {
        res.status(500).json({error: 'Erro ao excluir procedimento'});
    }
});

// Move procedure up
app.put('/api/clients/:clientId/procedures/:procId/move-up', requireAuth, async (req, res) => {
    try {
        const { clientId, procId } = req.params;

        const currentProc = await pool.query("SELECT order_index FROM client_procedures WHERE id = $1 AND client_id = $2", [procId, clientId]);
        if (currentProc.rows.length === 0) {
            return res.status(404).json({error: 'Procedure not found'});
        }

        const currentOrder = currentProc.rows[0].order_index;
        if (currentOrder === 0) {
            return res.json({message: 'Already at the top'});
        }

        await pool.query(`
            UPDATE client_procedures
            SET order_index = CASE
                WHEN id = $1 THEN order_index - 1
                WHEN order_index = $2 THEN order_index + 1
            END
            WHERE client_id = $3 AND order_index IN ($2, $4)
        `, [procId, currentOrder - 1, clientId, currentOrder]);

        res.json({message: 'Procedure moved up'});
    } catch (err) {
        res.status(500).json({error: 'Erro ao mover procedimento'});
    }
});

// Move procedure down
app.put('/api/clients/:clientId/procedures/:procId/move-down', requireAuth, async (req, res) => {
    try {
        const { clientId, procId } = req.params;

        const currentProc = await pool.query("SELECT order_index FROM client_procedures WHERE id = $1 AND client_id = $2", [procId, clientId]);
        if (currentProc.rows.length === 0) {
            return res.status(404).json({error: 'Procedure not found'});
        }

        const currentOrder = currentProc.rows[0].order_index;

        const maxOrder = await pool.query("SELECT MAX(order_index) as max_order FROM client_procedures WHERE client_id = $1", [clientId]);
        const maxOrderValue = maxOrder.rows[0].max_order;

        if (currentOrder >= maxOrderValue) {
            return res.json({message: 'Already at the bottom'});
        }

        await pool.query(`
            UPDATE client_procedures
            SET order_index = CASE
                WHEN id = $1 THEN order_index + 1
                WHEN order_index = $2 THEN order_index - 1
            END
            WHERE client_id = $3 AND order_index IN ($4, $2)
        `, [procId, currentOrder + 1, clientId, currentOrder]);

        res.json({message: 'Procedure moved down'});
    } catch (err) {
        res.status(500).json({error: 'Erro ao mover procedimento'});
    }
});

// Error handler middleware (deve ser último)
app.use(errorHandler);

module.exports = app;
