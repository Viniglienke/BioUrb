import React, { useEffect, useState, useContext } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../../../services/api';
import { AuthContext } from '../../../context/AuthContext';
import {
    FaArrowLeft, FaCrosshairs, FaTimes, FaFilter,
    FaUser, FaGlobeAmericas, FaClock, FaHeartbeat,
    FaCalendarAlt, FaLock, FaUsers
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import TreeTimeline from "../../../components/treetimeline/TreeTimeline";
import { differenceInYears, differenceInMonths, differenceInDays, isAfter } from 'date-fns';
import './MapPage.css';

// --- ÍCONES ---
const createModernPin = (color) => {
    const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="40" height="48">
      <filter id="sh" x="0" y="0" width="200%" height="200%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" flood-opacity="0.3"/>
      </filter>
      <path d="M50 0 C22 0 0 22 0 50 C0 85 50 120 50 120 C50 120 100 85 100 50 C100 22 78 0 50 0Z" 
            fill="${color}" filter="url(#sh)"/>
      <g transform="translate(50, 48)">
          <rect x="-6" y="24" width="12" height="15" fill="white" />
          <polygon points="0,-25 22,5 -22,5" fill="white" />
          <polygon points="0,-10 26,20 -26,20" fill="white" />
          <polygon points="0,5 28,30 -28,30" fill="white" />
      </g>
    </svg>
    `;

    return new L.DivIcon({
        className: 'custom-pin-container',
        html: svgString,
        iconSize: [40, 48],
        iconAnchor: [20, 48],
        popupAnchor: [0, -45]
    });
};

const createUserIcon = () => {
    return new L.DivIcon({
        className: 'user-location-marker',
        html: `
            <div style="width: 16px; height: 16px; background: #2196f3; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 0 4px rgba(33, 150, 243, 0.4);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
};

const iconHealthy = createModernPin('#2e7d32');
const iconSick = createModernPin('#f97316');
const iconDead = createModernPin('#ef4444');
const iconUser = createUserIcon();
const iconArea = createModernPin('#8b5cf6');

// --- BOTÃO GPS ---
const LocationButton = ({ userLocation, setUserLocation }) => {
    const map = useMap();
    const [loadingLoc, setLoadingLoc] = useState(false);

    const handleLocate = () => {
        setLoadingLoc(true);
        if (!navigator.geolocation) {
            alert("Sem GPS."); setLoadingLoc(false); return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const newLoc = [pos.coords.latitude, pos.coords.longitude];
                setUserLocation(newLoc);
                map.flyTo(newLoc, 16, { duration: 1.5 });
                setLoadingLoc(false);
            },
            () => { alert("Erro ao localizar."); setLoadingLoc(false); },
            { enableHighAccuracy: true }
        );
    };

    return (
        <button className="locate-btn" onClick={handleLocate} title="Minha Localização" disabled={loadingLoc}>
            {loadingLoc ? "..." : <FaCrosshairs />}
        </button>
    );
};

