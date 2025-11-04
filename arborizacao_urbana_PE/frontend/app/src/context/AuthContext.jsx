import { createContext, useState, useEffect } from "react";
import { api } from "../services/api";
import { toast } from "react-toastify";

// Cria o contexto de autenticação para ser usado em toda a aplicação
export const AuthContext = createContext();

// Componente provedor que vai envolver os componentes filhos e fornecer os dados de autenticação
export const AuthProvider = ({ children }) => {
  // Estado que armazena os dados do usuário autenticado
  const [user, setUser] = useState(null);

  // useEffect executa assim que o componente é montado
  useEffect(() => {
    // Função para carregar dados de autenticação do localStorage
    const loadingStoreData = () => {
      const storageUser = localStorage.getItem("@Auth:user");
      const storageToken = localStorage.getItem("@Auth:token");

      // Se usuário e token existirem no localStorage, restaura a sessão
      if (storageUser && storageToken) {
        try {
          const parsedUser = JSON.parse(storageUser); // converte string JSON em objeto
          if (parsedUser) {
            setUser(parsedUser); // atualiza estado do usuário
            // Define o token no header padrão da API para futuras requisições
            api.defaults.headers.common["Authorization"] = `Bearer ${storageToken}`;
          }
        } catch (error) {
          console.error("Erro ao carregar dados do localStorage:", error);
          // Remove dados inválidos do armazenamento
          localStorage.removeItem("@Auth:user");
          localStorage.removeItem("@Auth:token");
        }
      }
    };
    loadingStoreData(); // Executa a função ao montar o componente
  }, []);

  // Função para fazer login do usuário
  const signIn = async ({ email, password }) => {
    try {
      const response = await api.post("/login", { email, password });

      if (response.data.error) {
        toast.error(response.data.error); // Exibe erro da API, se existir
      } else {
        // Salva usuário no estado e token no header da API
        setUser(response.data.user);
        api.defaults.headers.common["Authorization"] = `Bearer ${response.data.token}`;

        // Salva usuário e token no localStorage para manter sessão entre recarregamentos
        localStorage.setItem("@Auth:user", JSON.stringify(response.data.user));
        localStorage.setItem("@Auth:token", response.data.token);

        toast.success("Login realizado com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao fazer login:", error.response ? error.response.data : error.message);
      toast.error("Erro no login. Verifique seus dados.");
    }
  };

  // Função para fazer logout (limpa dados e redireciona)
  const signOut = () => {
    localStorage.clear(); // Remove todos os dados salvos localmente
    setUser(null); // Limpa estado do usuário
    window.location.href = "/"; // Redireciona para a página inicial
  };

  // Retorna o provedor com os valores do contexto acessíveis aos filhos
  return (
    <AuthContext.Provider
      value={{
        user, // Dados do usuário autenticado
        signIn, // Função para login
        signOut, // Função para logout
        signed: !!user, // Booleano indicando se está logado (true se houver usuário)
      }}
    >
      {children} {/* Renderiza os componentes filhos dentro do contexto */}
    </AuthContext.Provider>
  );
};