import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";

// Importa o contexto de autenticação
import { AuthContext } from "../context/AuthContext";

export const PrivateRoute = () => {
  // Acessa o estado de autenticação do usuário a partir do contexto
  const { signed } = useContext(AuthContext);

  // Se o usuário estiver autenticado (signed === true), renderiza os componentes filhos (Outlet)
  // Caso contrário, redireciona para a página de login ("/")
  return signed ? <Outlet /> : <Navigate to="/" />;
};