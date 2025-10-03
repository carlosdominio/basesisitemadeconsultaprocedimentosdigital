const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Initialize database
(async () => {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS clients (
            id SERIAL PRIMARY KEY,
            name TEXT
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS client_procedures (
            id SERIAL PRIMARY KEY,
            client_id INTEGER REFERENCES clients (id),
            procedure_text TEXT
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
            procedure_text TEXT
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS additional_provider_procedures (
            id SERIAL PRIMARY KEY,
            provider_id INTEGER REFERENCES providers (id),
            sinistro_type TEXT,
            procedure_text TEXT
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS sinistro_procedures (
            id SERIAL PRIMARY KEY,
            sinistro_type TEXT,
            procedure_text TEXT
        )`);

        // Insert default data if not exists
        const result = await pool.query("SELECT COUNT(*) as count FROM clients");
        if (parseInt(result.rows[0].count) === 0) {
            await insertDefaultData();
        }
    } catch (err) {
        console.error('Error initializing database:', err);
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
        for (const proc of client.procedures) {
            await pool.query("INSERT INTO client_procedures (client_id, procedure_text) VALUES ($1, $2)", [client.id, proc]);
        }
    }

    for (const provider of providers) {
        await pool.query("INSERT INTO providers (id, name, image) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING", [provider.id, provider.name, provider.image]);
        for (const sinistro in provider.procedures) {
            for (const proc of provider.procedures[sinistro]) {
                await pool.query("INSERT INTO provider_procedures (provider_id, sinistro_type, procedure_text) VALUES ($1, $2, $3)", [provider.id, sinistro, proc]);
            }
        }
        for (const sinistro in provider.additionalProcedures) {
            for (const proc of provider.additionalProcedures[sinistro]) {
                await pool.query("INSERT INTO additional_provider_procedures (provider_id, sinistro_type, procedure_text) VALUES ($1, $2, $3)", [provider.id, sinistro, proc]);
            }
        }
    }

    for (const proc of sinistroProcedures) {
        await pool.query("INSERT INTO sinistro_procedures (sinistro_type, procedure_text) VALUES ($1, $2)", [proc.sinistro_type, proc.procedure_text]);
    }
}

// Routes
app.get('/api/clients', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM clients");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

app.get('/api/clients/:id/procedures', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM client_procedures WHERE client_id = $1", [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

app.get('/api/providers', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM providers");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

app.get('/api/providers/:id/procedures/:sinistro', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM provider_procedures WHERE provider_id = $1 AND sinistro_type = $2", [req.params.id, req.params.sinistro]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

app.get('/api/providers/:id/additional-procedures/:sinistro', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM additional_provider_procedures WHERE provider_id = $1 AND sinistro_type = $2", [req.params.id, req.params.sinistro]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// Add provider
app.post('/api/providers', async (req, res) => {
    try {
        const { name, image } = req.body;
        const result = await pool.query("INSERT INTO providers (name, image) VALUES ($1, $2) RETURNING id", [name, image || '']);
        res.json({id: result.rows[0].id});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// Edit provider
app.put('/api/providers/:id', async (req, res) => {
    try {
        const { name, image } = req.body;
        const result = await pool.query("UPDATE providers SET name = $1, image = $2 WHERE id = $3", [name, image || '', req.params.id]);
        res.json({changes: result.rowCount});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// Delete provider
app.delete('/api/providers/:id', async (req, res) => {
    try {
        const result = await pool.query("DELETE FROM providers WHERE id = $1", [req.params.id]);
        res.json({changes: result.rowCount});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// Add client
app.post('/api/clients', async (req, res) => {
    try {
        const { name } = req.body;
        const result = await pool.query("INSERT INTO clients (name) VALUES ($1) RETURNING id", [name]);
        res.json({id: result.rows[0].id});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// Edit client
app.put('/api/clients/:id', async (req, res) => {
    try {
        const { name } = req.body;
        const result = await pool.query("UPDATE clients SET name = $1 WHERE id = $2", [name, req.params.id]);
        res.json({changes: result.rowCount});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// Delete client
app.delete('/api/clients/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM client_procedures WHERE client_id = $1", [req.params.id]);
        const result = await pool.query("DELETE FROM clients WHERE id = $1", [req.params.id]);
        res.json({changes: result.rowCount});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// Add client procedure
app.post('/api/clients/:id/procedures', async (req, res) => {
    try {
        const { procedure_text } = req.body;
        const result = await pool.query("INSERT INTO client_procedures (client_id, procedure_text) VALUES ($1, $2) RETURNING id", [req.params.id, procedure_text]);
        res.json({id: result.rows[0].id});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// Edit client procedure
app.put('/api/clients/:id/procedures/:procId', async (req, res) => {
    try {
        const { procedure_text } = req.body;
        const result = await pool.query("UPDATE client_procedures SET procedure_text = $1 WHERE id = $2 AND client_id = $3", [procedure_text, req.params.procId, req.params.id]);
        res.json({changes: result.rowCount});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// Delete client procedure
app.delete('/api/clients/:id/procedures/:procId', async (req, res) => {
    try {
        const result = await pool.query("DELETE FROM client_procedures WHERE id = $1 AND client_id = $2", [req.params.procId, req.params.id]);
        res.json({changes: result.rowCount});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// Add provider procedure
app.post('/api/providers/:id/procedures/:sinistro', async (req, res) => {
    try {
        const { procedure_text } = req.body;
        const result = await pool.query("INSERT INTO provider_procedures (provider_id, sinistro_type, procedure_text) VALUES ($1, $2, $3) RETURNING id", [req.params.id, req.params.sinistro, procedure_text]);
        res.json({id: result.rows[0].id});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// Edit provider procedure
app.put('/api/providers/:id/procedures/:procId', async (req, res) => {
    try {
        const { procedure_text } = req.body;
        const result = await pool.query("UPDATE provider_procedures SET procedure_text = $1 WHERE id = $2 AND provider_id = $3", [procedure_text, req.params.procId, req.params.id]);
        res.json({changes: result.rowCount});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// Delete provider procedure
app.delete('/api/providers/:id/procedures/:procId', async (req, res) => {
    try {
        const result = await pool.query("DELETE FROM provider_procedures WHERE id = $1 AND provider_id = $2", [req.params.procId, req.params.id]);
        res.json({changes: result.rowCount});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// Add additional provider procedure
app.post('/api/providers/:id/additional-procedures/:sinistro', async (req, res) => {
    try {
        const { procedure_text } = req.body;
        const result = await pool.query("INSERT INTO additional_provider_procedures (provider_id, sinistro_type, procedure_text) VALUES ($1, $2, $3) RETURNING id", [req.params.id, req.params.sinistro, procedure_text]);
        res.json({id: result.rows[0].id});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// Edit additional provider procedure
app.put('/api/providers/:id/additional-procedures/:procId', async (req, res) => {
    try {
        const { procedure_text } = req.body;
        const result = await pool.query("UPDATE additional_provider_procedures SET procedure_text = $1 WHERE id = $2 AND provider_id = $3", [procedure_text, req.params.procId, req.params.id]);
        res.json({changes: result.rowCount});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// Delete additional provider procedure
app.delete('/api/providers/:id/additional-procedures/:procId', async (req, res) => {
    try {
        const result = await pool.query("DELETE FROM additional_provider_procedures WHERE id = $1 AND provider_id = $2", [req.params.procId, req.params.id]);
        res.json({changes: result.rowCount});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

module.exports = app;