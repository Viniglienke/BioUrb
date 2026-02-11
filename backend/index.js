require("dotenv").config();
const express = require("express");
const app = express();
const { Pool } = require("pg");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const saltRounds = 10;
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;
const { GoogleGenerativeAI } = require("@google/generative-ai");

const isProduction = process.env.NODE_ENV === "production";

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// --- CONFIGURAÇÃO DE MIDDLEWARE ---

// Aumenta o limite para 50mb para aceitar imagens em Base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configura o CORS
app.use(cors({
    origin: ["https://biourb.vercel.app", "http://localhost:3001", "http://localhost:5173"],
    credentials: true
}));

// Conectar ao banco de dados
db.connect()
    .then(() => console.log("Conexão com o banco de dados bem-sucedida"))
    .catch(err => console.error("Erro ao conectar ao banco de dados:", err.message));

// Configuração do Urbaninho (Gemini)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview"
});

// ==================================================================
// ROTAS DA API
// ==================================================================

// Rota para registrar usuário
app.post("/register", async (req, res) => {
    const { cpf, name, email, password } = req.body;

    if (!cpf || !name || !email || !password) {
        return res.status(400).json({ msg: "Preencha todos os campos obrigatórios." });
    }

    try {
        const userCheck = await db.query(
            "SELECT email, cpf FROM usuario WHERE email = $1 OR cpf = $2",
            [email, cpf]
        );

        if (userCheck.rows.length > 0) {
            const userFound = userCheck.rows[0];
            if (userFound.cpf === cpf) {
                return res.status(400).json({ msg: "CPF já cadastrado." });
            }
            if (userFound.email === email) {
                return res.status(400).json({ msg: "Email já cadastrado." });
            }
        }

        const hash = await bcrypt.hash(password, saltRounds);

        await db.query(
            "INSERT INTO usuario (cpf, nome, email, senha) VALUES ($1, $2, $3, $4)",
            [cpf, name, email, hash]
        );

        res.status(201).json({ msg: "Usuário cadastrado com sucesso" });
    } catch (err) {
        console.error("Erro no registro:", err);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

// Rota para login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const userCheck = await db.query("SELECT * FROM usuario WHERE email = $1", [email]);

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ msg: "Usuário não registrado!" });
        }

        const user = userCheck.rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.senha);

        if (isPasswordValid) {
            const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });

            res.json({
                msg: "Usuário logado",
                user: {
                    id: user.id,
                    nome: user.nome,
                    email: user.email,
                    saldo: user.saldo,
                    isAdmin: user.is_admin,
                    tipo: user.tipo_usuario,
                    foto: user.foto // <--- ADICIONE ESTA LINHA AQUI!
                },
                token,
            });
        } else {
            res.status(401).json({ msg: "Senha incorreta!" });
        }
    } catch (err) {
        console.error("Erro no login:", err.message);
        res.status(500).json({ error: "Erro interno no servidor", details: err.message });
    }
});

// Rota para estatísticas
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

