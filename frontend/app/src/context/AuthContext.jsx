import { createContext, useState, useEffect } from "react";
import { api } from "../services/api";
import { toast } from "react-toastify";

// Cria o contexto
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Estado para evitar flash de conteúdo

  useEffect(() => {
    const loadingStoreData = () => {
      const storageUser = localStorage.getItem("@Auth:user");
      const storageToken = localStorage.getItem("@Auth:token");

      if (storageUser && storageToken) {
        try {
          const parsedUser = JSON.parse(storageUser);
          if (parsedUser) {
            setUser(parsedUser);
            api.defaults.headers.common["Authorization"] = `Bearer ${storageToken}`;
          }
        } catch (error) {
          console.error("Erro ao carregar dados do localStorage:", error);
          localStorage.clear(); // Limpa tudo se estiver corrompido
        }
      }
      setLoading(false);
    };

    loadingStoreData();
  }, []);

  const signIn = async ({ email, password }) => {
    try {
      const response = await api.post("/login", { email, password });

      const { user, token } = response.data;

      // Salva no estado e configura API
      setUser(user);
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // Persistência
      localStorage.setItem("@Auth:user", JSON.stringify(user));
      localStorage.setItem("@Auth:token", token);

      toast.success(`Bem-vindo, ${user.nome}!`);
      return true; // Retorna verdadeiro para indicar sucesso
    } catch (error) {
      const msg = error.response?.data?.msg || "Erro ao realizar login.";
      toast.error(msg);
      return false;
    }
  };

  const signOut = () => {
    localStorage.clear();
    setUser(null);
    api.defaults.headers.common["Authorization"] = undefined;
    // Não usamos window.location.href para evitar reload total, 
    // o React Router redirecionará baseado no estado 'signed'
  };

  // --- NOVA FUNÇÃO ESSENCIAL PARA BIOCOINS ---
  // Permite atualizar o saldo ou nome do usuário sem deslogar
  const updateUserData = (newData) => {
    setUser((prevUser) => {
      if (!prevUser) return null;

      const updatedUser = { ...prevUser, ...newData };
      
      // Atualiza também no localStorage para persistir se der F5
      localStorage.setItem("@Auth:user", JSON.stringify(updatedUser));
      
      return updatedUser;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        signed: !!user,
        user,
        loading,
        signIn,
        signOut,
        updateUserData, // Exportando a função necessária para o formulário de árvores
        setUser,
      }}
    >
      {/* Só renderiza os filhos quando terminar de carregar o storage */}
      {!loading && children}
    </AuthContext.Provider>
  );
};