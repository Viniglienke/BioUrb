require("dotenv").config();
const express = require("express");
const app = express();
const { Pool } = require("pg");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const saltRounds = 10;
const jwt = require("jsonwebtoken");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

// Configuração do banco de dados PostgreSQL
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Configura o CORS permitindo requisições apenas dos domínios especificados
app.use(cors({
    origin: ["https://biourb.vercel.app", "http://localhost:3001", "http://localhost:5173"],
    credentials: true
}));

// Middleware para interpretar requisições com corpo em JSON
app.use(express.json());

// Configuração da documentação Swagger
const swaggerConfig = {
    swaggerDefinition: {
        openapi: "3.0.0",
        info: {
            title: "API do Sistema de Controle de Arborização Urbana - BioUrb",
            version: "1.0.0",
            description: "Documentação da API para autenticação de usuários e gerenciamento de árvores.",
        },
        servers: [
            {
                url: "https://api-biourb.vercel.app", // URL base da API
            },
        ],
    },
    apis: ["./index.js"],
};

// Inicializa a documentação com as configurações acima
const swaggerDocs = swaggerJsDoc(swaggerConfig);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs, { explorer: true }));


// Conectar ao banco de dados
db.connect()
    .then(() => console.log("Conexão com o banco de dados bem-sucedida"))
    .catch(err => console.error("Erro ao conectar ao banco de dados:", err.message));

// Rota para registrar usuário

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Registra um novo usuário.
 *     tags:
 *       - Autenticação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cpf
 *               - name
 *               - email
 *               - password
 *             properties:
 *               cpf:
 *                 type: string
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuário cadastrado com sucesso.
 *       400:
 *         description: Email já cadastrado.
 */

app.post("/register", async (req, res) => {
    const { cpf, name, email, password } = req.body;

    try {
        // Verifica se o email já está cadastrado
        const userCheck = await db.query("SELECT * FROM usuario WHERE email = $1", [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ msg: "Email já cadastrado" });
        }

        // Criptografa a senha
        const hash = await bcrypt.hash(password, saltRounds);

        // Insere o novo usuário no banco
        await db.query(
            "INSERT INTO usuario (cpf, nome, email, senha) VALUES ($1, $2, $3, $4)",
            [cpf, name, email, hash]
        );

        res.status(201).json({ msg: "Usuário cadastrado com sucesso" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rota para login

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Realiza login de um usuário.
 *     tags:
 *       - Autenticação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usuário logado com sucesso.
 *       401:
 *         description: Senha incorreta.
 *       404:
 *         description: Usuário não registrado.
 */

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        // Verifica se o usuário existe
        const userCheck = await db.query("SELECT * FROM usuario WHERE email = $1", [email]);

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ msg: "Usuário não registrado!" });
        }

        const user = userCheck.rows[0];

        // Compara a senha digitada com o hash do banco
        const isPasswordValid = await bcrypt.compare(password, user.senha);

        if (isPasswordValid) {
            // Gera um token JWT para autenticação futura
            const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });


            // Retorna dados do usuário e o token
            res.json({
                msg: "Usuário logado",
                user: {
                    id: user.id,
                    nome: user.nome,
                    email: user.email,
                    isAdmin: user.is_admin,
                },
                token,
            });
        } else {
            res.status(401).json({ msg: "Senha incorreta" });
        }
    } catch (err) {
        console.error("Erro no login:", err.message);  // Logando o erro no console
        res.status(500).json({ error: "Erro interno no servidor", details: err.message });
    }
});


// Rota para obter estatísticas do sistema
/**
 * @swagger
 * /stats:
 *   get:
 *     summary: Retorna estatísticas gerais do sistema.
 *     tags:
 *       - Estatísticas
 */