// Rota para cadastrar árvore
// Rota para cadastrar árvore (ATUALIZADA COM VISIBILIDADE)
app.post("/trees", async (req, res) => {
    // Recebemos 'visibilidade' do frontend agora
    const { treeName, popularName, lifecondition, location, plantingDate, altura, diametro,
        latitude, longitude, imagemUrl, areaVerdeId, usuario_id, visibilidade } = req.body;

    if (!usuario_id || !treeName || !lifecondition || !location || !plantingDate) {
        return res.status(400).json({ msg: "Por favor, forneça todos os campos necessários." });
    }

    // Define padrão como 'publica' se não vier nada
    const visibilidadeFinal = visibilidade === 'privada' ? 'privada' : 'publica';

    try {
        await db.query("BEGIN");

        const result = await db.query(
            `INSERT INTO arvore (nome_cientifico, nome_popular, data_plantio, estado_saude, localizacao,
                                altura, diametro, latitude, longitude, imagem_url, area_verde_id, usuario_id, visibilidade)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
            [treeName, popularName, plantingDate, lifecondition, location, altura, diametro,
                latitude, longitude, imagemUrl, areaVerdeId, usuario_id, visibilidadeFinal]
        );

        // Usuário ganha moedas mesmo se for privada (incentivo ao cadastro)
        await db.query(
            "UPDATE usuario SET saldo = saldo + 50 WHERE id = $1",
            [usuario_id]
        );

        const userRes = await db.query("SELECT saldo FROM usuario WHERE id = $1", [usuario_id]);
        const novoSaldo = userRes.rows[0].saldo;

        await db.query("COMMIT");

        res.status(201).json({
            msg: "Árvore registrada! Você ganhou 50 BioCoins!",
            insertedId: result.rows[0].id,
            newBalance: novoSaldo
        });
    } catch (err) {
        await db.query("ROLLBACK");
        console.error("Erro ao registrar árvore:", err);
        res.status(500).json({ error: err.message });
    }
});

// Rota para listar árvores
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
app.put("/trees/:id", async (req, res) => {
    const { id } = req.params;
    // Adicionei 'visibilidade' aqui
    const { treeName, popularName, lifecondition, location, plantingDate, altura, diametro,
        latitude, longitude, imagemUrl, areaVerdeId, visibilidade } = req.body;

    if (!treeName || !lifecondition || !location || !plantingDate) {
        return res.status(400).json({ msg: "Todos os campos obrigatórios devem ser preenchidos." });
    }

    // Garante que o valor seja válido
    const visibilidadeFinal = visibilidade === 'privada' ? 'privada' : 'publica';

    try {
        await db.query(
            `UPDATE arvore
             SET nome_cientifico = $1, nome_popular = $2, data_plantio = $3, estado_saude = $4,
                 localizacao = $5, altura = $6, diametro = $7, latitude = $8, longitude = $9,
                 imagem_url = $10, area_verde_id = $11, visibilidade = $12
             WHERE id = $13`,
            [treeName, popularName, plantingDate, lifecondition, location, altura, diametro,
                latitude, longitude, imagemUrl, areaVerdeId, visibilidadeFinal, id]
        );

        res.json({ msg: "Árvore atualizada com sucesso!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Deletar árvore
app.delete("/trees/:id", async (req, res) => {
    const { id } = req.params;

    try {
        await db.query("DELETE FROM arvore WHERE id = $1", [id]);
        res.json({ msg: "Árvore excluída com sucesso!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Listar áreas (FILTRADA POR PRIVACIDADE)
app.get("/areas", async (req, res) => {
    // Recebemos o ID do usuário via Query String (ex: /areas?userId=123)
    const { userId } = req.query;

    try {
        let query = `
            SELECT 
                areas_verdes.*, 
                usuario.nome AS nome_registrante,
                COUNT(arvore.id) AS total_arvores
            FROM areas_verdes
            JOIN usuario ON areas_verdes.usuario_id = usuario.id
            LEFT JOIN arvore ON areas_verdes.id = arvore.area_verde_id
            WHERE 1=1 
        `;

        const params = [];

        // Se temos um usuário logado, mostramos:
        // 1. Áreas Públicas (de qualquer um)
        // 2. OU Áreas Privadas (que sejam DELE)
        if (userId) {
            query += ` AND (areas_verdes.visibilidade = 'publica' OR areas_verdes.usuario_id = $1)`;
            params.push(userId);
        } else {
            // Se não tem usuário identificado, mostra SÓ as públicas
            query += ` AND areas_verdes.visibilidade = 'publica'`;
        }

        query += ` GROUP BY areas_verdes.id, usuario.nome ORDER BY areas_verdes.created_at DESC`;

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Criar área verde
app.post("/areas", async (req, res) => {
    const { nome, descricao, localizacao, latitude, longitude, responsavel, status, imagemUrl, usuario_id, visibilidade } = req.body;

    const descricaoFinal = descricao && descricao.trim() !== "" ? descricao.trim() : "Não informado";
    const responsavelFinal = responsavel && responsavel.trim() !== "" ? responsavel.trim() : "Não informado";

    // Padrão publica
    const visibilidadeFinal = visibilidade === 'privada' ? 'privada' : 'publica';

    if (!nome || !localizacao || !usuario_id) {
        return res.status(400).json({ msg: "Nome, localização e usuário são obrigatórios." });
    }

    try {
        const result = await db.query(
            `INSERT INTO areas_verdes 
             (nome, descricao, localizacao, latitude, longitude, responsavel, status, imagem_url, usuario_id, visibilidade)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id`,
            [nome.trim(), descricaoFinal, localizacao.trim(), latitude || null, longitude || null,
                responsavelFinal, status || "Ativa", imagemUrl || null, usuario_id, visibilidadeFinal]
        );
        res.status(201).json({ msg: "Área verde registrada com sucesso!", insertedId: result.rows[0].id });
    } catch (err) {
        console.error("Erro ao registrar área verde:", err);
        res.status(500).json({ error: err.message });
    }
});

// Atualizar área verde
app.put("/areas/:id", async (req, res) => {
    const { id } = req.params;
    // Adicionei 'visibilidade' aqui
    const { nome, descricao, localizacao, latitude, longitude, responsavel, status, imagemUrl, visibilidade } = req.body;

    const descricaoFinal = descricao && descricao.trim() !== "" ? descricao.trim() : "Não informado";
    const responsavelFinal = responsavel && responsavel.trim() !== "" ? responsavel.trim() : "Não informado";

    // Garante que o valor seja válido
    const visibilidadeFinal = visibilidade === 'privada' ? 'privada' : 'publica';

    if (!nome || !localizacao) {
        return res.status(400).json({ msg: "Nome e localização são obrigatórios." });
    }

    try {
        await db.query(
            `UPDATE areas_verdes
             SET nome = $1, descricao = $2, localizacao = $3, latitude = $4, longitude = $5,
                 responsavel = $6, status = $7, imagem_url = $8, visibilidade = $9
             WHERE id = $10`,
            [nome.trim(), descricaoFinal, localizacao.trim(), latitude, longitude, responsavelFinal, status, imagemUrl, visibilidadeFinal, id]
        );
        res.json({ msg: "Área verde atualizada com sucesso!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Deletar área verde
app.delete("/areas/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM areas_verdes WHERE id = $1", [id]);
        res.json({ msg: "Área verde excluída com sucesso!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Listar itens da loja
app.get("/shop", async (req, res) => {
    try {
        const itens = await db.query("SELECT * FROM loja_itens ORDER BY preco ASC");
        res.json(itens.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Comprar item
app.post("/shop/buy", async (req, res) => {
    const { usuario_id, item_id } = req.body;

    try {
        await db.query("BEGIN");

        const userRes = await db.query("SELECT saldo FROM usuario WHERE id = $1", [usuario_id]);
        const itemRes = await db.query("SELECT nome, preco FROM loja_itens WHERE id = $1", [item_id]);

        if (userRes.rows.length === 0 || itemRes.rows.length === 0) {
            throw new Error("Usuário ou Item não encontrado");
        }

        const saldoAtual = userRes.rows[0].saldo;
        const { preco, nome } = itemRes.rows[0];

        if (saldoAtual < preco) {
            await db.query("ROLLBACK");
            return res.status(400).json({ msg: "Saldo insuficiente." });
        }

        // 1. Gera um código curto de resgate (Ex: A1B2-C3D4)
        const codigoResgate = crypto.randomUUID().substring(0, 8).toUpperCase();

        // 2. Desconta saldo
        await db.query("UPDATE usuario SET saldo = saldo - $1 WHERE id = $2", [preco, usuario_id]);

        // 3. Registra a compra com o código
        await db.query(
            "INSERT INTO inventario_usuario (usuario_id, item_id, codigo_resgate) VALUES ($1, $2, $3)",
            [usuario_id, item_id, codigoResgate]
        );

        await db.query("COMMIT");

        res.json({
            msg: `Compra realizada! Seu código de resgate é: ${codigoResgate}`,
            novoSaldo: saldoAtual - preco
        });

    } catch (err) {
        await db.query("ROLLBACK");
        res.status(500).json({ error: err.message });
    }
});

// NOVA ROTA: MEUS ITENS / COMPROVANTES
app.get("/inventory/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await db.query(`
            SELECT 
                inv.id,
                inv.codigo_resgate,
                inv.data_compra,
                inv.status,
                item.nome,
                item.descricao,
                item.imagem_url,
                item.tipo
            FROM inventario_usuario inv
            JOIN loja_itens item ON inv.item_id = item.id
            WHERE inv.usuario_id = $1
            ORDER BY inv.data_compra DESC
        `, [userId]);

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Criar item loja (Admin)
app.post("/shop/create", async (req, res) => {
    const { usuario_id, nome, descricao, preco, tipo, imagem_url } = req.body;

    try {
        const userCheck = await db.query("SELECT is_admin FROM usuario WHERE id = $1", [usuario_id]);

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ msg: "Usuário não encontrado." });
        }

        if (!userCheck.rows[0].is_admin) {
            return res.status(403).json({ msg: "Acesso negado. Apenas administradores podem criar itens." });
        }

        await db.query(
            "INSERT INTO loja_itens (nome, descricao, preco, tipo, imagem_url) VALUES ($1, $2, $3, $4, $5)",
            [nome, descricao, preco, tipo, imagem_url]
        );

        res.status(201).json({ msg: "Item criado com sucesso!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Deletar item loja (Admin)
app.delete("/shop/:id", async (req, res) => {
    const { id } = req.params;
    const { usuario_id } = req.body;

    try {
        const userCheck = await db.query("SELECT is_admin FROM usuario WHERE id = $1", [usuario_id]);

        if (userCheck.rows.length === 0 || !userCheck.rows[0].is_admin) {
            return res.status(403).json({ msg: "Acesso negado. Apenas administradores podem excluir itens." });
        }

        await db.query("DELETE FROM loja_itens WHERE id = $1", [id]);
        res.json({ msg: "Item removido com sucesso!" });

    } catch (err) {
        if (err.code === '23503') {
            return res.status(400).json({ msg: "Não é possível excluir este item pois usuários já o compraram." });
        }
        res.status(500).json({ error: err.message });
    }
});

// Editar item loja (Admin)
app.put("/shop/:id", async (req, res) => {
    const { id } = req.params;
    const { usuario_id, nome, descricao, preco, tipo, imagem_url } = req.body;

    try {
        const userCheck = await db.query("SELECT is_admin FROM usuario WHERE id = $1", [usuario_id]);

        if (userCheck.rows.length === 0 || !userCheck.rows[0].is_admin) {
            return res.status(403).json({ msg: "Acesso negado." });
        }

        await db.query(
            "UPDATE loja_itens SET nome=$1, descricao=$2, preco=$3, tipo=$4, imagem_url=$5 WHERE id=$6",
            [nome, descricao, preco, tipo, imagem_url, id]
        );

        res.json({ msg: "Item atualizado com sucesso!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================================================================
// ROTAS DE RECUPERAÇÃO DE SENHA
// ==================================================================

// 1. SOLICITAR O LINK (Esqueci a senha)
app.post("/forgot-password", async (req, res) => {
    const { email } = req.body;

    try {
        // 1. Verifica se o usuário existe
        const userRes = await db.query("SELECT id, nome FROM usuario WHERE email = $1", [email]);

        if (userRes.rows.length === 0) {
            return res.status(404).json({ msg: "Email não encontrado no sistema." });
        }

        const user = userRes.rows[0];

        // 2. Gera um token aleatório (hexadecimal)
        const token = crypto.randomBytes(20).toString('hex');

        // 3. Define expiração (1 hora a partir de agora)
        const now = new Date();
        now.setHours(now.getHours() + 1);

        // 4. Salva no banco
        await db.query(
            "UPDATE usuario SET reset_token = $1, reset_token_expires = $2 WHERE id = $3",
            [token, now, user.id]
        );

        // 5. Link de recuperação (Aponte para o seu FRONTEND)
        // Ex: localhost:5173/reset-password/TOKEN123
        // Se estiver em produção, use sua URL do Vercel
        const frontendUrl = isProduction
            ? "https://biourb.vercel.app"
            : "http://localhost:5173";

        const resetLink = `${frontendUrl}/reset-password/${token}`;

        // --- ENVIO DO EMAIL ---

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'BioUrb - Recuperação de Senha',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Olá, ${user.nome}! 🌿</h2>
                    <p>Recebemos um pedido para redefinir sua senha no BioUrb.</p>
                    <p>Clique no botão abaixo para criar uma nova senha:</p>
                    <a href="${resetLink}" style="background-color: #4caf50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Redefinir Senha</a>
                    <p style="margin-top: 20px; font-size: 12px; color: #777;">Link válido por 1 hora.</p>
                </div>
            `
        };

        // Tenta enviar o email real se tiver config, senão loga no console para teste
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            await transporter.sendMail(mailOptions);
        } else {
            console.log("⚠️ EMAIL NÃO CONFIGURADO NO .ENV. MODO DE TESTE:");
            console.log("🔗 LINK GERADO: ", resetLink);
        }

        res.json({ msg: "Email de recuperação enviado!" });

    } catch (err) {
        console.error("Erro no forgot-password:", err);
        res.status(500).json({ error: "Erro ao processar solicitação." });
    }
});

