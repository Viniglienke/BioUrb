# 🌱 BioUrb API – Sistema de Gestão e Gamificação Ambiental

API RESTful completa para o gerenciamento de arborização urbana, áreas verdes e gamificação sustentável. O sistema incentiva o engajamento dos usuários através de **BioCoins**, compras em loja virtual, diário da árvore e interação com IA.

Desenvolvido com **Node.js**, **Express**, **PostgreSQL** e integrado com serviços de IA e Nuvem.

---

## 🚀 Tecnologias Utilizadas

- 🟩 **Node.js** & **Express.js** (Backend)
- 🛢️ **PostgreSQL** (Banco de Dados Relacional)
- 🔐 **JWT** (Autenticação Segura)
- 📧 **Nodemailer** (Envio de e-mails para recuperação de senha e contato)
- 🤖 **Google Gemini AI** (Chatbot educativo "Urbaninho")
- ☁️ **Cloudinary** (Armazenamento de imagens na nuvem)
- 🔒 **Bcryptjs** (Criptografia)
- ⚙️ **Dotenv** & **Cors**

---

## 📁 Estrutura do Projeto

```text
backend/
├── index.js                # Arquivo principal (Rotas e Configurações)
├── .env                    # Variáveis de ambiente (NÃO VERSIONADO)
├── package.json            # Dependências
├── vercel.json             # Configuração de Deploy (Vercel)
└── README.md               # Documentação

```

---

## 🔧 Instalação e Execução Local

### ✅ Pré-requisitos

* Node.js instalado (v18+)
* PostgreSQL rodando localmente ou na nuvem (NeonDB/Supabase)

### 📝 Passos

1. Clone o repositório:
```bash
git clone [https://github.com/Viniglienke/BioUrb.git](https://github.com/Viniglienke/BioUrb.git)
cd ./backend/

```


2. Instale as dependências:
```bash
npm install

```


3. **Configuração de Ambiente (.env):**
Crie um arquivo `.env` na raiz da pasta `backend` com as seguintes chaves:
```env
# Servidor e Banco
PORT=3001
DATABASE_URL=postgresql://usuario:senha@host:porta/biourb

# Segurança (JWT)
JWT_SECRET=sua_chave_super_secreta

# E-mail (Nodemailer - Gmail App Password)
EMAIL_USER=seu.email@gmail.com
EMAIL_PASS=sua_senha_de_app

# Upload de Imagens (Cloudinary)
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=sua_api_secret

# Inteligência Artificial (Google Gemini)
GEMINI_API_KEY=sua_chave_gemini

```


4. Execute o servidor:
```bash
npm start
# ou
node index.js

```



Acesse em: [http://localhost:3001](https://www.google.com/search?q=http://localhost:3001)

---

## 🔐 Endpoints da API

### 👤 Autenticação & Usuário

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/register` | Cadastro de novo usuário |
| POST | `/login` | Autenticação (Retorna Token JWT) |
| POST | `/forgot-password` | Solicita link de recuperação de senha |
| POST | `/reset-password/:token` | Redefine a senha via token |
| GET | `/user/stats/:id` | Retorna saldo de BioCoins e estatísticas |

### 🌳 Árvores e Áreas Verdes

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/trees` | Lista todas as árvores cadastradas |
| POST | `/trees` | Cadastra nova árvore (+50 BioCoins) |
| GET | `/areas` | Lista áreas verdes (Parques/Praças) |
| POST | `/areas` | Cadastra nova área verde |

### 📅 Diário da Árvore (Timeline)

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/timeline` | Lista histórico de uma árvore específica |
| POST | `/timeline` | Adiciona foto/registro (+10 BioCoins diário) |
| DELETE | `/timeline/:id` | Remove um registro do diário |

### 🛍️ Gamificação (Loja e Inventário)

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/shop` | Lista itens disponíveis para compra |
| POST | `/shop/buy` | Compra item com BioCoins |
| GET | `/inventory/:userId` | Lista itens comprados pelo usuário |
| POST | `/inventory/redeem` | Lojista valida e dá baixa no QR Code |

### 🤖 IA e Utilitários

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/chat` | Conversa com o **Urbaninho** (Gemini AI) |
| POST | `/contact` | Envia e-mail de contato do site |
| GET | `/stats` | Estatísticas gerais do sistema (Dashboard) |

---

## 🗃️ Principais Tabelas do Banco (SQL)

O sistema utiliza um banco relacional complexo. As tabelas principais são:

1. **usuario**: Armazena dados, saldo de moedas, foto de perfil e tokens de reset.
2. **arvore**: Dados botânicos, localização (lat/long) e dono.
3. **areas_verdes**: Parques e locais de preservação.
4. **loja_itens**: Produtos disponíveis para troca por BioCoins.
5. **inventario_usuario**: Itens comprados e códigos de resgate (QR Code).
6. **diario_arvore**: Histórico de fotos e evolução das plantas.

---

## 📦 Deploy

A API está configurada para rodar na **Vercel** ou qualquer servidor Node.js.

🔗 **Base URL Produção:** `https://api-biourb.vercel.app` (Exemplo)

---

## 👨‍💻 Desenvolvedor

**Vinícius**
[GitHub Profile](https://github.com/Viniglienke)