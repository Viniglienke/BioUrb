# 🌳 BioUrb – Gestão Inteligente e Gamificada de Arborização Urbana

> Conectando tecnologia, cidadania e meio ambiente.

O **BioUrb** é uma plataforma completa para monitoramento, gestão e incentivo à arborização urbana. Através de **mapas interativos**, **Inteligência Artificial** e **Gamificação**, engajamos a comunidade a cuidar das áreas verdes da cidade em troca de recompensas reais (BioCoins).

---

## ✨ Funcionalidades Principais

- 🗺️ **Mapeamento Interativo:** Visualização de árvores e áreas verdes via geolocalização.
- 🎮 **Gamificação (BioCoins):** Sistema de recompensas onde ações sustentáveis geram moedas para troca em loja virtual.
- 🤖 **IA Educativa (Urbaninho):** Chatbot integrado com Google Gemini para tirar dúvidas sobre botânica e meio ambiente.
- 📅 **Diário da Árvore:** Timeline para acompanhar o crescimento e saúde das plantas com fotos e observações.
- 🛒 **Loja & Inventário:** Troca de moedas por itens (adubos, sementes) com geração de QR Code para retirada.
- 🔐 **Segurança:** Autenticação completa, recuperação de senha via e-mail e controle de acesso (Admin/User).
- 🌓 **Interface Moderna:** Design responsivo com suporte a Tema Claro e Escuro (Dark Mode).

---

## 🚀 Tecnologias

O projeto é dividido em duas partes principais:

### 🎨 Frontend (`/frontend`)
- **React + Vite**
- Leaflet (Mapas)
- Context API (Gestão de Estado)
- CSS Modules

### ⚙️ Backend (`/backend`)
- **Node.js + Express**
- **PostgreSQL** (Banco de Dados)
- **Cloudinary** (Armazenamento de Imagens)
- **Google Gemini AI** (Inteligência Artificial)
- **Nodemailer** (Serviço de E-mail)

---

## 📂 Estrutura do Repositório

```text
BioUrb/
├── backend/            # API, Regras de Negócio e Conexão com Banco
├── frontend/           # Interface do Usuário (Web/Mobile)
└── README.md           # Documentação Geral

```

---

## ⚙️ Como Rodar o Projeto

Para rodar o sistema completo, você precisará de dois terminais abertos (um para o backend e outro para o frontend).

### Passo 1: Configurar o Backend

1. Entre na pasta: `cd backend`
2. Instale as dependências: `npm install`
3. Configure o arquivo `.env` (use o `.env.example` como base).
4. Inicie o servidor:
```bash
npm start

```


*O servidor rodará em: `http://localhost:3001*`

### Passo 2: Configurar o Frontend

1. Entre na pasta da aplicação: `cd frontend/app`
2. Instale as dependências: `npm install`
3. Configure o arquivo `.env` com a URL do backend.
4. Inicie a interface:
```bash
npm run dev

```


*O site abrirá em: `http://localhost:5173*`

---

Desenvolvido por **Vinícius** 🚀