import { useState } from "react";
import { FaUser, FaLock } from "react-icons/fa";
import { Link, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import "./Login.css";


const Login = () => {
  // Estados para capturar o e-mail e a senha digitados pelo usuário
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Pega do contexto as funções de login e o estado de autenticação
  const { signIn, signed } = useContext(AuthContext);

  // Função que será executada ao enviar o formulário
  const handleSubmit = async (e) => {
    e.preventDefault(); // Evita o reload da página
    const data = {
      email,
      password,
    };
    await signIn(data); // Executa a função de login definida no contexto
  };

  // Se o usuário ainda NÃO estiver autenticado, mostra o formulário de login
  if (!signed) {
    return (
      <div className="container">
        <form onSubmit={handleSubmit}>
          <h1>BioUrb</h1>
          <div className="input-field">
            <input
              type="email"
              placeholder="E-mail"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <FaUser className="icon" />
          </div>
          <div className="input-field">
            <input
              type="password"
              placeholder="Senha"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <FaLock className="icon" />
          </div>
          <button type="submit">Login</button>
          <div className="signup-link">
            <p>
              Não tem uma conta? <a href="/register">Registrar</a>{" "}
            </p>
          </div>
        </form>
      </div>
    );
  } else {
    // Se já estiver autenticado, redireciona para a rota /home
    return <Navigate to="/home" />;
  }
};

export default Login;