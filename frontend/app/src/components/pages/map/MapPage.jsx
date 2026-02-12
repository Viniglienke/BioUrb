import React, { useEffect, useState, useContext } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../../../services/api';
import { AuthContext } from '../../../context/AuthContext';
import {
    FaArrowLeft, FaCrosshairs, FaTimes,
    FaUser, FaLeaf, FaRulerVertical, FaExpand, FaGlobeAmericas,
    FaMapMarkerAlt, FaLock
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import TreeTimeline from "../../../components/treetimeline/TreeTimeline";
import './MapPage.css';

// --- CONFIGURAÇÃO DE ÍCONES (NOVOS) ---
const createModernPin = (color) => {
    // SVG APENAS COM A GOTA (SEM ÁRVORE DENTRO)
    const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="38" height="38">
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/>
      </filter>
      
      <path fill="${color}" filter="url(#shadow)" d="M384 192c0 87.4-117 243-168.3 307.2c-12.3 15.3-35.1 15.3-47.4 0C117 435 0 279.4 0 192C0 86 86 0 192 0s192 86 192 192z"/>
    </svg>
  `;

    return new L.DivIcon({
        className: 'custom-pin',
        html: svgString,
        iconSize: [38, 50],    // Tamanho ajustado
        iconAnchor: [19, 50],  // A ponta do pino fica exatamente na coordenada
        popupAnchor: [0, -55]  // O popup abre acima do pino
    });
};

// Ícone de Usuário (Bolinha pulsante azul)
const createUserIcon = () => {
    return new L.DivIcon({
        className: 'user-location-marker',
        html: `
            <div style="
                width: 16px; height: 16px; 
                background: #2196f3; 
                border: 3px solid white; 
                border-radius: 50%; 
                box-shadow: 0 0 0 4px rgba(33, 150, 243, 0.4);
            "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
};

// --- DEFINIÇÃO DOS ÍCONES ---
const iconHealthy = createModernPin('#2e7d32'); // Verde Floresta
const iconSick = createModernPin('#f97316');    // Laranja Vibrante
const iconDead = createModernPin('#ef4444');    // Vermelho Alerta
const iconUser = createUserIcon();              // Azul

// Ícone para Área Verde (Caso não tenha desenho, usa um Pin Roxo)
const iconArea = createModernPin('#8b5cf6');    // Roxo

// --- COMPONENTE: BOTÃO DE LOCALIZAÇÃO ---
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

const MapPage = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [trees, setTrees] = useState([]);
    const [areas, setAreas] = useState([]);
    const [userLocation, setUserLocation] = useState(null);

    // Modal
    const [selectedTree, setSelectedTree] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const defaultCenter = [-26.7672, -53.1678];

    useEffect(() => {
        // Busca Árvores
        api.get("/trees").then(({ data }) => {
            const lista = Array.isArray(data) ? data : data.trees || [];
            setTrees(lista);
        }).catch(err => console.error(err));

        // Busca Áreas
        api.get("/areas").then(({ data }) => {
            const lista = Array.isArray(data) ? data : data.areas || [];
            setAreas(lista);
        }).catch(err => console.error(err));

        // GPS Inicial
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => setUserLocation([pos.coords.latitude, pos.coords.longitude]));
        }
    }, []);

    const visibleTrees = trees.filter(tree =>
        tree.latitude && tree.longitude &&
        (tree.visibilidade === 'publica' || (user && tree.usuario_id === user.id))
    );

    const getIcon = (saude) => {
        if (saude === 'Saudável') return iconHealthy;
        if (saude === 'Morrendo') return iconDead;
        return iconSick;
    };

    const handleViewDetails = (tree) => {
        setSelectedTree(tree);
        setShowModal(true);
    };

    return (
        <div className="map-page-container">
            <div className="map-header">
                <button className="back-btn-map" onClick={() => navigate('/home')}>
                    <FaArrowLeft /> Início
                </button>
            </div>

            <div className="map-legend" style={{ left: '20px', right: 'auto' }}>
                <div className="legend-item"><span className="dot green"></span> Saudável</div>
                <div className="legend-item"><span className="dot orange"></span> Doente</div>
                <div className="legend-item"><span className="dot red"></span> Crítica</div>
                <div className="legend-item"><span className="dot" style={{ background: '#8b5cf6' }}></span> Área Verde</div>
                <div className="legend-item"><span className="dot blue"></span> Você</div>
            </div>

            <MapContainer center={defaultCenter} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                <LocationButton userLocation={userLocation} setUserLocation={setUserLocation} />

                {userLocation && <Marker position={userLocation} icon={iconUser}><Popup>Você!</Popup></Marker>}

                {/* --- RENDERIZA ÁRVORES --- */}
                {visibleTrees.map(tree => (
                    <Marker key={tree.id} position={[tree.latitude, tree.longitude]} icon={getIcon(tree.estado_saude)}>
                        <Popup>
                            <strong>{tree.nome_popular}</strong>
                            <br />{tree.nome_cientifico}
                            <br /><button onClick={() => handleViewDetails(tree)} style={{ marginTop: 5, background: '#2e7d32', color: 'white', border: 'none', padding: 5, borderRadius: 4, cursor: 'pointer' }}>Ver Detalhes</button>
                        </Popup>
                    </Marker>
                ))}

                {/* --- RENDERIZA ÁREAS VERDES --- */}
                {areas.map(area => {
                    let polygonData = null;
                    if (area.polygon_path) {
                        try { polygonData = JSON.parse(area.polygon_path); } catch (e) { console.error(e); }
                    }

                    if (!polygonData && (!area.latitude || !area.longitude)) return null;

                    return (
                        <React.Fragment key={`area-group-${area.id}`}>
                            {/* Desenho do Polígono */}
                            {polygonData ? (
                                <Polygon
                                    positions={polygonData}
                                    pathOptions={{
                                        color: '#8b5cf6',
                                        weight: 2,
                                        fillColor: '#8b5cf6',
                                        fillOpacity: 0.35
                                    }}
                                >
                                    <Popup>
                                        <div style={{ textAlign: 'center' }}>
                                            <strong style={{ color: '#8b5cf6', fontSize: '1.1rem' }}>{area.nome}</strong>
                                            <br />
                                            <span style={{ fontSize: '0.9rem', color: '#666' }}>{area.descricao}</span>
                                        </div>
                                    </Popup>
                                </Polygon>
                            ) : (
                                /* Fallback: Pino Roxo se não tiver desenho */
                                <Marker
                                    position={[area.latitude, area.longitude]}
                                    icon={iconArea}
                                >
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
                            <TreeTimeline treeId={selectedTree.id} treeOwnerId={selectedTree.usuario_id} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MapPage;