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
    origin: ["https://biourb.vercel.app", "http://localhost:3001"],
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


// Rota para cadastrar árvore (com base no ID do usuário)

/**
 * @swagger
 * /trees:
 *   post:
 *     summary: Cadastra uma nova árvore associada a um usuário.
 *     tags:
 *       - Árvores
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - treeName
 *               - lifecondition
 *               - location
 *               - plantingDate
 *               - usuario_id
 *             properties:
 *               treeName:
 *                 type: string
 *               lifecondition:
 *                 type: string
 *               location:
 *                 type: string
 *               plantingDate:
 *                 type: string
 *                 format: date
 *               usuario_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Árvore registrada com sucesso.
 *       400:
 *         description: Dados incompletos fornecidos.
 */

app.post("/trees", async (req, res) => {
    const { treeName, lifecondition, location, plantingDate, usuario_id } = req.body;

    // Validação de campos obrigatórios
    if (!usuario_id || !treeName || !lifecondition || !location || !plantingDate) {
        return res.status(400).json({ msg: "Por favor, forneça todos os campos necessários." });
    }

    try {
        // Insere a nova árvore no banco
        const result = await db.query(
            `INSERT INTO arvore (nome_cientifico, data_plantio, estado_saude, localizacao, usuario_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [treeName, plantingDate, lifecondition, location, usuario_id]
        );
        res.status(201).json({ msg: "Árvore registrada com sucesso!", insertedId: result.rows[0].id });
    } catch (err) {
        console.error("Erro ao registrar árvore:", err); // Log de erro
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
 *     responses:
 *       200:
 *         description: Lista de árvores retornada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   nome_cientifico:
 *                     type: string
 *                   data_plantio:
 *                     type: string
 *                     format: date
 *                   estado_saude:
 *                     type: string
 *                   localizacao:
 *                     type: string
 *                   usuario_id:
 *                     type: integer
 *                   nome_registrante:
 *                     type: string
 */

app.get("/trees", async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                arvore.id, 
                arvore.nome_cientifico, 
                arvore.data_plantio, 
                arvore.estado_saude, 
                arvore.localizacao,
                arvore.usuario_id,
                usuario.nome AS nome_registrante
            FROM arvore
            JOIN usuario ON arvore.usuario_id = usuario.id
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
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID da árvore
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - treeName
 *               - lifecondition
 *               - location
 *               - plantingDate
 *             properties:
 *               treeName:
 *                 type: string
 *               lifecondition:
 *                 type: string
 *               location:
 *                 type: string
 *               plantingDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Árvore atualizada com sucesso.
 *       400:
 *         description: Campos obrigatórios ausentes.
 */

app.put("/trees/:id", async (req, res) => {
    const { id } = req.params;
    const { treeName, lifecondition, location, plantingDate } = req.body;

    // Verifica se todos os campos foram enviados
    if (!treeName || !lifecondition || !location || !plantingDate) {
        return res.status(400).json({ msg: "Todos os campos são obrigatórios." });
    }

    try {
        // Atualiza os dados da árvore no banco
        await db.query(
            `UPDATE arvore
             SET nome_cientifico = $1, data_plantio = $2, estado_saude = $3, localizacao = $4
             WHERE id = $5`,
            [treeName, plantingDate, lifecondition, location, id]
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
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID da árvore
 *     responses:
 *       200:
 *         description: Árvore excluída com sucesso.
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

// Inicialização do servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});