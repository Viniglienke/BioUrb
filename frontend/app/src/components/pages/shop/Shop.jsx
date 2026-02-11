import React, { useState, useEffect, useContext } from 'react';
import { api } from '../../../services/api';
import { AuthContext } from '../../../context/AuthContext';
import { FaCoins, FaShoppingBag, FaPlus, FaTimes, FaTrash, FaEdit, FaLink, FaUpload, FaImage, FaCheck, FaCut, FaBoxOpen } from 'react-icons/fa';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../../../utils/canvasUtils';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import './Shop.css';

const Shop = () => {
    const [items, setItems] = useState([]);
    const { user, updateUserData } = useContext(AuthContext);
    const navigate = useNavigate();

    const [showAdminModal, setShowAdminModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    // Novo estado para controlar o tipo de entrada (url ou file)
    const [imageInputType, setImageInputType] = useState('url');

    // --- ESTADOS DO CROPPER ---
    const [imageSrc, setImageSrc] = useState(null); // Imagem original carregada
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isCropping, setIsCropping] = useState(false); // Mostra/Esconde o editor

    const [newItem, setNewItem] = useState({
        nome: '',
        descricao: '',
        preco: '',
        tipo: 'badge',
        imagem_url: ''
    });

    // ... (fetchItems, handleDelete, handleBuy permanecem iguais) ...
    const fetchItems = async () => {
        try {
            const res = await api.get('/shop');
            setItems(res.data);
        } catch (error) {
            console.error("Erro ao buscar itens");
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const handleDelete = async (itemId) => {
        if (!window.confirm("Tem certeza que deseja excluir este item da loja?")) return;
        try {
            await api.delete(`/shop/${itemId}`, { data: { usuario_id: user.id } });
            toast.success("Item removido!");
            fetchItems();
        } catch (error) {
            toast.error(error.response?.data?.msg || "Erro ao excluir item.");
        }
    };

    const handleBuy = async (item) => {
        if (user.saldo < item.preco) {
            toast.error("Você não tem BioCoins suficientes!");
            return;
        }
        try {
            const response = await api.post('/shop/buy', { usuario_id: user.id, item_id: item.id });
            toast.success(response.data.msg);
            if (response.data.novoSaldo !== undefined) updateUserData({ saldo: response.data.novoSaldo });
        } catch (error) {
            toast.error(error.response?.data?.msg || "Erro ao processar compra.");
        }
    };

    // --- RESET DO MODAL ---
    const resetModal = () => {
        setIsEditing(false);
        setEditId(null);
        setNewItem({ nome: '', descricao: '', preco: '', tipo: 'badge', imagem_url: '' });
        setImageInputType('url');
        setImageSrc(null);
        setIsCropping(false);
        setZoom(1);
        setCrop({ x: 0, y: 0 });
    };

    const openCreateModal = () => {
        resetModal();
        setShowAdminModal(true);
    };

    const openEditModal = (item) => {
        resetModal();
        setIsEditing(true);
        setEditId(item.id);

        const isBase64 = item.imagem_url && item.imagem_url.startsWith('data:image');
        setImageInputType(isBase64 ? 'file' : 'url');

        setNewItem({
            nome: item.nome,
            descricao: item.descricao,
            preco: item.preco,
            tipo: item.tipo,
            imagem_url: item.imagem_url || ''
        });
        setShowAdminModal(true);
    };

    // --- LÓGICA DE UPLOAD E CROP ---

    // 1. Usuário seleciona o arquivo -> Preparamos o Cropper
    const onFileChange = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImageSrc(reader.result); // Define a imagem para o editor
                setIsCropping(true); // Abre o editor
                setZoom(1);
                setCrop({ x: 0, y: 0 });
            });
            reader.readAsDataURL(file);
        }
    };

    // 2. Callback quando o usuário move/zooma a imagem
    const onCropComplete = (croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    // 3. Usuário clica em "Confirmar Recorte"
    const showCroppedImage = async () => {
        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
            setNewItem({ ...newItem, imagem_url: croppedImage }); // Salva o resultado final
            setIsCropping(false); // Fecha o editor
            toast.success("Imagem ajustada com sucesso!");
        } catch (e) {
            console.error(e);
            toast.error("Erro ao cortar imagem.");
        }
    };

    // --- SUBMIT ---
    const handleSubmitItem = async (e) => {
        e.preventDefault();
        // Impede salvar se estiver no meio do corte
        if (isCropping) {
            toast.warn("Por favor, confirme o recorte da imagem antes de salvar.");
            return;
        }

        if (!newItem.nome || !newItem.preco) {
            toast.warn("Preencha nome e preço.");
            return;
        }

        try {
            const payload = { ...newItem, usuario_id: user.id };
            if (isEditing) {
                await api.put(`/shop/${editId}`, payload);
                toast.success("Item atualizado!");
            } else {
                await api.post('/shop/create', payload);
                toast.success("Item criado!");
            }
            setShowAdminModal(false);
            fetchItems();
        } catch (error) {
            toast.error("Erro ao salvar.");
        }
    };

    return (
        <div className="shop-container">
            <header className="shop-header">
                <h1>Loja BioUrb</h1>
                <p>Troque suas moedas por recompensas exclusivas</p>
                <div className="header-actions">
                    <div className="current-balance">
                        <FaCoins /> <span>{user?.saldo || 0} BioCoins</span>
                    </div>

                    <button className="btn-my-items" onClick={() => navigate('/inventory')}>
                        <FaBoxOpen /> Meus Itens
                    </button>

                    {user?.isAdmin && (
                        <button className="btn-admin-add" onClick={openCreateModal}>
                            <FaPlus /> Novo Item
                        </button>
                    )}
                </div>
            </header>

            {/* --- MODAL --- */}
            {showAdminModal && (
                <div className="modal-overlay">
                    <div className="modal-content admin-modal">
                        <div className="modal-header">
                            <h2>{isEditing ? "Editar Item" : "Cadastrar Novo Item"}</h2>
                            <button className="modal-close" onClick={() => setShowAdminModal(false)}><FaTimes /></button>
                        </div>

                        <form onSubmit={handleSubmitItem} className="admin-form">
                            {/* Campos de Texto */}
                            <input type="text" placeholder="Nome do Item" value={newItem.nome} onChange={e => setNewItem({ ...newItem, nome: e.target.value })} />
                            <textarea placeholder="Descrição" value={newItem.descricao} onChange={e => setNewItem({ ...newItem, descricao: e.target.value })} />
                            <div className="form-row">
                                <input type="number" placeholder="Preço" value={newItem.preco} onChange={e => setNewItem({ ...newItem, preco: e.target.value })} />
                                <select value={newItem.tipo} onChange={e => setNewItem({ ...newItem, tipo: e.target.value })}>
                                    <option value="badge">Selo/Emblema</option>
                                    <option value="fisico">Item Físico</option>
                                    <option value="skin">Visual no App</option>
                                </select>
                            </div>

                            {/* --- ÁREA DE IMAGEM --- */}
                            <div className="image-input-section">
                                <div className="input-type-toggle">
                                    <button type="button" className={imageInputType === 'url' ? 'active' : ''} onClick={() => { setImageInputType('url'); setIsCropping(false); }}>
                                        <FaLink /> Web URL
                                    </button>
                                    <button type="button" className={imageInputType === 'file' ? 'active' : ''} onClick={() => setImageInputType('file')}>
                                        <FaUpload /> Upload
                                    </button>
                                </div>

                                {/* MODO URL */}
                                {imageInputType === 'url' && (
                                    <input type="text" placeholder="URL da imagem..." value={newItem.imagem_url && !newItem.imagem_url.startsWith('data:') ? newItem.imagem_url : ''} onChange={e => setNewItem({ ...newItem, imagem_url: e.target.value })} />
                                )}

                                {/* MODO UPLOAD + CROPPER */}
                                {imageInputType === 'file' && (
                                    <div className="file-upload-wrapper">
                                        {!isCropping ? (
                                            <>
                                                {/* Botão de Selecionar Arquivo */}
                                                <label className="custom-file-upload">
                                                    <input type="file" accept="image/*" onChange={onFileChange} />
                                                    <FaImage /> {newItem.imagem_url && newItem.imagem_url.startsWith('data:') ? "Trocar Imagem" : "Escolher Imagem"}
                                                </label>

                                                {/* Preview da Imagem Pronta */}
                                                {newItem.imagem_url && newItem.imagem_url.startsWith('data:') && (
                                                    <div className="preview-container">
                                                        <p>Pré-visualização:</p>
                                                        <img src={newItem.imagem_url} alt="Preview" className="img-preview-final" />

                                                        {/* --- CORREÇÃO AQUI --- */}
                                                        <button
                                                            type="button"
                                                            className="btn-re-edit"
                                                            onClick={() => {
                                                                setImageSrc(newItem.imagem_url); // 1. Carrega a imagem atual no editor
                                                                setZoom(1);                      // 2. Reseta o zoom
                                                                setCrop({ x: 0, y: 0 });         // 3. Reseta a posição
                                                                setIsCropping(true);             // 4. Abre o editor
                                                            }}
                                                        >
                                                            <FaCut /> Ajustar Recorte
                                                        </button>
                                                        {/* --------------------- */}

                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            /* --- EDITOR DE RECORTE --- */
                                            <div className="cropper-container">
                                                <div className="cropper-area">
                                                    <Cropper
                                                        image={imageSrc}
                                                        crop={crop}
                                                        zoom={zoom}
                                                        aspect={3 / 2} // Proporção do Card (Largura / Altura)
                                                        onCropChange={setCrop}
                                                        onCropComplete={onCropComplete}
                                                        onZoomChange={setZoom}
                                                    />
                                                </div>
                                                <div className="slider-container">
                                                    <span className="slider-label">Zoom</span>
                                                    <input
                                                        type="range"
                                                        value={zoom}
                                                        min={1}
                                                        max={3}
                                                        step={0.1}
                                                        aria-labelledby="Zoom"
                                                        onChange={(e) => setZoom(e.target.value)}
                                                        className="zoom-range"
                                                    />
                                                </div>
                                                <div className="cropper-actions">
                                                    <button type="button" className="btn-cancel-crop" onClick={() => setIsCropping(false)}>
                                                        Cancelar
                                                    </button>
                                                    <button type="button" className="btn-apply-crop" onClick={showCroppedImage}>
                                                        <FaCheck /> Confirmar Recorte
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button type="submit" className="btn-confirm" disabled={isCropping}>
                                {isEditing ? "Salvar Alterações" : "Cadastrar"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* LISTAGEM DE ITENS (MANTIDA IGUAL) */}
            <div className="shop-grid">
                {items.map(item => (
                    <div key={item.id} className="shop-card">
                        {user?.isAdmin && (
                            <div className="admin-actions-card">
                                <button className="shop-icon-btn shop-edit" onClick={() => openEditModal(item)}><FaEdit /></button>
                                <button className="shop-icon-btn shop-delete" onClick={() => handleDelete(item.id)}><FaTrash /></button>
                            </div>
                        )}
                        <div className="card-image-placeholder">
                            {item.imagem_url ? <img src={item.imagem_url} alt={item.nome} /> : <FaShoppingBag />}
                        </div>
                        <div className="card-content">
                            <h3>{item.nome}</h3>
                            <p>{item.descricao}</p>
                            <div className="card-footer">
                                <span className="price"><FaCoins /> {item.preco}</span>
                                <button onClick={() => handleBuy(item)} className="btn-buy" disabled={user?.saldo < item.preco}>Comprar</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Shop;