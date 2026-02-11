# 🌳 BioUrb - Sistema de Gestão de Arborização Urbana (Frontend)

Este é o **frontend** do sistema **BioUrb**, uma aplicação moderna para **monitorar áreas verdes**, engajar cidadãos através de **gamificação** e promover a educação ambiental com **Inteligência Artificial**.

Desenvolvido com **React + Vite**, o sistema oferece uma experiência fluida, responsiva e com temas claro/escuro.

---

## 🚀 Tecnologias Utilizadas

- ⚛️ **React** (Hooks & Context API)
- ⚡ **Vite** (Build tool rápida)
- 🌐 **React Router DOM** (Navegação SPA)
- 🗺️ **Leaflet / React-Leaflet** (Mapas interativos)
- 🔗 **Axios** (Comunicação com API)
- 🎨 **CSS Modules** & Variáveis CSS (Temas Dark/Light)
- 📢 **React Toastify** (Notificações visuais)
- 🤖 **Google Gemini Integration** (Chatbot "Urbaninho")
- 📷 **Cloudinary** (Upload de imagens)
- 🎫 **QRCode.react** (Geração de códigos de resgate)

---

## ⚙️ Funcionalidades Principais

### 🔐 Autenticação & Segurança
- Login e Cadastro com validação de CPF.
- **Recuperação de Senha** via e-mail (Token seguro).
- Rotas Privadas e persistência de sessão.

### 🌳 Gestão de Árvores
- **Mapa Interativo:** Visualize árvores e áreas verdes na sua cidade.
- **Cadastro:** Adicione novas árvores com foto, espécie e localização.
- **Diário da Árvore:** Registre a evolução da planta e ganhe recompensas diárias.

### 🎮 Gamificação (BioCoins)
- **Moeda Virtual:** Ganhe BioCoins ao cadastrar árvores e cuidar delas.
- **Loja Virtual:** Troque suas moedas por itens reais (adubo, sementes, brindes).
- **Inventário:** Gerencie seus itens e gere **QR Codes** para retirar na loja física.

### 🤖 Inteligência Artificial
- **Urbaninho:** Um mascote virtual movido a IA que tira dúvidas sobre meio ambiente e cuidados com plantas.

### 🎨 Interface
- **Dark Mode:** Alternância completa entre tema claro e escuro.
- **Responsividade:** Funciona perfeitamente em celulares e computadores.

---

## 🛠️ Instalação e Execução

### ✅ Pré-requisitos

- Node.js (versão 18 ou superior recomendada)
- Backend da API BioUrb rodando na porta 3001

### 📦 Passos

1. Entre na pasta do frontend:
   ```bash
   cd frontend/app

```

2. Instale as dependências:
```bash
npm install

```


3. **Configuração de Ambiente (.env):**
Crie um arquivo `.env` na raiz da pasta `frontend/app` com o seguinte conteúdo:
```env
# URL do Backend (Sem barra no final)
VITE_API_URL=http://localhost:3001

```


4. Inicie a aplicação em modo de desenvolvimento:
```bash
npm run dev

```


5. Acesse no navegador (geralmente em): `http://localhost:5173/`

---

## 🧩 Estrutura de Pastas

```text
src/
├── components/          # Componentes reutilizáveis (Botões, Inputs, Modal)
├── context/             # Gerenciamento de estado global (Auth, Theme)
├── img/                 # Assets estáticos (Logos, ícones)
├── pages/               # Páginas da aplicação
│   ├── admin/           # Painel Administrativo
│   ├── contact/         # Formulário de Contato
│   ├── home/            # Dashboard Principal
│   ├── login/           # Autenticação e Recuperação de Senha
│   ├── map/             # Mapa interativo
│   ├── shop/            # Loja e Inventário
│   └── trees/           # Cadastro e Detalhes de árvores
├── routes/              # Configuração de rotas e proteção
├── services/            # Configuração do Axios (api.js)
└── styles/              # Variáveis globais e temas (theme.css)

```

---

## 📝 Observações

* **Mapas:** O sistema utiliza OpenStreetMap (gratuito).
* **Uploads:** As imagens são enviadas para o Cloudinary (via Backend).
* **Temas:** As cores são controladas via variáveis CSS em `src/styles/theme.css`.

---

## 📞 Contato

Dúvidas sobre o funcionamento? Entre em contato pelo formulário no próprio site ou abra uma issue no GitHub.

---

**Desenvolvido por Vinícius** 🚀