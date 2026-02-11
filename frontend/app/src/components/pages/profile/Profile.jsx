import React, { useContext, useEffect, useState, useRef } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { api } from '../../../services/api';
import { useNavigate } from 'react-router-dom';
import CountUp from 'react-countup';
import { toast } from 'react-toastify';
import {
    FaUserCircle, FaSignOutAlt, FaQrcode, FaPen,
    FaLeaf, FaCoins, FaChartLine, FaMapMarkedAlt, FaCamera, FaTimes, FaCloudUploadAlt, FaBoxOpen
} from 'react-icons/fa';
import './Profile.css';

// Lista de Avatares Pré-definidos
const PRESET_AVATARS = [
    // Linha 1 (Homem)
    "https://cdn-icons-png.flaticon.com/512/12088/12088085.png", // Homem 1
    "https://cdn-icons-png.flaticon.com/512/6453/6453470.png", // Homem 2
    "https://cdn-icons-png.flaticon.com/512/4490/4490406.png", // Homem 3
    "https://cdn-icons-png.flaticon.com/512/7556/7556086.png", // Homem 4

    // Linha 2 (Mulher)
    "https://cdn-icons-png.flaticon.com/512/6008/6008921.png", // Mulher 1
    "https://cdn-icons-png.flaticon.com/512/2317/2317880.png", // Mulher 2
    "https://cdn-icons-png.flaticon.com/512/3319/3319392.png", // Mulher 3
    "https://cdn-icons-png.flaticon.com/512/3678/3678101.png", // Mulher 4

    // Linha 3 (Natureza)
    "https://cdn-icons-png.flaticon.com/512/18899/18899465.png", // Árvore na Mão
    "https://cdn-icons-png.flaticon.com/512/427/427503.png", // Duas Árvores
    "https://cdn-icons-png.flaticon.com/512/346/346195.png", // Broto
    "https://cdn-icons-png.flaticon.com/512/15561/15561607.png",  // Pinheiro

    // Linha 4 (Natureza)
    "https://cdn-icons-png.flaticon.com/512/6629/6629939.png", // Árvore Rosa
    "https://cdn-icons-png.flaticon.com/512/3175/3175232.png", // Várias Árvores
    "https://cdn-icons-png.flaticon.com/512/4664/4664715.png", // Casa Feliz Com Árvore
    "https://cdn-icons-png.flaticon.com/512/2220/2220093.png" // Laranjeira
];

