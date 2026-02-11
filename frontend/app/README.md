# 🌳 BioUrb - Sistema de Controle de Arborização Urbana (Frontend)

Este é o **frontend** do sistema **BioUrb**, uma aplicação para **monitorar e gerenciar áreas arborizadas urbanas**. Desenvolvido com **React**, inclui autenticação de usuários, cadastro e monitoramento de árvores e um canal de contato.

---

## 🚀 Tecnologias Utilizadas

- ⚛️ React
- 🌐 React Router DOM (v6)
- 🔗 Axios
- 🎨 React Icons
- 📢 React Toastify
- 📩 EmailJS
- 📆 date-fns
- 💅 CSS Modules + CSS Puro

---

## ⚙️ Funcionalidades Principais

- **🔐 Autenticação** com validação de CPF, contexto React e `localStorage`.
- **🔁 Rotas Públicas e Privadas** com `PrivateRoute`.
- **🏠 Página Inicial** com visão geral do sistema.
- **🌲 Cadastro de Árvores** com validações, localização e estado de saúde.
- **📋 Monitoramento de Árvores** com edição, exclusão e envio de relatório via email.
- **✉️ Contato** via formulário usando EmailJS.
- **🧭 Layout Responsivo** com Navbar, Footer e feedback com `react-toastify`.

---

## 🛠️ Como Configurar e Executar

### ✅ Pré-requisitos

- Node.js (recomendado v16+)
- NPM ou Yarn
- Backend da API BioUrb rodando

### 📦 Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/Viniglienke/Projeto_Integrador.git
   cd ./frontend/app/
   ```

2. Instale as dependências:
   ```bash
   npm install
   # ou
   yarn install
   ```

3. Crie o arquivo `.env`:
   ```env
   REACT_APP_API_URL=http://localhost:3001
   ```

4. Inicie a aplicação:
   ```bash
   npm start
   # ou
   yarn start
   ```

5. Acesse em: `http://localhost:5173/`

---

## ✉️ Configuração do EmailJS

1. Crie uma conta no [EmailJS](https://www.emailjs.com/).
2. Substitua os seguintes IDs no código:

   - `service_vk5hd8d`
   - `template_c3yyd5r` (contato)
   - `template_qviar4b` (relatórios)
   - `0EZ5fZfY7LfCvIBry` (user ID)

---

## 🧩 Estrutura de Componentes

### 🔐 `AuthContext`

- Gerencia autenticação, sessão e token.
- Utiliza `localStorage` e configura headers no Axios.

### 🔒 `PrivateRoute`

- Redireciona usuários não autenticados para login.

### 🧭 `AppRouter`

- Define rotas públicas e privadas.
- Usa estrutura com `Navbar`, `Container` e `Footer`.

---

## 📝 Observações Importantes

- Validação de CPF feita no frontend.
- Datas formatadas com `date-fns`.
- Botões de editar/excluir disponíveis apenas ao dono do cadastro ou admin (`id = 1`).
- Mensagens de sucesso e erro com `react-toastify`.

---

## 📞 Contato e Suporte

Para dúvidas ou sugestões, utilize o formulário de contato na aplicação ou abra uma **issue** no repositório.

---

**Obrigado por utilizar o BioUrb!** 🌳🌿