// 2. REDEFINIR A SENHA (Resetar efetivamente)
app.post("/reset-password/:token", async (req, res) => {
    const { token } = req.params;
    const { password } = req.body; // Nova senha

    try {
        // 1. Busca usuário com esse token E que o token ainda não venceu
        const userRes = await db.query(
            "SELECT id FROM usuario WHERE reset_token = $1 AND reset_token_expires > NOW()",
            [token]
        );

        if (userRes.rows.length === 0) {
            return res.status(400).json({ msg: "Link inválido ou expirado." });
        }

        const user = userRes.rows[0];

        // 2. Criptografa a nova senha
        const hash = await bcrypt.hash(password, 10);

        // 3. Atualiza a senha e LIMPA o token (para não ser usado de novo)
        await db.query(
            "UPDATE usuario SET senha = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2",
            [hash, user.id]
        );

        res.json({ msg: "Senha alterada com sucesso! Agora você pode fazer login." });

    } catch (err) {
        console.error("Erro no reset-password:", err);
        res.status(500).json({ error: "Erro ao redefinir senha." });
    }
});

// --- ROTAS ADMIN: USUÁRIOS ---

// Listar todos os usuários
app.get("/admin/users", async (req, res) => {
    try {
        // 1. Buscamos do jeito padrão do banco (snake_case)
        const result = await db.query("SELECT id, nome, email, saldo, is_admin, tipo_usuario FROM usuario ORDER BY id ASC");

        // 2. Convertemos manualmente antes de enviar para o Frontend
        const usersFormatados = result.rows.map(user => ({
            id: user.id,
            nome: user.nome,
            email: user.email,
            saldo: user.saldo,
            isAdmin: user.is_admin,
            tipo_usuario: user.tipo_usuario
        }));

        res.json(usersFormatados);
    } catch (err) {
        console.error("Erro ao listar usuários:", err);
        res.status(500).json({ error: err.message });
    }
});