// --- COMPONENTE PRINCIPAL ---
const MapPage = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [trees, setTrees] = useState([]);
    const [areas, setAreas] = useState([]);
    const [userLocation, setUserLocation] = useState(null);

    // Estados do Modal
    const [selectedTree, setSelectedTree] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // --- ESTADOS DOS FILTROS SIMPLIFICADOS ---
    const [showFilters, setShowFilters] = useState(false);
    const [mapFilter, setMapFilter] = useState('all'); // 'all', 'community', 'mine'
    const [statusFilter, setStatusFilter] = useState('');

    const defaultCenter = [-26.7672, -53.1678];

    useEffect(() => {
        api.get("/trees").then(({ data }) => setTrees(Array.isArray(data) ? data : data.trees || [])).catch(console.error);
        api.get("/areas").then(({ data }) => setAreas(Array.isArray(data) ? data : data.areas || [])).catch(console.error);

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => setUserLocation([pos.coords.latitude, pos.coords.longitude]));
        }
    }, []);

    // --- LÓGICA DE FILTRAGEM SIMPLIFICADA ---
    const filteredTrees = trees.filter(tree => {
        if (!tree.latitude || !tree.longitude) return false;

        let matchesMapFilter = false;

        if (mapFilter === 'all') {
            // Explorar: Mostra tudo o que for visível ao público
            matchesMapFilter = tree.visibilidade === 'publica' || tree.visibilidade === 'comunidade';
        } else if (mapFilter === 'community') {
            // Caça: Mostra APENAS árvores interativas
            matchesMapFilter = tree.visibilidade === 'comunidade';
        } else if (mapFilter === 'mine') {
            // Minhas: Mostra TODAS as minhas (Públicas, Privadas, Comunidade)
            matchesMapFilter = user && tree.usuario_id === user.id;
        }

        if (!matchesMapFilter) return false;

        // Filtro de Saúde (Mantido)
        if (statusFilter && tree.estado_saude !== statusFilter) return false;

        return true;
    });

    const filteredAreas = areas.filter(area => {
        // Áreas só aplicam filtro de "Minhas"
        if (mapFilter === 'mine' && area.usuario_id !== user?.id) return false;
        return true;
    });

    const getIcon = (saude) => {
        if (saude === 'Saudável') return iconHealthy;
        if (saude === 'Morrendo') return iconDead;
        return iconSick;
    };

    const handleViewDetails = (tree) => {
        setSelectedTree(tree);
        setShowModal(true);
    };

    const calculateAge = (dateString) => {
        if (!dateString) return "Idade desconhecida";
        const plantDate = new Date(dateString);
        const adjustedDate = new Date(plantDate.getTime() + plantDate.getTimezoneOffset() * 60000);
        const today = new Date();
        if (isAfter(adjustedDate, today)) return "Ainda não plantada";

        const years = differenceInYears(today, adjustedDate);
        const months = differenceInMonths(today, adjustedDate) % 12;
        const days = differenceInDays(today, adjustedDate);

        if (years > 0) return `${years} ano(s)${months > 0 ? ` e ${months} mês(es)` : ''}`;
        if (months > 0) return `${months} mês(es)`;
        if (days === 0) return "Plantada hoje";
        return `${days} dia(s)`;
    };

    return (
        <div className="map-page-container">
            <div className="map-header">
                <button className="back-btn-map" onClick={() => navigate('/home')}>
                    <FaArrowLeft /> Início
                </button>
            </div>

            {/* --- PAINEL DE FILTROS FLUTUANTE SIMPLIFICADO --- */}
            <div className="map-filters-wrapper">
                <button
                    className={`filter-toggle-btn ${showFilters || mapFilter !== 'all' || statusFilter !== '' ? 'active' : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <FaFilter /> Filtros
                </button>

                {showFilters && (
                    <div className="filter-dropdown">
                        <div className="filter-group-map">
                            <label>O que mostrar no mapa?</label>
                            <select value={mapFilter} onChange={(e) => setMapFilter(e.target.value)}>
                                <option value="all">🌍 Explorar (Públicas e Comunidade)</option>
                                <option value="community">📍 Árvores Interativas (Só Comunidade)</option>
                                <option value="mine">👤 Meu Perfil (Apenas Minhas)</option>
                            </select>
                        </div>
                        <div className="filter-group-map">
                            <label>Saúde da Árvore:</label>
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                <option value="">Todos os Status</option>
                                <option value="Saudável">Saudável</option>
                                <option value="Doente">Doente</option>
                                <option value="Morrendo">Morrendo</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            <div className="map-legend" style={{ left: '20px', right: 'auto' }}>
                <div className="legend-item"><span className="dot green"></span> Saudável</div>
                <div className="legend-item"><span className="dot orange"></span> Doente</div>
                <div className="legend-item"><span className="dot red"></span> Morrendo</div>
                <div className="legend-item"><span className="dot" style={{ background: '#8b5cf6' }}></span> Área Verde</div>
                <div className="legend-item"><span className="dot blue"></span> Você</div>
            </div>

            <MapContainer center={defaultCenter} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                <LocationButton userLocation={userLocation} setUserLocation={setUserLocation} />

                {userLocation && <Marker position={userLocation} icon={iconUser}><Popup>Você está aqui!</Popup></Marker>}

                {/* --- RENDERIZA ÁRVORES FILTRADAS --- */}
                {filteredTrees.map(tree => (
                    <Marker key={`tree-${tree.id}`} position={[tree.latitude, tree.longitude]} icon={getIcon(tree.estado_saude)}>
                        <Popup>
                            <strong>{tree.nome_popular || tree.nome_cientifico}</strong>
                            <br /><span style={{ color: '#666' }}>{tree.estado_saude}</span>

                            {/* MINI BADGE DE VISIBILIDADE NO POPUP */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem',
                                marginTop: '6px', fontWeight: 'bold', textTransform: 'uppercase',
                                color: tree.visibilidade === 'privada' ? '#f59e0b' :
                                    tree.visibilidade === 'comunidade' ? '#2196f3' : '#2e7d32'
                            }}>
                                {tree.visibilidade === 'privada' && <FaLock />}
                                {tree.visibilidade === 'publica' && <FaGlobeAmericas />}
                                {tree.visibilidade === 'comunidade' && <FaUsers />}
                                {tree.visibilidade}
                            </div>

                            <button onClick={() => handleViewDetails(tree)} style={{ marginTop: 10, background: '#2e7d32', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 4, cursor: 'pointer', width: '100%', fontWeight: 'bold' }}>
                                Ver Detalhes
                            </button>
                        </Popup>
                    </Marker>
                ))}

                {/* --- RENDERIZA ÁREAS VERDES FILTRADAS --- */}
                {filteredAreas.map(area => {
                    let polygonData = null;
                    if (area.polygon_path) {
                        try { polygonData = JSON.parse(area.polygon_path); } catch (e) { console.error(e); }
                    }
                    if (!polygonData && (!area.latitude || !area.longitude)) return null;

                    return (
                        <React.Fragment key={`area-group-${area.id}`}>
                            {polygonData ? (
                                <Polygon positions={polygonData} pathOptions={{ color: '#8b5cf6', weight: 2, fillColor: '#8b5cf6', fillOpacity: 0.35 }}>
                                    <Popup>
                                        <div style={{ textAlign: 'center' }}>
                                            <strong style={{ color: '#8b5cf6', fontSize: '1.1rem' }}>{area.nome}</strong>
                                            <br /><span style={{ fontSize: '0.9rem', color: '#666' }}>{area.descricao}</span>
                                        </div>
                                    </Popup>
                                </Polygon>
                            ) : (
                                <Marker position={[area.latitude, area.longitude]} icon={iconArea}>
                                    <Popup>
                                        <strong style={{ color: '#8b5cf6' }}>{area.nome}</strong>
                                        <br />{area.responsavel}
                                    </Popup>
                                </Marker>
                            )}
                        </React.Fragment>
                    );
                })}
            </MapContainer>

            {/* Modal de Árvore */}
            {showModal && selectedTree && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="tree-modal" onClick={e => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={() => setShowModal(false)}><FaTimes /></button>
                        <div className="modal-content">
                            <div className="modal-header-row">
                                <div>
                                    <span className="modal-tree-id">#{selectedTree.id}</span>
                                    <div className="modal-titles">
                                        <h2>{selectedTree.nome_popular}</h2>
                                        <span style={{ fontSize: '0.9rem', color: '#666' }}>{selectedTree.nome_cientifico}</span>
                                    </div>
                                </div>
                            </div>

                            {/* CAIXA DE IDADE DA ÁRVORE */}
                            <div className="specs-box" style={{ justifyContent: 'center', backgroundColor: 'var(--bg-soft)', border: '1px dashed var(--primary)', marginBottom: '15px', padding: '12px', borderRadius: '8px', display: 'flex' }}>
                                <div className="spec-item" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FaClock size={16} />
                                    <strong style={{ color: 'var(--text-main)' }}>Idade:</strong>
                                    <span style={{ color: 'var(--text-main)' }}>{calculateAge(selectedTree.data_plantio)}</span>
                                </div>
                            </div>

                            {/* --- INFORMAÇÕES DETALHADAS --- */}
                            <div className="modal-info-list">
                                <div className="modal-info-row">
                                    <FaHeartbeat />
                                    <div>
                                        <strong>Saúde:</strong> <span className={`status-text-${selectedTree.estado_saude?.toLowerCase()}`}>{selectedTree.estado_saude}</span>
                                    </div>
                                </div>

                                <div className="modal-info-row">
                                    <FaCalendarAlt />
                                    <div>
                                        <strong>Data de Plantio:</strong> {selectedTree.data_plantio ? new Date(selectedTree.data_plantio).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Não informada'}
                                    </div>
                                </div>

                                {selectedTree.nome_area && (
                                    <div className="modal-info-row">
                                        <FaGlobeAmericas />
                                        <div>
                                            <strong>Área Verde:</strong> {selectedTree.nome_area}
                                        </div>
                                    </div>
                                )}

                                {/* RODAPÉ DE INFO (Com Cores e Badge) */}
                                <div className="modal-info-row" style={{ marginTop: '5px', paddingTop: '10px', borderTop: '1px solid var(--input-border)', display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <FaUser />
                                        <div>
                                            <strong>Por:</strong> {selectedTree.nome_registrante}
                                        </div>
                                    </div>

                                    <span
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase',
                                            color: selectedTree.visibilidade === 'privada' ? '#f59e0b' :
                                                selectedTree.visibilidade === 'comunidade' ? '#2196f3' : 'var(--primary)'
                                        }}
                                    >
                                        {selectedTree.visibilidade === 'privada' && <FaLock />}
                                        {selectedTree.visibilidade === 'publica' && <FaGlobeAmericas />}
                                        {selectedTree.visibilidade === 'comunidade' && <FaUsers />}
                                        {selectedTree.visibilidade}
                                    </span>
                                </div>
                            </div>

                            <TreeTimeline
                                treeId={selectedTree.id}
                                treeOwnerId={selectedTree.usuario_id}
                                treeLat={selectedTree.latitude}
                                treeLng={selectedTree.longitude}
                                treeVisibility={selectedTree.visibilidade}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MapPage;