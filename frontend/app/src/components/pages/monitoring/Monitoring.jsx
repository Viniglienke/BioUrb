import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Monitoring.css';
import {
    FaLock, FaUser, FaTree, FaCalendarAlt, FaMapMarkerAlt,
    FaSearch, FaGlobeAmericas, FaTimes, FaLeaf,
    FaExclamationTriangle, FaHeartbeat, FaClock,
    FaFilter, FaUndo, FaCamera, FaListUl, FaMap,
    FaUsers
} from "react-icons/fa";
import emailjs from '@emailjs/browser';
import { isAfter, differenceInYears, differenceInMonths, differenceInDays, parseISO } from 'date-fns';
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

    // --- ESTADO DE VISUALIZAÇÃO ---
    const [viewMode, setViewMode] = useState('mine');

    // --- ESTADOS DOS FILTROS ---
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [areaFilter, setAreaFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    const [currentTree, setCurrentTree] = useState({
        id: null,
        nome_registrante: '',
        nome_cientifico: '',
        nome_popular: '',
        data_plantio: '',
        estado_saude: '',
        localizacao: '',
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
            const response = await api.get(`/areas?userId=${user.id}`);
            setAreas(response.data);
        } catch (error) {
            console.error("Erro ao buscar áreas:", error);
        }
    };

    // --- FUNÇÃO PARA CALCULAR A IDADE ---
    const calculateAge = (dateString) => {
        if (!dateString) return "Idade desconhecida";
        const plantDate = new Date(dateString);
        const userTimezoneOffset = plantDate.getTimezoneOffset() * 60000;
        const adjustedDate = new Date(plantDate.getTime() + userTimezoneOffset);
        const today = new Date();

        if (isAfter(adjustedDate, today)) return "Ainda não plantada";

        const years = differenceInYears(today, adjustedDate);
        const months = differenceInMonths(today, adjustedDate) % 12;
        const days = differenceInDays(today, adjustedDate);

        if (years > 0) {
            return `${years} ano(s)${months > 0 ? ` e ${months} mês(es)` : ''}`;
        } else if (months > 0) {
            return `${months} mês(es)`;
        } else if (days === 0) {
            return "Plantada hoje";
        } else {
            return `${days} dia(s)`;
        }
    };

    // --- FUNÇÃO PARA LIMPAR O TEXTO DA LOCALIZAÇÃO ---
    const formatLocationText = (text) => {
        if (!text) return "Não informada";
        return text
            .replace("Clique no mapa ou use o GPS", "")
            .replace("Localização personalizada", "")
            .replace(/[()]/g, "") // Remove os parênteses que sobram
            .trim(); // Remove espaços em branco nas pontas
    };

    // --- LÓGICA DE FILTRAGEM ---
    const filteredTrees = trees.filter(tree => {
        let matchesViewMode = false;

        if (viewMode === 'mine') {
            matchesViewMode = tree.usuario_id === user.id;
        } else {
            // Mostra apenas Públicas e Comunidade na aba de Explorar
            matchesViewMode = tree.visibilidade === 'publica' || tree.visibilidade === 'comunidade';
        }

        if (!matchesViewMode) return false;

        const matchesSearch =
            tree.nome_cientifico.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (tree.nome_popular && tree.nome_popular.toLowerCase().includes(searchTerm.toLowerCase())) ||
            tree.id.toString().includes(searchTerm);

        const matchesStatus = statusFilter ? tree.estado_saude === statusFilter : true;
        const matchesArea = areaFilter ? tree.area_verde_id?.toString() === areaFilter : true;
        const matchesType = typeFilter ? tree.visibilidade === typeFilter : true;

        return matchesSearch && matchesStatus && matchesArea && matchesType;
    });

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('');
        setAreaFilter('');
        setTypeFilter('');
    };

    // --- HANDLERS ---
    const handleOpenTimeline = (tree) => setTimelineTree(tree);

    const handleReportClick = (treeId) => {
        setReportTreeId(treeId);
        setShowReportModal(true);
    };

    const handleCloseReportModal = () => {
        setShowReportModal(false);
        setReportText('');
    };

    const handleLocationPicked = (data) => {
        // Se vier com o nome genérico, ignora e usa só Lat/Lng. Se vier nome de rua, mantém a rua + Lat/Lng
        let cleanAddress = data.addressText;
        if (!cleanAddress || cleanAddress.includes("Localização") || cleanAddress.includes("Clique")) {
            cleanAddress = "";
        }

        const locText = cleanAddress
            ? `${cleanAddress} - Lat: ${data.lat.toFixed(5)}, Lng: ${data.lng.toFixed(5)}`
            : `Lat: ${data.lat.toFixed(5)}, Lng: ${data.lng.toFixed(5)}`;

        setCurrentTree(prev => ({
            ...prev,
            localizacao: locText,
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
            from_name: user.nome, email: user.email, user_id: user.id,
            tree_id: reportTreeId, problem_description: reportText
        };

        emailjs.send("service_vk5hd8d", "template_qviar4b", templateParams, "0EZ5fZfY7LfCvIBry")
            .then(() => {
                setLoading(false); alert("Problema reportado com sucesso!"); handleCloseReportModal();
            })
            .catch((err) => {
                console.log("ERRO:", err); setLoading(false); alert("Erro ao enviar o problema.");
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
            area_verde_id: tree.area_verde_id || '',
            visibilidade: tree.visibilidade || 'publica',
            latitude: tree.latitude,
            longitude: tree.longitude
        });
    };

    const handleDeleteTree = async (id) => {
        if (!window.confirm("Deseja realmente excluir esta árvore? (As fotos do diário também serão apagadas)")) return;
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
                // Deixa o texto limpo desde o início
                const locText = `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`;

                setCurrentTree(prev => ({ ...prev, localizacao: locText, latitude: latitude, longitude: longitude }));
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
        const adjustedDate = new Date(selectedDate.getTime() + selectedDate.getTimezoneOffset() * 60000);

        if (isAfter(adjustedDate, today)) {
            return toast.warning("A data de plantio não pode estar no futuro.");
        }

        const payload = {
            usuName: currentTree.nome_registrante,
            treeName: currentTree.nome_cientifico,
            popularName: currentTree.nome_popular || "",
            plantingDate: currentTree.data_plantio,
            lifecondition: currentTree.estado_saude,
            location: currentTree.localizacao,
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

            <div className="view-tabs-container">
                <div className="view-tabs">
                    <button className={`view-tab ${viewMode === 'mine' ? 'active' : ''}`} onClick={() => { setViewMode('mine'); clearFilters(); }}><FaUser /> Meus Registros</button>
                    <button className={`view-tab ${viewMode === 'community' ? 'active' : ''}`} onClick={() => { setViewMode('community'); clearFilters(); }}><FaGlobeAmericas /> Explorar Comunidade</button>
                </div>
            </div>

            <div className="filter-bar">
                <div className="filter-group search-group">
                    <FaSearch className="filter-icon" />
                    <input type="text" placeholder="Buscar por nome ou ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                        {areas.map(area => <option key={area.id} value={area.id}>{area.nome_area || area.nome}</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <FaFilter className="filter-icon" />
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                        <option value="">Todos os Tipos</option>
                        <option value="comunidade">Apenas Comunidade</option>
                        <option value="publica">Apenas Públicas</option>
                        {viewMode === 'mine' && <option value="privada">Apenas Privadas</option>}
                    </select>
                </div>
                <button className="btn-clear-filters" onClick={clearFilters} title="Limpar Filtros"><FaUndo /></button>
            </div>

            <div className="monitoring-grid">
                {filteredTrees.length === 0 ? (
                    <div className="no-items">
                        <FaTree size={40} style={{ marginBottom: 15, opacity: 0.5 }} />
                        <p>{viewMode === 'mine' ? "Você ainda não tem registros com esses filtros." : "Nenhuma árvore pública encontrada com esses filtros."}</p>
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
                                <span className={`status-badge status-${getStatusClass(tree.estado_saude)}`}>{tree.estado_saude}</span>
                            </div>

                            <div className="tree-card-body">
                                {tree.nome_popular && (
                                    <div className="tree-info highlight-info">
                                        <FaLeaf className="icon-main" /> <strong>{tree.nome_popular}</strong>
                                    </div>
                                )}

                                <div className="specs-box" style={{ justifyContent: 'center', backgroundColor: 'var(--bg-soft)', border: '1px dashed var(--primary)' }}>
                                    <div className="spec-item" style={{ color: 'var(--primary)' }}>
                                        <FaClock size={16} />
                                        <strong style={{ color: 'var(--text-main)' }}>Idade:</strong>
                                        <span style={{ color: 'var(--text-main)' }}>{calculateAge(tree.data_plantio)}</span>
                                    </div>
                                </div>

                                <div className="tree-info">
                                    <FaCalendarAlt /> <span><strong>Plantio:</strong> {formatDate(tree.data_plantio)}</span>
                                </div>

                                <div className="tree-info">
                                    <FaGlobeAmericas /> <span><strong>Área:</strong> {tree.nome_area || "Não vinculada"}</span>
                                </div>

                                <div className="tree-info location-row" onClick={() => {
                                    if (tree.localizacao?.length > 25) { setSelectedLocation(tree.localizacao); setShowLocationModal(true); }
                                }}>
                                    <FaMapMarkerAlt />
                                    <span className="truncate-text" title={formatLocationText(tree.localizacao)}>{formatLocationText(tree.localizacao)}</span>
                                    {tree.localizacao?.length > 25 && <FaSearch className="search-icon-small" />}
                                </div>

                                <div className="tree-meta">
                                    <FaUser /> <span><strong>Por:</strong> {tree.nome_registrante}</span>

                                    {/* --- LÓGICA DE ÍCONE DINÂMICO E CORES CORRIGIDA --- */}
                                    <span
                                        style={{
                                            marginLeft: 'auto',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            fontSize: '0.75rem',
                                            fontWeight: '700',
                                            textTransform: 'uppercase',
                                            color: tree.visibilidade === 'privada' ? '#f59e0b' :
                                                tree.visibilidade === 'comunidade' ? '#2196f3' : 'var(--primary)'
                                        }}
                                        title={`Esta árvore é ${tree.visibilidade}`}
                                    >
                                        {tree.visibilidade === 'privada' && <FaLock />}
                                        {tree.visibilidade === 'publica' && <FaGlobeAmericas />}
                                        {tree.visibilidade === 'comunidade' && <FaUsers />}

                                        {tree.visibilidade}
                                    </span>
                                </div>
                            </div>

                            <div className="tree-card-footer">
                                {(tree.usuario_id === user.id || user.id === 1) ? (
                                    <>
                                        <button className="btn-action btn-delete" onClick={() => handleDeleteTree(tree.id)} disabled={loadingDeleteId === tree.id}>{loadingDeleteId === tree.id ? "Excluindo..." : "Excluir"}</button>
                                        <button className="btn-action btn-edit" onClick={() => handleEditClick(tree)}>Editar</button>
                                        <button className="btn-action btn-timeline" onClick={() => handleOpenTimeline(tree)} title="Abrir Diário"><FaCamera /></button>
                                    </>
                                ) : (
                                    <>
                                        <div className="readonly-badge" title="Somente Leitura"><FaLock /></div>
                                        <button className="btn-action btn-report" onClick={() => handleReportClick(tree.id)}><FaExclamationTriangle style={{ marginRight: 5 }} /> Reportar</button>
                                        <button className="btn-action btn-timeline" onClick={() => handleOpenTimeline(tree)} title="Ver Diário"><FaCamera /></button>
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
                                <p style={{ fontSize: '0.9rem', color: '#666' }}>Acompanhando: <strong>{timelineTree.nome_cientifico}</strong></p>
                            </div>
                            <button className="modal-close" onClick={() => setTimelineTree(null)}><FaTimes /></button>
                        </header>
                        <div className="modal-body-scroll">
                            <TreeTimeline
                                treeId={timelineTree.id}
                                treeOwnerId={timelineTree.usuario_id}
                                treeLat={timelineTree.latitude}
                                treeLng={timelineTree.longitude}
                                treeVisibility={timelineTree.visibilidade}
                            />
                        </div>
                    </div>
                </div>
            )}

            {editing && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <header className="modal-header">
                            <h2>Editar Árvore</h2>
                            <button className="modal-close" onClick={() => setEditing(false)}><FaTimes /></button>
                        </header>
                        <form className="tree-form" onSubmit={handleUpdateSubmit}>

                            <div className="visibility-group">
                                <label className="section-label">Tipo de Registro</label>
                                <div className="visibility-options" style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                    <div className={`vis-option vis-privada ${currentTree.visibilidade === 'privada' ? 'selected' : ''}`} onClick={() => setCurrentTree(prev => ({ ...prev, visibilidade: 'privada' }))} style={{ flex: 1, minWidth: '100px', fontSize: '0.85rem' }}>
                                        <FaLock /> Privada
                                    </div>
                                    <div className={`vis-option vis-publica ${currentTree.visibilidade === 'publica' ? 'selected' : ''}`} onClick={() => setCurrentTree(prev => ({ ...prev, visibilidade: 'publica' }))} style={{ flex: 1, minWidth: '100px', fontSize: '0.85rem' }}>
                                        <FaGlobeAmericas /> Pública
                                    </div>
                                    <div className={`vis-option vis-comunidade ${currentTree.visibilidade === 'comunidade' ? 'selected' : ''}`} onClick={() => setCurrentTree(prev => ({ ...prev, visibilidade: 'comunidade' }))} style={{ flex: 1, minWidth: '100px', fontSize: '0.85rem' }}>
                                        <FaUsers /> Comunidade
                                    </div>
                                </div>
                                <small className="vis-hint" style={{ display: 'block', marginTop: '10px', height: '30px' }}>
                                    {currentTree.visibilidade === 'privada' && "Apenas você pode ver e gerenciar esta árvore."}
                                    {currentTree.visibilidade === 'publica' && "Todos veem no mapa, mas só você adiciona registros."}
                                    {currentTree.visibilidade === 'comunidade' && "Aberta a todos. Qualquer pessoa que visitar o local poderá adicionar registros."}
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
                                    <div className="input-wrapper"><FaTree className="input-icon" /><input name="nome_cientifico" value={currentTree.nome_cientifico} onChange={handleInputChange} /></div>
                                </div>
                                <div className="form-group">
                                    <label>Nome Popular</label>
                                    <div className="input-wrapper"><FaLeaf className="input-icon" /><input name="nome_popular" value={currentTree.nome_popular} onChange={handleInputChange} /></div>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Data Plantio</label>
                                    <div className="input-wrapper"><FaCalendarAlt className="input-icon" /><input type="date" name="data_plantio" value={currentTree.data_plantio} onChange={handleInputChange} /></div>
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

                            <div className="form-group">
                                <label>Área Verde</label>
                                <div className="input-wrapper">
                                    <FaGlobeAmericas className="input-icon" />
                                    <select name="area_verde_id" value={currentTree.area_verde_id || ""} onChange={handleInputChange}>
                                        <option value="">Selecione uma área</option>
                                        {areas.map((area) => <option key={area.id} value={area.id}>{area.nome_area || area.nome}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Localização</label>
                                <div className="input-wrapper">
                                    <FaMapMarkerAlt className="input-icon icon-top" />
                                    <textarea name="localizacao" className="input-with-actions" value={currentTree.localizacao} onChange={handleInputChange} rows={2} />
                                    <button type="button" onClick={handleGetLocation} className="btn-input-action btn-action-gps" title="Atualizar com minha localização atual"><FaMapMarkerAlt size={12} /></button>
                                    <button type="button" onClick={() => setShowMapPicker(true)} className="btn-input-action btn-action-map" title="Escolher no Mapa"><FaMap size={12} /></button>
                                </div>
                            </div>

                            <div className="modal-actions"><button type="submit" className="btn-confirm full-width">Salvar</button></div>
                        </form>
                    </div>
                </div>
            )}

            {showReportModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <header className="modal-header">
                            <h2>Reportar Problema</h2>
                            <button className="modal-close" onClick={handleCloseReportModal}><FaTimes /></button>
                        </header>
                        <div className="form-group" style={{ padding: '20px' }}>
                            <textarea className="full-textarea" value={reportText} onChange={(e) => setReportText(e.target.value)} placeholder="Descreva o problema..." rows={4} />
                            <button className="btn-confirm full-width" onClick={handleSendReport} disabled={loading} style={{ marginTop: '15px' }}>{loading ? "Enviando..." : "Enviar"}</button>
                        </div>
                    </div>
                </div>
            )}

            {showLocationModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <header className="modal-header"><h2>Localização</h2><button className="modal-close" onClick={() => setShowLocationModal(false)}><FaTimes /></button></header>
                        <div style={{ padding: '20px' }}><p style={{ wordBreak: 'break-all' }}>{formatLocationText(selectedLocation)}</p></div>
                    </div>
                </div>
            )}

            {showMapPicker && (
                <div style={{ position: 'relative', zIndex: 99999 }}>
                    <LocationPicker
                        onClose={() => setShowMapPicker(false)}
                        onConfirm={handleLocationPicked}
                        initialPosition={currentTree.latitude && currentTree.longitude ? { lat: Number(currentTree.latitude), lng: Number(currentTree.longitude) } : null}
                    />
                </div>
            )}
        </div>
    );
};

export default Monitoring;