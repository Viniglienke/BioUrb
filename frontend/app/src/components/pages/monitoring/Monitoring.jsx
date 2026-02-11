import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Monitoring.css';
import {
    FaLock, FaUser, FaTree, FaCalendarAlt, FaMapMarkerAlt,
    FaSearch, FaGlobeAmericas, FaTimes, FaLeaf,
    FaRulerVertical, FaExpand, FaExclamationTriangle, FaHeartbeat,
    FaFilter, FaUndo, FaCamera, FaListUl, FaMap
} from "react-icons/fa";
import emailjs from '@emailjs/browser';
import { isAfter } from 'date-fns';
import { api } from "../../../services/api";
import TreeTimeline from "../../../components/treetimeline/TreeTimeline";
import { toast } from 'react-toastify';
import LocationPicker from "../../../components/locationpicker/LocationPicker";

const Monitoring = () => {
    const navigate = useNavigate()
    const [trees, setTrees] = useState([]);
    const [areas, setAreas] = useState([]);
    const [editing, setEditing] = useState(false);
    const [showMapPicker, setShowMapPicker] = useState(false);

    // --- ESTADO DE VISUALIZAÇÃO (NOVO) ---
    // 'mine' = Meus Registros | 'community' = Comunidade
    const [viewMode, setViewMode] = useState('mine');

    // --- ESTADOS DOS FILTROS ---
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [areaFilter, setAreaFilter] = useState('');

    const [currentTree, setCurrentTree] = useState({
        id: null,
        nome_registrante: '',
        nome_cientifico: '',
        nome_popular: '',
        data_plantio: '',
        estado_saude: '',
        localizacao: '',
        altura: '',
        diametro: '',
        area_verde_id: '',
        visibilidade: 'publica'
    });

    const [showLocationModal, setShowLocationModal] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [loadingDeleteId, setLoadingDeleteId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportTreeId, setReportTreeId] = useState(null);
    const [reportText, setReportText] = useState('');
    const [timelineTree, setTimelineTree] = useState(null);

    const user = JSON.parse(localStorage.getItem("@Auth:user"));
    const locationEditRef = useRef(null);

    useEffect(() => {
        fetchTrees();
        fetchAreas();
    }, []);

    const fetchTrees = async () => {
        try {
            const response = await api.get("/trees");
            const data = Array.isArray(response.data) ? response.data : response.data.trees || [];
            setTrees(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Erro ao buscar árvores:", error);
            setTrees([]);
        }
    };

    const fetchAreas = async () => {
        try {
            // Usa o user que já está declarado no componente
            const response = await api.get(`/areas?userId=${user.id}`);
            setAreas(response.data);
        } catch (error) {
            console.error("Erro ao buscar áreas:", error);
        }
    };

    // --- LÓGICA DE FILTRAGEM (ATUALIZADA) ---
    const filteredTrees = trees.filter(tree => {

        // 1. Filtro de MODO DE VISUALIZAÇÃO
        let matchesViewMode = false;

        if (viewMode === 'mine') {
            // Mostra APENAS o que eu criei (independente de ser público ou privado)
            matchesViewMode = tree.usuario_id === user.id;
        } else {
            // Comunidade: Mostra TUDO que é público (meu ou dos outros)
            // Se visibilidade for null/undefined, assumimos 'publica' por compatibilidade
            const isPublic = tree.visibilidade === 'publica' || !tree.visibilidade;
            matchesViewMode = isPublic;
        }

        if (!matchesViewMode) return false; // Se não passar aqui, nem olha o resto

        // 2. Filtros de Texto/Select
        const matchesSearch =
            tree.nome_cientifico.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (tree.nome_popular && tree.nome_popular.toLowerCase().includes(searchTerm.toLowerCase())) ||
            tree.id.toString().includes(searchTerm);

        const matchesStatus = statusFilter ? tree.estado_saude === statusFilter : true;
        const matchesArea = areaFilter ? tree.area_verde_id?.toString() === areaFilter : true;

        return matchesSearch && matchesStatus && matchesArea;
    });

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('');
        setAreaFilter('');
    };

    // --- HANDLERS ---

    const handleOpenTimeline = (tree) => {
        setTimelineTree(tree);
    };

    const handleReportClick = (treeId) => {
        setReportTreeId(treeId);
        setShowReportModal(true);
    };

    const handleCloseReportModal = () => {
        setShowReportModal(false);
        setReportText('');
    };

    const handleLocationPicked = (data) => {
        setCurrentTree(prev => ({
            ...prev,
            localizacao: `${data.addressText} (Lat: ${data.lat.toFixed(6)}, Lng: ${data.lng.toFixed(6)})`,
            latitude: data.lat,
            longitude: data.lng
        }));
        setShowMapPicker(false);
        toast.success("Localização atualizada pelo mapa!");
    };

    const handleSendReport = async () => {
        if (reportText.trim() === '') return alert('Descreva o problema antes de enviar.');
        setLoading(true);

        const templateParams = {
            from_name: user.nome,
            email: user.email,
            user_id: user.id,
            tree_id: reportTreeId,
            problem_description: reportText
        };

        emailjs.send("service_vk5hd8d", "template_qviar4b", templateParams, "0EZ5fZfY7LfCvIBry")
            .then(() => {
                setLoading(false);
                alert("Problema reportado com sucesso!");
                handleCloseReportModal();
            })
            .catch((err) => {
                console.log("ERRO:", err);
                setLoading(false);
                alert("Erro ao enviar o problema.");
            });
    };

    const handleEditClick = (tree) => {
        const formattedDate = tree.data_plantio ? new Date(tree.data_plantio).toISOString().split('T')[0] : '';
        setEditing(true);
        setCurrentTree({
            id: tree.id,
            nome_registrante: tree.nome_registrante,
            nome_cientifico: tree.nome_cientifico,
            nome_popular: tree.nome_popular || '',
            data_plantio: formattedDate,
            estado_saude: tree.estado_saude,
            localizacao: tree.localizacao,
            altura: tree.altura || '',
            diametro: tree.diametro || '',
            area_verde_id: tree.area_verde_id || '',
            visibilidade: tree.visibilidade || 'publica',
            latitude: tree.latitude,
            longitude: tree.longitude
        });
    };

    const handleDeleteTree = async (id) => {
        if (!window.confirm("Deseja realmente excluir esta árvore?")) return;
        try {
            setLoadingDeleteId(id);
            await api.delete(`/trees/${id}`);
            fetchTrees();
            toast.success("Árvore excluída com sucesso!");
        } catch (error) {
            console.error('Erro ao excluir', error);
            toast.error("Erro ao excluir a árvore. Tente novamente.");
        } finally {
            setLoadingDeleteId(null);
        }
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) return toast.error("GPS não suportado.");

        const toastId = toast.loading("Buscando localização...");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // Preenche o texto visual E salva os números ocultos
                const locText = `Lat: ${latitude.toFixed(6)}, Long: ${longitude.toFixed(6)}`;

                setCurrentTree(prev => ({
                    ...prev,
                    localizacao: locText,
                    latitude: latitude,
                    longitude: longitude
                }));

                toast.update(toastId, { render: "Localização atualizada!", type: "success", isLoading: false, autoClose: 2000 });
            },
            (error) => {
                console.error(error);
                toast.update(toastId, { render: "Erro ao obter GPS.", type: "error", isLoading: false, autoClose: 3000 });
            },
            { enableHighAccuracy: true }
        );
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCurrentTree(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        const today = new Date();
        const selectedDate = new Date(currentTree.data_plantio);

        if (isAfter(selectedDate, today)) {
            return toast.warning("A data de plantio não pode estar no futuro.");
        }

        const payload = {
            usuName: currentTree.nome_registrante,
            treeName: currentTree.nome_cientifico,
            popularName: currentTree.nome_popular || "",
            plantingDate: currentTree.data_plantio,
            lifecondition: currentTree.estado_saude,
            location: currentTree.localizacao,
            altura: currentTree.altura || null,
            diametro: currentTree.diametro || null,
            areaVerdeId: currentTree.area_verde_id || null,
            visibilidade: currentTree.visibilidade,
            usuario_id: user.id,
            latitude: currentTree.latitude,
            longitude: currentTree.longitude
        };

        try {
            await api.put(`/trees/${currentTree.id}`, payload);
            setEditing(false);
            fetchTrees();
            toast.success("Árvore atualizada com sucesso!");
        } catch (error) {
            console.error("Erro ao atualizar:", error);
            const msg = error.response?.data?.msg || "Erro ao atualizar árvore.";
            toast.error(msg);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "—";
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    };

    const getStatusClass = (status) => {
        if (!status) return '';
        return status.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
    };

    return (
        <div className="monitoring-container">
            <header className="monitoring-header">
                <div className="header-text">
                    <h1>Monitoramento de Árvores</h1>
                    <p>Gerencie a saúde e localização de cada exemplar cadastrado</p>
                </div>
                <button className="btn-view-map" onClick={() => navigate('/map')}>
                    <FaMap /> Ver Mapa Global
                </button>
            </header>

            {/* --- ABAS DE NAVEGAÇÃO (NOVO) --- */}
            <div className="view-tabs-container">
                <div className="view-tabs">
                    <button
                        className={`view-tab ${viewMode === 'mine' ? 'active' : ''}`}
                        onClick={() => { setViewMode('mine'); clearFilters(); }}
                    >
                        <FaUser /> Meus Registros
                    </button>
                    <button
                        className={`view-tab ${viewMode === 'community' ? 'active' : ''}`}
                        onClick={() => { setViewMode('community'); clearFilters(); }}
                    >
                        <FaGlobeAmericas /> Explorar Comunidade
                    </button>
                </div>
            </div>

            {/* --- BARRA DE FILTROS --- */}
            <div className="filter-bar">
                <div className="filter-group search-group">
                    <FaSearch className="filter-icon" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, ID ou popular..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <FaHeartbeat className="filter-icon" />
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="">Todos os Status</option>
                        <option value="Saudável">Saudável</option>
                        <option value="Doente">Doente</option>
                        <option value="Morrendo">Morrendo</option>
                    </select>
                </div>

                <div className="filter-group">
                    <FaGlobeAmericas className="filter-icon" />
                    <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
                        <option value="">Todas as Áreas</option>
                        {areas.map(area => (
                            <option key={area.id} value={area.id}>{area.nome_area || area.nome}</option>
                        ))}
                    </select>
                </div>

                <button className="btn-clear-filters" onClick={clearFilters} title="Limpar Filtros">
                    <FaUndo />
                </button>
            </div>

            {/* --- GRID --- */}
            <div className="monitoring-grid">
                {filteredTrees.length === 0 ? (
                    <div className="no-items">
                        <FaTree size={40} style={{ marginBottom: 15, opacity: 0.5 }} />
                        <p>
                            {viewMode === 'mine'
                                ? "Você ainda não tem registros com esses filtros."
                                : "Nenhuma árvore pública encontrada com esses filtros."}
                        </p>
                        <button className="btn-link" onClick={clearFilters}>Limpar filtros</button>
                    </div>
                ) : (
                    filteredTrees.map(tree => (
                        <div key={tree.id} className="tree-card">
                            <div className="tree-card-header">
                                <div className="header-content">
                                    <span className="tree-id">#{tree.id}</span>
                                    <h3 title={tree.nome_cientifico}>{tree.nome_cientifico}</h3>
                                </div>
                                <span className={`status-badge status-${getStatusClass(tree.estado_saude)}`}>
                                    {tree.estado_saude}
                                </span>
                            </div>

                            <div className="tree-card-body">
                                {tree.nome_popular && (
                                    <div className="tree-info highlight-info">
                                        <FaLeaf className="icon-main" />
                                        <strong>{tree.nome_popular}</strong>
                                    </div>
                                )}

                                <div className="specs-box">
                                    <div className="spec-item">
                                        <FaRulerVertical /> <span>Alt: {tree.altura ? `${tree.altura}m` : "—"}</span>
                                    </div>
                                    <div className="divider-vertical"></div>
                                    <div className="spec-item">
                                        <FaExpand /> <span>Diâm: {tree.diametro ? `${tree.diametro}cm` : "—"}</span>
                                    </div>
                                </div>

                                <div className="tree-info">
                                    <FaCalendarAlt />
                                    <span><strong>Plantio:</strong> {formatDate(tree.data_plantio)}</span>
                                </div>

                                <div className="tree-info">
                                    <FaGlobeAmericas />
                                    <span><strong>Área:</strong> {tree.nome_area || "Não vinculada"}</span>
                                </div>

                                <div className="tree-info location-row" onClick={() => {
                                    if (tree.localizacao?.length > 25) {
                                        setSelectedLocation(tree.localizacao);
                                        setShowLocationModal(true);
                                    }
                                }}>
                                    <FaMapMarkerAlt />
                                    <span className="truncate-text" title={tree.localizacao}>
                                        {tree.localizacao}
                                    </span>
                                    {tree.localizacao?.length > 25 && <FaSearch className="search-icon-small" />}
                                </div>

                                <div className="tree-meta">
                                    <FaUser /> <span><strong>Registrado por:</strong> {tree.nome_registrante}</span>

                                    {/* Indicador de Privacidade (Só aparece nas minhas árvores) */}
                                    {tree.usuario_id === user.id && (
                                        <span
                                            title={tree.visibilidade === 'privada' ? "Visível apenas para você" : "Visível para a comunidade"}
                                            style={{ marginLeft: 'auto', color: tree.visibilidade === 'privada' ? '#f59e0b' : 'var(--primary)' }}
                                        >
                                            {tree.visibilidade === 'privada' ? <FaLock /> : <FaGlobeAmericas />}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="tree-card-footer">
                                {(tree.usuario_id === user.id || user.id === 1) ? (
                                    <>
                                        <button className="btn-action btn-delete" onClick={() => handleDeleteTree(tree.id)} disabled={loadingDeleteId === tree.id}>
                                            {loadingDeleteId === tree.id ? "Excluindo..." : "Excluir"}
                                        </button>
                                        <button className="btn-action btn-edit" onClick={() => handleEditClick(tree)}>Editar</button>
                                        <button className="btn-action btn-timeline" onClick={() => handleOpenTimeline(tree)} title="Abrir Diário">
                                            <FaCamera />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="readonly-badge" title="Somente Leitura">
                                            <FaLock />
                                        </div>
                                        <button className="btn-action btn-report" onClick={() => handleReportClick(tree.id)}>
                                            <FaExclamationTriangle style={{ marginRight: 5 }} /> Reportar
                                        </button>
                                        <button className="btn-action btn-timeline" onClick={() => handleOpenTimeline(tree)} title="Ver Diário">
                                            <FaCamera />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {timelineTree && (
                <div className="modal-overlay">
                    <div className="modal-content modal-timeline">
                        <header className="modal-header">
                            <div>
                                <h2>Diário de Crescimento 🌳</h2>
                                <p style={{ fontSize: '0.9rem', color: '#666' }}>
                                    Acompanhando: <strong>{timelineTree.nome_cientifico}</strong>
                                </p>
                            </div>
                            <button className="modal-close" onClick={() => setTimelineTree(null)}>
                                <FaTimes />
                            </button>
                        </header>
                        <div className="modal-body-scroll">
                            <TreeTimeline
                                treeId={timelineTree.id}
                                treeOwnerId={timelineTree.usuario_id}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL DE EDIÇÃO --- */}
            {editing && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <header className="modal-header">
                            <h2>Editar Árvore</h2>
                            <button className="modal-close" onClick={() => setEditing(false)}><FaTimes /></button>
                        </header>
                        <form className="tree-form" onSubmit={handleUpdateSubmit}>

                            <div className="visibility-group">
                                <label className="section-label">Privacidade do Registro</label>
                                <div className="visibility-options">
                                    <div
                                        className={`vis-option ${currentTree.visibilidade === 'publica' ? 'selected' : ''}`}
                                        onClick={() => setCurrentTree(prev => ({ ...prev, visibilidade: 'publica' }))}
                                    >
                                        <FaGlobeAmericas /> Público
                                    </div>
                                    <div
                                        className={`vis-option ${currentTree.visibilidade === 'privada' ? 'selected' : ''}`}
                                        onClick={() => setCurrentTree(prev => ({ ...prev, visibilidade: 'privada' }))}
                                    >
                                        <FaLock /> Privado
                                    </div>
                                </div>
                                <small className="vis-hint">
                                    {currentTree.visibilidade === 'publica'
                                        ? "Visível para todos no mapa da comunidade."
                                        : "Visível apenas para você."}
                                </small>
                            </div>

                            <div className="form-group">
                                <label>Registrado por</label>
                                <div className="input-wrapper disabled">
                                    <FaUser className="input-icon" />
                                    <input value={currentTree.nome_registrante} readOnly />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Nome Científico</label>
                                    <div className="input-wrapper">
                                        <FaTree className="input-icon" />
                                        <input name="nome_cientifico" value={currentTree.nome_cientifico} onChange={handleInputChange} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Nome Popular</label>
                                    <div className="input-wrapper">
                                        <FaLeaf className="input-icon" />
                                        <input name="nome_popular" value={currentTree.nome_popular} onChange={handleInputChange} />
                                    </div>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Data Plantio</label>
                                    <div className="input-wrapper">
                                        <FaCalendarAlt className="input-icon" />
                                        <input type="date" name="data_plantio" value={currentTree.data_plantio} onChange={handleInputChange} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Saúde</label>
                                    <div className="input-wrapper">
                                        <FaHeartbeat className="input-icon" />
                                        <select name="estado_saude" value={currentTree.estado_saude} onChange={handleInputChange}>
                                            <option value="Saudável">Saudável</option>
                                            <option value="Doente">Doente</option>
                                            <option value="Morrendo">Morrendo</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Altura (m)</label>
                                    <div className="input-wrapper">
                                        <FaRulerVertical className="input-icon" />
                                        <input type="number" step="0.01" name="altura" value={currentTree.altura} onChange={handleInputChange} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Diâmetro (cm)</label>
                                    <div className="input-wrapper">
                                        <FaExpand className="input-icon" />
                                        <input type="number" step="0.01" name="diametro" value={currentTree.diametro} onChange={handleInputChange} />
                                    </div>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Área Verde</label>
                                <div className="input-wrapper">
                                    <FaGlobeAmericas className="input-icon" />
                                    <select name="area_verde_id" value={currentTree.area_verde_id || ""} onChange={handleInputChange}>
                                        <option value="">Selecione uma área</option>
                                        {areas.map((area) => (
                                            <option key={area.id} value={area.id}>{area.nome_area || area.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Localização</label>
                                <div className="input-wrapper">
                                    <FaMapMarkerAlt className="input-icon icon-top" />
                                    <textarea
                                        name="localizacao"
                                        className="input-with-actions" /* <--- CLASSE NOVA */
                                        value={currentTree.localizacao}
                                        onChange={handleInputChange}
                                        rows={2}
                                    />

                                    {/* BOTÃO GPS */}
                                    <button
                                        type="button"
                                        onClick={handleGetLocation}
                                        className="btn-input-action btn-action-gps" /* <--- CLASSE NOVA */
                                        title="Atualizar com minha localização atual"
                                    >
                                        <FaMapMarkerAlt size={12} />
                                    </button>

                                    {/* BOTÃO MAPA */}
                                    <button
                                        type="button"
                                        onClick={() => setShowMapPicker(true)}
                                        className="btn-input-action btn-action-map" /* <--- CLASSE NOVA */
                                        title="Escolher no Mapa"
                                    >
                                        <FaMap size={12} />
                                    </button>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="submit" className="btn-confirm full-width">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Outros modais */}
            {showReportModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <header className="modal-header">
                            <h2>Reportar Problema</h2>
                            <button className="modal-close" onClick={handleCloseReportModal}><FaTimes /></button>
                        </header>
                        <div className="form-group" style={{ padding: '20px' }}>
                            <textarea
                                className="full-textarea"
                                value={reportText}
                                onChange={(e) => setReportText(e.target.value)}
                                placeholder="Descreva o problema..."
                                rows={4}
                            />
                            <button className="btn-confirm full-width" onClick={handleSendReport} disabled={loading} style={{ marginTop: '15px' }}>
                                {loading ? "Enviando..." : "Enviar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showLocationModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <header className="modal-header">
                            <h2>Localização</h2>
                            <button className="modal-close" onClick={() => setShowLocationModal(false)}><FaTimes /></button>
                        </header>
                        <div style={{ padding: '20px' }}>
                            <p style={{ wordBreak: 'break-all' }}>{selectedLocation}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* --- RENDERIZAÇÃO DO SELETOR DE MAPA --- */}
            {showMapPicker && (
                <LocationPicker
                    onClose={() => setShowMapPicker(false)}
                    onConfirm={handleLocationPicked}
                    // Passamos as coordenadas atuais da árvore para o mapa abrir focado nela
                    initialPosition={
                        currentTree.latitude && currentTree.longitude
                            ? { lat: Number(currentTree.latitude), lng: Number(currentTree.longitude) }
                            : null // Se não tiver, abre no padrão
                    }
                />
            )}
        </div>
    );
};

export default Monitoring;