const Profile = () => {
    const { user, signOut, setUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [stats, setStats] = useState({ saldo: 0, totalArvores: 0, totalAreas: 0 });
    const [loading, setLoading] = useState(true);
    const [showAvatarModal, setShowAvatarModal] = useState(false);

    // Estados para Edição de Perfil
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [editForm, setEditForm] = useState({ nome: '', senhaAtual: '', novaSenha: '' });

    useEffect(() => {
        if (!user) navigate('/');
    }, [user, navigate]);

    useEffect(() => {
        if (user) {
            fetchStats();
            setEditForm(prev => ({ ...prev, nome: user.nome }));
        }
    }, [user]);

    const fetchStats = async () => {
        try {
            const { data } = await api.get(`/user/stats/${user.id}`);
            setStats(data);
            if (data.foto !== user.foto || data.saldo !== user.saldo) {
                setUser(prev => ({ ...prev, foto: data.foto, saldo: data.saldo }));
            }
        } catch (error) {
            console.error("Erro ao carregar perfil", error);
        } finally {
            setLoading(false);
        }
    };

    const saveNewAvatar = async (newUrl) => {
        try {
            await api.put(`/user/avatar/${user.id}`, { fotoUrl: newUrl });
            setUser(prev => ({ ...prev, foto: newUrl }));
            setShowAvatarModal(false);
            toast.success("Foto atualizada com sucesso!");
        } catch (error) {
            toast.error("Erro ao salvar foto.");
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) return toast.warning("Máximo 5MB.");

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => saveNewAvatar(reader.result);
        reader.onerror = () => toast.error("Erro ao processar imagem.");
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/user/update/${user.id}`, editForm);
            setUser(prev => ({ ...prev, nome: editForm.nome }));
            toast.success("Perfil atualizado!");
            setShowEditProfile(false);
            setEditForm(prev => ({ ...prev, senhaAtual: '', novaSenha: '' })); // Limpa senhas
        } catch (error) {
            toast.error(error.response?.data?.msg || "Erro ao atualizar perfil.");
        }
    };

    if (!user) return null;
    const isAdmin = user?.tipo === 'admin';
    const isPartner = user?.tipo === 'loja' || user?.tipo === 'admin';

    return (
        <div className="profile-container">
            <div className="profile-card">
                <div className="profile-header">
                    <div className="avatar-section">
                        <div className="avatar-wrapper" onClick={() => setShowAvatarModal(true)}>
                            {user.foto ? <img src={user.foto} alt="Avatar" className="avatar-img" /> : <FaUserCircle className="avatar-icon" />}
                            <div className="avatar-edit-overlay"><FaCamera /></div>
                        </div>

                        <div className="name-edit-wrapper">
                            <h2 className="user-name">{user.nome}</h2>
                            <button className="btn-edit-profile" onClick={() => setShowEditProfile(true)} title="Editar Perfil">
                                <FaPen />
                            </button>
                        </div>

                        <p className="user-email">{user.email}</p>
                        <div className="role-tags">
                            {isAdmin && <span className="tag admin">Admin</span>}
                            {isPartner && <span className="tag partner">Parceiro</span>}
                            <span className="tag user">Membro</span>
                        </div>
                    </div>

                    <div className="stats-grid">
                        <div className="stat-card coin-card" onClick={() => navigate('/shop')}>
                            <div className="stat-icon-box"><FaCoins /></div>
                            <div className="stat-info">
                                <h3>{loading ? '...' : <CountUp end={stats.saldo} duration={2} separator="." />}</h3>
                                <span>BioCoins</span>
                            </div>
                        </div>
                        <div className="stat-card tree-card" onClick={() => navigate('/monitoring')}>
                            <div className="stat-icon-box"><FaLeaf /></div>
                            <div className="stat-info">
                                <h3>{loading ? '...' : <CountUp end={stats.totalArvores} duration={2.5} />}</h3>
                                <span>Árvores</span>
                            </div>
                        </div>
                        <div className="stat-card area-card" onClick={() => navigate('/areas')}>
                            <div className="stat-icon-box"><FaMapMarkedAlt /></div>
                            <div className="stat-info">
                                <h3>{loading ? '...' : <CountUp end={stats.totalAreas} duration={2.5} />}</h3>
                                <span>Áreas</span>
                            </div>
                        </div>
                    </div>
                </div>

                {(isAdmin || isPartner) && (
                    <div className="section-block management-section">
                        <h4 className="section-title">Painel de Controle</h4>
                        <div className="action-buttons-grid">
                            {isAdmin && <button className="action-btn admin-theme" onClick={() => navigate('/admin')}><FaChartLine /> Painel Admin</button>}
                            {isPartner && <button className="action-btn partner-theme" onClick={() => navigate('/scanner')}><FaQrcode /> Scanner</button>}
                        </div>
                    </div>
                )}

                <div className="section-block">
                    <button className="action-btn-simple" onClick={() => navigate('/inventory')}>
                        <FaBoxOpen /> Meus Itens & Recompensas
                    </button>
                    <button className="logout-btn" onClick={() => { signOut(); navigate('/'); }}>
                        <FaSignOutAlt /> Sair da Conta
                    </button>
                </div>
            </div>

            {/* MODAL AVATAR (MANTIDO) */}
            {showAvatarModal && (
                <div className="avatar-modal-overlay" onClick={() => setShowAvatarModal(false)}>
                    <div className="avatar-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Alterar Foto</h3>
                            <button onClick={() => setShowAvatarModal(false)}><FaTimes /></button>
                        </div>
                        <div className="upload-section">
                            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} accept="image/*" />
                            <button className="btn-upload-photo" onClick={() => fileInputRef.current.click()}>
                                <FaCloudUploadAlt /> Carregar Foto
                            </button>
                            <p className="modal-divider">ou escolha um avatar</p>
                        </div>
                        <div className="avatars-grid">
                            {PRESET_AVATARS.map((url, idx) => (
                                <img key={idx} src={url} alt="Avatar" className={`avatar-option ${user.foto === url ? 'selected' : ''}`} onClick={() => saveNewAvatar(url)} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL EDIÇÃO DE PERFIL (NOVO) */}
            {showEditProfile && (
                <div className="avatar-modal-overlay">
                    <div className="avatar-modal" style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h3>Editar Perfil</h3>
                            <button onClick={() => setShowEditProfile(false)}><FaTimes /></button>
                        </div>
                        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div className="input-group">
                                <label>Nome Completo</label>
                                <input
                                    type="text"
                                    value={editForm.nome}
                                    onChange={e => setEditForm({ ...editForm, nome: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                                />
                            </div>
                            <hr style={{ width: '100%', border: '0', borderTop: '1px solid #eee', margin: '5px 0' }} />
                            <small style={{ color: '#666' }}>Alterar senha (opcional)</small>
                            <div className="input-group">
                                <label>Senha Atual</label>
                                <input
                                    type="password"
                                    placeholder="Necessária para mudar a senha"
                                    value={editForm.senhaAtual}
                                    onChange={e => setEditForm({ ...editForm, senhaAtual: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                                />
                            </div>
                            <div className="input-group">
                                <label>Nova Senha</label>
                                <input
                                    type="password"
                                    placeholder="Digite a nova senha"
                                    value={editForm.novaSenha}
                                    onChange={e => setEditForm({ ...editForm, novaSenha: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                                />
                            </div>
                            <button type="submit" className="btn-upload-photo" style={{ marginTop: '10px' }}>Salvar Alterações</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;