app.get("/stats", async (req, res) => {
    try {
        const totalArvores = await db.query("SELECT COUNT(*) FROM arvore");
        const totalAreas = await db.query("SELECT COUNT(*) FROM areas_verdes");
        const totalUsuarios = await db.query("SELECT COUNT(*) FROM usuario");
        const arvoresSaudaveis = await db.query("SELECT COUNT(*) FROM arvore WHERE estado_saude = 'Saudável'");

        res.json({
            totalArvores: parseInt(totalArvores.rows[0].count),
            totalAreas: parseInt(totalAreas.rows[0].count),
            totalUsuarios: parseInt(totalUsuarios.rows[0].count),
            arvoresSaudaveis: parseInt(arvoresSaudaveis.rows[0].count)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rota para cadastrar árvore (com base no ID do usuário)

/**
 * @swagger
 * /trees:
 *   post:
 *     summary: Cadastra uma nova árvore associada a um usuário.
 *     tags:
 *       - Árvores
 */

app.post("/trees", async (req, res) => {
    const { treeName, popularName, lifecondition, location, plantingDate, altura, diametro,
            latitude, longitude, imagemUrl, areaVerdeId, usuario_id } = req.body;

    if (!usuario_id || !treeName || !lifecondition || !location || !plantingDate) {
        return res.status(400).json({ msg: "Por favor, forneça todos os campos necessários." });
    }

    try {
        const result = await db.query(
            `INSERT INTO arvore (nome_cientifico, nome_popular, data_plantio, estado_saude, localizacao,
                                altura, diametro, latitude, longitude, imagem_url, area_verde_id, usuario_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
            [treeName, popularName, plantingDate, lifecondition, location, altura, diametro,
             latitude, longitude, imagemUrl, areaVerdeId, usuario_id]
        );
        res.status(201).json({ msg: "Árvore registrada com sucesso!", insertedId: result.rows[0].id });
    } catch (err) {
        console.error("Erro ao registrar árvore:", err);
        res.status(500).json({ error: err.message });
    }
});

// Rota para listar árvores

/**
 * @swagger
 * /trees:
 *   get:
 *     summary: Lista todas as árvores cadastradas.
 *     tags:
 *       - Árvores
 */

app.get("/trees", async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                arvore.*,
                usuario.nome AS nome_registrante,
                areas_verdes.nome AS nome_area
            FROM arvore
            JOIN usuario ON arvore.usuario_id = usuario.id
            LEFT JOIN areas_verdes ON arvore.area_verde_id = areas_verdes.id
            ORDER BY arvore.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Atualizar árvore

/**
 * @swagger
 * /trees/{id}:
 *   put:
 *     summary: Atualiza os dados de uma árvore existente.
 *     tags:
 *       - Árvores
 */

app.put("/trees/:id", async (req, res) => {
    const { id } = req.params;
    const { treeName, popularName, lifecondition, location, plantingDate, altura, diametro,
            latitude, longitude, imagemUrl, areaVerdeId } = req.body;

    if (!treeName || !lifecondition || !location || !plantingDate) {
        return res.status(400).json({ msg: "Todos os campos obrigatórios devem ser preenchidos." });
    }

    try {
        await db.query(
            `UPDATE arvore
             SET nome_cientifico = $1, nome_popular = $2, data_plantio = $3, estado_saude = $4,
                 localizacao = $5, altura = $6, diametro = $7, latitude = $8, longitude = $9,
                 imagem_url = $10, area_verde_id = $11
             WHERE id = $12`,
            [treeName, popularName, plantingDate, lifecondition, location, altura, diametro,
             latitude, longitude, imagemUrl, areaVerdeId, id]
        );

        res.json({ msg: "Árvore atualizada com sucesso!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Deletar árvore

/**
 * @swagger
 * /trees/{id}:
 *   delete:
 *     summary: Remove uma árvore pelo ID.
 *     tags:
 *       - Árvores
 */

app.delete("/trees/:id", async (req, res) => {
    const { id } = req.params;

    try {
        await db.query("DELETE FROM arvore WHERE id = $1", [id]);
        res.json({ msg: "Árvore excluída com sucesso!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rotas para áreas verdes

/**
 * @swagger
 * /areas:
 *   get:
 *     summary: Lista todas as áreas verdes.
 *     tags:
 *       - Áreas Verdes
 */
app.get("/areas", async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                areas_verdes.*,
                usuario.nome AS nome_registrante,
                COUNT(arvore.id) AS total_arvores
            FROM areas_verdes
            JOIN usuario ON areas_verdes.usuario_id = usuario.id
            LEFT JOIN arvore ON areas_verdes.id = arvore.area_verde_id
            GROUP BY areas_verdes.id, usuario.nome
            ORDER BY areas_verdes.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /areas:
 *   post:
 *     summary: Cadastra uma nova área verde.
 *     tags:
 *       - Áreas Verdes
 */
app.post("/areas", async (req, res) => {
    const { nome, descricao, localizacao, latitude, longitude, responsavel, status, imagemUrl, usuario_id } = req.body;

    if (!nome || !localizacao || !usuario_id) {
        return res.status(400).json({ msg: "Nome, localização e usuário são obrigatórios." });
    }

    try {
        const result = await db.query(
            `INSERT INTO areas_verdes (nome, descricao, localizacao, latitude, longitude, responsavel, status, imagem_url, usuario_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [nome, descricao, localizacao, latitude, longitude, responsavel, status || 'Ativa', imagemUrl, usuario_id]
        );
        res.status(201).json({ msg: "Área verde registrada com sucesso!", insertedId: result.rows[0].id });
    } catch (err) {
        console.error("Erro ao registrar área verde:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /areas/{id}:
 *   put:
 *     summary: Atualiza uma área verde.
 *     tags:
 *       - Áreas Verdes
 */
app.put("/areas/:id", async (req, res) => {
    const { id } = req.params;
    const { nome, descricao, localizacao, latitude, longitude, responsavel, status, imagemUrl } = req.body;

    if (!nome || !localizacao) {
        return res.status(400).json({ msg: "Nome e localização são obrigatórios." });
    }

    try {
        await db.query(
            `UPDATE areas_verdes
             SET nome = $1, descricao = $2, localizacao = $3, latitude = $4, longitude = $5,
                 responsavel = $6, status = $7, imagem_url = $8
             WHERE id = $9`,
            [nome, descricao, localizacao, latitude, longitude, responsavel, status, imagemUrl, id]
        );
        res.json({ msg: "Área verde atualizada com sucesso!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /areas/{id}:
 *   delete:
 *     summary: Remove uma área verde.
 *     tags:
 *       - Áreas Verdes
 */
app.delete("/areas/:id", async (req, res) => {
    const { id } = req.params;

    try {
        await db.query("DELETE FROM areas_verdes WHERE id = $1", [id]);
        res.json({ msg: "Área verde excluída com sucesso!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Inicialização do servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});