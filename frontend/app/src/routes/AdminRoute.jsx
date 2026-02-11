import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const AdminRoute = ({ children }) => {
    const { user, loading } = useContext(AuthContext);

    // 1. Se estiver carregando os dados do usuário, segura a ansiedade
    if (loading) {
        return <div>Carregando...</div>;
    }

    // 2. Se não estiver logado OU não for admin, manda para casa
    // Nota: O "!!user.isAdmin" garante que seja um booleano verdadeiro
    if (!user || !user.isAdmin) {
        return <Navigate to="/" />;
    }

    // 3. Se for admin, libera a passagem
    return children;
};

export default AdminRoute;