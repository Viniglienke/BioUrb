import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../services/api';
import { useTheme } from '../../../context/ThemeContext';
import { FaUsers, FaBoxOpen, FaCheck, FaTrash, FaEdit, FaSearch } from 'react-icons/fa';
import logoIcon from '../../../img/logo-icon.svg';
import './AdminPanel.css';

const AdminPanel = () => {

    const { theme } = useTheme();

    const [activeTab, setActiveTab] = useState('users');
    const [usersList, setUsersList] = useState([]);
    const [redemptionsList, setRedemptionsList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState(null);

    useEffect(() => {
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'redemptions') fetchRedemptions();
    }, [activeTab]);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/admin/users');
            setUsersList(res.data);
        } catch (error) { console.error(error); }
    };

    const fetchRedemptions = async () => {
        try {
            const res = await api.get('/admin/redemptions');
            setRedemptionsList(res.data);
        } catch (error) { console.error(error); }
    };

    const handleDeleteUser = async (id) => {
        if (window.confirm("Tem certeza? Isso apagará tudo deste usuário.")) {
            await api.delete(`/admin/users/${id}`);
            fetchUsers();
        }
    };

    // --- LÓGICA INTELIGENTE DE SALVAMENTO ---
    const handleUpdateUser = async (e) => {
        e.preventDefault();

        // Aqui está o pulo do gato: Sincronizamos os campos automaticamente
        const dadosAtualizados = {
            ...editingUser,
            // Se o tipo escolhido for 'admin', forçamos is_admin ser true. Senão, false.
            isAdmin: editingUser.tipo_usuario === 'admin'
        };

        try {
            await api.put(`/admin/users/${editingUser.id}`, dadosAtualizados);
            setEditingUser(null);
            fetchUsers();
            alert("Usuário atualizado com sucesso!");
        } catch (error) {
            console.error("Erro ao atualizar", error);
            alert("Erro ao atualizar usuário.");
        }
    };

    const handleMarkAsRetrieved = async (id) => {
        if (window.confirm("Confirmar entrega do item?")) {
            await api.put(`/admin/redemptions/${id}`);
            fetchRedemptions();
        }
    };

    const filterData = (data) => {
        if (!searchTerm) return data;
        return data.filter(item =>
            JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const formatRole = (role) => {
        if (role === 'admin') return 'Administrador';
        if (role === 'loja') return 'Parceiro/Loja';
        return 'Membro';
    };

    return (
        <div className={`admin-container ${theme === 'dark' ? 'dark-theme' : ''}`}>

            <aside className="admin-sidebar">
                <Link to="/home" className="sidebar-brand" title="Voltar para o site">
                    <img src={logoIcon} alt="BioUrb" />
                    <h2>BioUrb Admin</h2>
                </Link>
                <nav>
                    <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
                        <FaUsers /> Gerenciar Usuários
                    </button>
                    <button className={activeTab === 'redemptions' ? 'active' : ''} onClick={() => setActiveTab('redemptions')}>
                        <FaBoxOpen /> Validação & Entregas
                    </button>
                </nav>
            </aside>

            <main className="admin-content">
                <header className="admin-header">
                    <h1>{activeTab === 'users' ? 'Lista de Usuários' : 'Controle de Entregas'}</h1>
                    <div className="header-actions" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <div className="search-box">
                            <FaSearch />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </header>

                <div className="content-table-wrapper">
                    {activeTab === 'users' && (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nome</th>
                                    <th>Email</th>
                                    <th>Saldo</th>
                                    <th>Função</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filterData(usersList).map(u => (
                                    <tr key={u.id}>
                                        <td className="code-cell">#{u.id}</td>
                                        <td>{u.nome}</td>
                                        <td>{u.email}</td>
                                        <td>{u.saldo || u.moedas}</td>
                                        <td>
                                            {/* Mostra o Cargo (que visualmente já indica se é admin) */}
                                            <span className={`badge role-${u.tipo_usuario || 'comum'}`}>
                                                {formatRole(u.tipo_usuario || 'comum')}
                                            </span>
                                        </td>
                                        <td className="actions-cell">
                                            <button className="btn-edit" onClick={() => setEditingUser(u)}><FaEdit /></button>
                                            <button className="btn-delete" onClick={() => handleDeleteUser(u.id)}><FaTrash /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'redemptions' && (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Cód.</th>
                                    <th>Usuário</th>
                                    <th>Item</th>
                                    <th>Data</th>
                                    <th>Status</th>
                                    <th>Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filterData(redemptionsList).map(r => (
                                    <tr key={r.id}>
                                        <td className="code-cell">{r.codigo_resgate}</td>
                                        <td><strong>{r.usuario_nome}</strong><br /><small>{r.usuario_email}</small></td>
                                        <td>{r.item_nome}</td>
                                        <td>{new Date(r.data_compra).toLocaleDateString()}</td>
                                        <td><span className={`badge ${r.status}`}>{r.status}</span></td>
                                        <td>
                                            {r.status === 'Pendente' && (
                                                <button className="btn-confirm" onClick={() => handleMarkAsRetrieved(r.id)}>
                                                    <FaCheck /> Entregar
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>

            {/* MODAL DE EDIÇÃO */}
            {editingUser && (
                <div className="modal-overlay">
                    <div className="admin-modal">
                        <h3>Editar Usuário #{editingUser.id}</h3>
                        <form onSubmit={handleUpdateUser}>
                            <label>Nome:</label>
                            <input type="text" value={editingUser.nome || ''} onChange={(e) => setEditingUser({ ...editingUser, nome: e.target.value })} />

                            <label>Email:</label>
                            <input type="email" value={editingUser.email || ''} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} />

                            <label>Alterar Senha (Opcional):</label>
                            <input type="password" placeholder="Nova senha..." value={editingUser.novaSenha || ''} onChange={(e) => setEditingUser({ ...editingUser, novaSenha: e.target.value })} />

                            <label>Saldo (BioCoins):</label>
                            <input type="number" value={editingUser.saldo !== undefined ? editingUser.saldo : editingUser.moedas} onChange={(e) => setEditingUser({ ...editingUser, saldo: e.target.value })} />

                            {/* O SELECT CONTROLA TUDO AGORA */}
                            <label>Função / Cargo:</label>
                            <select
                                className="admin-select"
                                value={editingUser.tipo_usuario || 'comum'}
                                onChange={(e) => setEditingUser({ ...editingUser, tipo_usuario: e.target.value })}
                            >
                                <option value="comum">Membro (Padrão)</option>
                                <option value="loja">Parceiro (Lojista)</option>
                                <option value="admin">Administrador (Acesso Total)</option>
                            </select>

                            <div className="modal-hint">
                                <small>Nota: Selecionar "Administrador" dará acesso total ao sistema.</small>
                            </div>

                            <div className="modal-actions">
                                <button type="button" onClick={() => setEditingUser(null)}>Cancelar</button>
                                <button type="submit" className="save-btn">Salvar Alterações</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;