// EDITAR USUÁRIO (PUT)
app.put("/admin/users/:id", async (req, res) => {
    const { id } = req.params;
    const { nome, email, saldo, isAdmin, novaSenha, tipo_usuario } = req.body; // Recebemos 'novaSenha'

    try {
        // 1. Atualiza os dados básicos (Nome, Email, Saldo, Admin)
        await db.query(
            "UPDATE usuario SET nome=$1, email=$2, saldo=$3, is_admin=$4, tipo_usuario=$5 WHERE id=$6",
            [nome, email, saldo, isAdmin, tipo_usuario, id]
        );

        // 2. Se o admin digitou uma nova senha, criptografa e atualiza
        if (novaSenha && novaSenha.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(novaSenha, salt);

            await db.query("UPDATE usuario SET senha = $1 WHERE id = $2", [hash, id]);
        }

        res.json({ msg: "Usuário atualizado com sucesso!" });
    } catch (err) {
        console.error("Erro ao atualizar:", err);
        res.status(500).json({ error: err.message });
    }
});

// Deletar usuário
app.delete("/admin/users/:id", async (req, res) => {
    const { id } = req.params;
    try {
        // Primeiro removemos dependencias (opcional, depende da sua FK)
        await db.query("DELETE FROM inventario_usuario WHERE usuario_id = $1", [id]);
        await db.query("DELETE FROM usuario WHERE id = $1", [id]);
        res.json({ msg: "Usuário deletado!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ROTAS ADMIN: VALIDAÇÃO DE ITENS ---

// Listar todos os pedidos (Pendentes primeiro)
app.get("/admin/redemptions", async (req, res) => {
    try {
        const result = await db.query(`
            SELECT i.id, i.codigo_resgate, i.status, i.data_compra, 
                   u.nome as usuario_nome, u.email as usuario_email,
                   l.nome as item_nome
            FROM inventario_usuario i
            JOIN usuario u ON i.usuario_id = u.id
            JOIN loja_itens l ON i.item_id = l.id
            ORDER BY 
                CASE WHEN i.status = 'Pendente' THEN 1 ELSE 2 END,
                i.data_compra DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Dar baixa no item (Marcar como Retirado)
app.put("/admin/redemptions/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("UPDATE inventario_usuario SET status = 'Retirado' WHERE id = $1", [id]);
        res.json({ msg: "Item marcado como retirado!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Configura o Cloudinary com as chaves do .env
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Função auxiliar para pegar o "public_id" da URL do Cloudinary
const getPublicIdFromUrl = (url) => {
    try {
        const splitUrl = url.split('/');
        const filename = splitUrl.pop().split('.')[0]; // Pega o nome sem extensão
        const folder = splitUrl.pop(); // Pega a pasta (ex: biourb_trees)
        const regex = /\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/;
        const match = url.match(regex);
        return match ? match[1] : null;
    } catch (e) {
        console.error("Erro ao extrair ID da imagem", e);
        return null;
    }
};

// ==================================================================
// ROTAS DO DIÁRIO (COM SEGURANÇA: APENAS DONO OU ADMIN)
// ==================================================================

// 1. Criar Registro (Upload + Moedas + Verificação de Dono)
app.post("/timeline", async (req, res) => {
    // Recebe userId para validação de segurança
    const { treeId, photoUrl, note, date, userId } = req.body;

    if (!treeId || !photoUrl || !userId) {
        return res.status(400).json({ msg: "Dados incompletos." });
    }

    try {
        // --- VERIFICAÇÃO DE SEGURANÇA ---
        // Busca quem é o dono da árvore e se o usuário solicitante é admin
        const checkAuth = await db.query(
            `SELECT a.usuario_id, u.is_admin 
             FROM arvore a, usuario u 
             WHERE a.id = $1 AND u.id = $2`,
            [treeId, userId]
        );

        if (checkAuth.rows.length === 0) {
            return res.status(404).json({ msg: "Árvore ou usuário não encontrados." });
        }

        const { usuario_id: donoId, is_admin: isAdmin } = checkAuth.rows[0];

        // Se NÃO for o dono E NÃO for admin, bloqueia.
        if (donoId !== userId && !isAdmin) {
            return res.status(403).json({ msg: "Acesso negado: Você não é o dono desta árvore." });
        }
        // --------------------------------

        await db.query("BEGIN");

        // Verifica se essa árvore já deu moeda hoje
        const checkToday = await db.query(
            `SELECT id FROM diario_arvore 
             WHERE arvore_id = $1 
             AND recompensa_concedida = true
             AND data_registro::date = CURRENT_DATE`,
            [treeId]
        );

        const jaGanhouHoje = checkToday.rows.length > 0;
        let msg = "Registro salvo no diário!";
        let novoSaldo = null;

        // Insere o registro
        const result = await db.query(
            `INSERT INTO diario_arvore (arvore_id, imagem_url, observacao, data_registro, recompensa_concedida) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, arvore_id, imagem_url, observacao, data_registro`,
            [treeId, photoUrl, note, date || new Date(), !jaGanhouHoje]
        );

        // Se NÃO ganhou hoje ainda, dá as moedas PARA O DONO
        if (!jaGanhouHoje) {
            await db.query("UPDATE usuario SET saldo = saldo + 10 WHERE id = $1", [donoId]);

            // Se quem postou é o dono, atualiza o saldo dele na resposta
            if (donoId === userId) {
                const userRes = await db.query("SELECT saldo FROM usuario WHERE id = $1", [userId]);
                novoSaldo = userRes.rows[0].saldo;
            }
            msg = "Registro salvo! +10 BioCoins (Bônus Diário) 🪙";
        } else {
            msg = "Registro salvo! (Bônus diário já coletado hoje)";
        }

        await db.query("COMMIT");

        res.status(201).json({
            ...result.rows[0],
            treeId: result.rows[0].arvore_id, // Adaptação para frontend
            photoUrl: result.rows[0].imagem_url, // Adaptação para frontend
            note: result.rows[0].observacao, // Adaptação para frontend
            date: result.rows[0].data_registro, // Adaptação para frontend
            newBalance: novoSaldo,
            msg: msg
        });

    } catch (err) {
        await db.query("ROLLBACK");
        console.error("ERRO AO SALVAR TIMELINE:", err);
        res.status(500).json({ error: "Erro ao salvar no banco: " + err.message });
    }
});

// 2. Listar Registros
app.get("/timeline", async (req, res) => {
    const { treeId } = req.query;
    try {
        const result = await db.query(
            `SELECT * FROM diario_arvore WHERE arvore_id = $1 ORDER BY data_registro DESC`,
            [treeId]
        );

        // Formata para o frontend
        const formatted = result.rows.map(item => ({
            id: item.id,
            treeId: item.arvore_id,
            photoUrl: item.imagem_url,
            note: item.observacao,
            date: item.data_registro
        }));

        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. EXCLUIR REGISTRO (Com retorno do Saldo Real)
app.delete("/timeline/:id", async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ msg: "Usuário não identificado." });

    try {
        await db.query("BEGIN");

        // 1. Busca dados da foto e do dono
        const itemRes = await db.query(`
            SELECT d.*, a.usuario_id as dono_id
            FROM diario_arvore d
            JOIN arvore a ON d.arvore_id = a.id
            WHERE d.id = $1
        `, [id]);

        if (itemRes.rows.length === 0) {
            await db.query("ROLLBACK");
            return res.status(404).json({ msg: "Registro não encontrado." });
        }

        const item = itemRes.rows[0];

        // 2. Verifica permissão (Admin ou Dono)
        const adminCheck = await db.query("SELECT is_admin FROM usuario WHERE id = $1", [userId]);
        const isAdmin = adminCheck.rows[0]?.is_admin;

        if (item.dono_id !== userId && !isAdmin) {
            await db.query("ROLLBACK");
            return res.status(403).json({ msg: "Acesso negado." });
        }

        // 3. Deleta do Cloudinary
        if (item.imagem_url) {
            const publicId = getPublicIdFromUrl(item.imagem_url);
            if (publicId) await cloudinary.uploader.destroy(publicId);
        }

        // 4. Lógica do Estorno + Busca do Saldo Novo
        let novoSaldo = null;

        if (item.recompensa_concedida) {
            // Remove moeda do DONO da árvore
            await db.query("UPDATE usuario SET saldo = saldo - 10 WHERE id = $1", [item.dono_id]);

            // BUSCA O SALDO ATUALIZADO NO BANCO
            const userRes = await db.query("SELECT saldo FROM usuario WHERE id = $1", [item.dono_id]);
            novoSaldo = userRes.rows[0].saldo;
        }

        // 5. Deleta do Banco
        await db.query("DELETE FROM diario_arvore WHERE id = $1", [id]);

        await db.query("COMMIT");

        // 6. Retorna o saldo novo para o Frontend atualizar
        res.json({
            msg: "Registro excluído.",
            newBalance: novoSaldo // Envia null se não houve estorno, ou o valor se houve
        });

    } catch (err) {
        await db.query("ROLLBACK");
        res.status(500).json({ error: err.message });
    }
});

// ==================================================================
// ROTA DO CHATBOT URBANINHO 🤖
// ==================================================================
app.post("/chat", async (req, res) => {
    const { message, history } = req.body;

    if (!message) return res.status(400).json({ msg: "Mensagem vazia." });

    try {
        // --- O TRUQUE DE PERSONALIDADE ---
        // Criamos mensagens iniciais "falsas" para treinar o modelo
        const promptInicial = {
            role: "user",
            parts: [{
                text: `
                Aja como o Urbaninho, o mascote digital e guardião da natureza do app BioUrb. 🌳
        
                Sua Persona:
                - Você NÃO é uma IA genérica, você é um personagem entusiasmado e amigo da natureza.
                - Use emojis variados (🌿, 🍂, 💧) de vez em quando.
                - Linguagem: Simples, direta e acolhedora (como um guia de parque ecológico).
                - Se o usuário agradecer, diga: "A natureza agradece! 💚".
        
                Suas Regras:
                - Assunto PERMITIDO: Apenas árvores, plantas, adubo, rega, poda, clima e meio ambiente.
                - Assunto PROIBIDO: Se perguntarem de política, futebol, código ou qualquer outra coisa, responda de forma divertida: "Minhas raízes não chegam nesse assunto! 🌱 Eu só entendo de tudo que cresce na terra. Posso ajudar com suas plantas?"
            ` }]
        };

        const confirmacaoModelo = {
            role: "model",
            parts: [{ text: "Entendido! Eu sou o Urbaninho e estou pronto para ajudar com a natureza! 🌳" }]
        };

        // Montamos o histórico final: [Treinamento, Confirmação, ...Histórico Real do Usuário]
        const chatHistory = [
            promptInicial,
            confirmacaoModelo,
            ...(history || [])
        ];

        // Inicia o chat
        const chat = model.startChat({
            history: chatHistory,
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        res.json({ reply: text });

    } catch (err) {
        console.error("Erro no Urbaninho:", err);
        // Mostra o erro real no console para ajudar a debugar se persistir
        res.status(500).json({ error: "O Urbaninho está tirando um cochilo. Tente novamente mais tarde." });
    }
});

// ==================================================================
// NOVA ROTA: APENAS VERIFICAR O CÓDIGO (Sem dar baixa)
// ==================================================================
app.post("/inventory/check", async (req, res) => {
    const { codigo } = req.body;

    if (!codigo) return res.status(400).json({ msg: "Código inválido." });

    try {
        // 1. Busca o item e dados do usuário dono do item
        const itemResult = await db.query(`
            SELECT i.*, l.nome as nome_item, l.descricao, l.imagem_url, u.nome as nome_usuario 
            FROM inventario_usuario i
            JOIN loja_itens l ON i.item_id = l.id
            JOIN usuario u ON i.usuario_id = u.id
            WHERE i.codigo_resgate = $1
        `, [codigo]);

        if (itemResult.rows.length === 0) {
            return res.status(404).json({ msg: "Código não encontrado!" });
        }

        const item = itemResult.rows[0];

        // 2. Verifica status
        if (item.status === 'Retirado') {
            return res.status(400).json({
                msg: "Este item JÁ FOI retirado anteriormente!",
                alreadyRedeemed: true, // Flag para o frontend saber
                item
            });
        }

        if (item.status !== 'Pendente') {
            return res.status(400).json({ msg: `Item inválido (Status: ${item.status})` });
        }

        // 3. Retorna os dados para a tela de confirmação
        res.json({
            success: true,
            msg: "Código válido! Confirme a entrega.",
            item: item // Manda tudo que achamos no select
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Erro ao verificar código." });
    }
});

// ==================================================================
// ROTA DE VALIDAÇÃO DE RESGATE (O Lojista usa isso)
// ==================================================================
app.post("/inventory/redeem", async (req, res) => {
    const { codigo } = req.body; // O código que veio do QR Code

    if (!codigo) return res.status(400).json({ msg: "Código inválido." });

    try {
        // 1. Busca o item pelo código de resgate
        const itemResult = await db.query(
            "SELECT * FROM inventario_usuario WHERE codigo_resgate = $1",
            [codigo]
        );

        if (itemResult.rows.length === 0) {
            return res.status(404).json({ msg: "Código não encontrado!" });
        }

        const item = itemResult.rows[0];

        // 2. Verifica se já foi retirado
        if (item.status === 'Retirado') {
            return res.status(400).json({ msg: "Este item JÁ FOI retirado anteriormente!", item });
        }

        // 3. Verifica se está cancelado ou inválido
        if (item.status !== 'Pendente') {
            return res.status(400).json({ msg: `Item inválido (Status: ${item.status})` });
        }

        // 4. Tudo certo? Atualiza para 'Retirado'
        await db.query(
            "UPDATE inventario_usuario SET status = 'Retirado' WHERE id = $1",
            [item.id]
        );

        // 5. Retorna sucesso e os dados do item para mostrar na tela do lojista
        res.json({
            success: true,
            msg: "Resgate confirmado com sucesso!",
            item: {
                nome: item.nome_item, // ou o nome da coluna correta no seu DB
                data_compra: item.data_compra
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Erro ao processar validação." });
    }
});

// ==================================================================
// ROTA PARA BUSCAR DADOS DO PERFIL (Stats)
// ==================================================================
app.get("/user/stats/:id", async (req, res) => {
    const { id } = req.params;
    try {
        // Busca saldo atualizado + foto
        const userRes = await db.query("SELECT saldo, foto FROM usuario WHERE id = $1", [id]);

        // Conta árvores cadastradas pelo usuário
        const treesRes = await db.query("SELECT COUNT(*) FROM arvore WHERE usuario_id = $1", [id]);

        // Conta áreas cadastradas pelo usuário (ajuste o nome da tabela se for diferente)
        const areasRes = await db.query("SELECT COUNT(*) FROM areas_verdes WHERE usuario_id = $1", [id]);

        res.json({
            saldo: userRes.rows[0].saldo,
            foto: userRes.rows[0].foto,
            totalArvores: treesRes.rows[0].count,
            totalAreas: areasRes.rows[0].count
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao buscar stats." });
    }
});

// ==================================================================
// ROTA PARA ATUALIZAR AVATAR
// ==================================================================
app.put("/user/avatar/:id", async (req, res) => {
    const { id } = req.params;
    const { fotoUrl } = req.body; // Vamos salvar a URL da imagem

    try {
        await db.query("UPDATE usuario SET foto = $1 WHERE id = $2", [fotoUrl, id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao atualizar foto." });
    }
});

// ATUALIZAR DADOS DO PRÓPRIO PERFIL (Nome e Senha)
app.put("/user/update/:id", async (req, res) => {
    const { id } = req.params;
    const { nome, senhaAtual, novaSenha } = req.body;

    try {
        // 1. Busca o usuário para confirmar senha atual (segurança)
        const userRes = await db.query("SELECT * FROM usuario WHERE id = $1", [id]);
        if (userRes.rows.length === 0) return res.status(404).json({ msg: "Usuário não encontrado." });

        const user = userRes.rows[0];

        // 2. Se enviou senha, valida a atual
        if (novaSenha) {
            if (!senhaAtual) return res.status(400).json({ msg: "Informe a senha atual para alterar a senha." });
            const isMatch = await bcrypt.compare(senhaAtual, user.senha);
            if (!isMatch) return res.status(401).json({ msg: "Senha atual incorreta." });

            // Criptografa a nova
            const hash = await bcrypt.hash(novaSenha, 10);
            await db.query("UPDATE usuario SET senha = $1 WHERE id = $2", [hash, id]);
        }

        // 3. Atualiza o nome
        if (nome && nome !== user.nome) {
            await db.query("UPDATE usuario SET nome = $1 WHERE id = $2", [nome, id]);
        }

        res.json({ msg: "Perfil atualizado com sucesso!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao atualizar perfil." });
    }
});

// ==================================================================
// ROTA DE CONTATO (Formulário do Site)
// ==================================================================
app.post("/contact", async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ msg: "Preencha todos os campos." });
    }

    try {
        const mailOptions = {
            from: process.env.EMAIL_USER, // Sai do seu email (sistema)
            to: process.env.EMAIL_USER,   // Vai PARA o seu email (admin)
            replyTo: email,               // IMPORTANTE: Quando você clicar em responder, vai para o email do usuário
            subject: `📢 Nova Mensagem do Site: ${name}`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
                    <h2 style="color: #4caf50;">Nova mensagem de contato 🌿</h2>
                    <p><strong>Nome:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <hr style="border: 1px solid #eee;">
                    <p><strong>Mensagem:</strong></p>
                    <p style="background: #f9f9f9; padding: 15px; border-radius: 5px;">${message}</p>
                </div>
            `
        };

        // Envia o email usando o transporter que já configuramos antes
        await transporter.sendMail(mailOptions);

        res.json({ msg: "Mensagem enviada com sucesso!" });

    } catch (err) {
        console.error("Erro ao enviar contato:", err);
        res.status(500).json({ error: "Erro ao enviar mensagem. Tente novamente mais tarde." });
    }
});

console.log("Tentando iniciar servidor...");

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});