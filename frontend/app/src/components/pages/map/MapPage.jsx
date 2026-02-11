import React, { useEffect, useState, useContext } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../../../services/api';
import { AuthContext } from '../../../context/AuthContext';
import {
    FaArrowLeft, FaCrosshairs, FaTimes, FaTree, FaCalendarAlt,
    FaUser, FaLeaf, FaRulerVertical, FaExpand, FaGlobeAmericas,
    FaMapMarkerAlt, FaLock
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import TreeTimeline from "../../../components/treetimeline/TreeTimeline";
import './MapPage.css';

// --- CONFIGURAÇÃO DE ÍCONES ---
const createIcon = (color) => {
    return new L.DivIcon({
        className: 'custom-icon',
        html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.4);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });
};

const iconHealthy = createIcon('#2e7d32');
const iconSick = createIcon('#f57c00');
const iconDead = createIcon('#d32f2f');
const iconUser = createIcon('#2196f3');

// --- COMPONENTE: BOTÃO DE LOCALIZAÇÃO DENTRO DO MAPA ---
// Precisamos criar este componente para ter acesso ao hook 'useMap()'
const LocationButton = ({ userLocation, setUserLocation }) => {
    const map = useMap();
    const [loadingLoc, setLoadingLoc] = useState(false);

    // Função auxiliar para pedir a posição com configurações específicas
    const getPosition = (options) => {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });
    };

    const handleLocate = async () => {
        // 1. Se já tem local, só voa
        if (userLocation) {
            map.flyTo(userLocation, 16, { duration: 1.5 });
            return;
        }

        setLoadingLoc(true);

        if (!navigator.geolocation) {
            alert("Navegador sem suporte a GPS.");
            setLoadingLoc(false);
            return;
        }

        try {
            // TENTATIVA 1: Alta Precisão (GPS) com timeout curto (5s)
            // Se demorar mais que 5s, consideramos que o GPS falhou e vamos pro fallback
            const pos = await getPosition({
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            });

            sucesso(pos);

        } catch (err) {
            console.warn("GPS Alta precisão falhou, tentando aproximada...", err);

            // TENTATIVA 2: Baixa Precisão (Wi-Fi/IP) - Fallback
            // Isso funciona em quase todos os PCs e Notebooks
            try {
                const pos = await getPosition({
                    enableHighAccuracy: false,
                    timeout: 10000,
                    maximumAge: 0
                });

                sucesso(pos);

            } catch (err2) {
                console.error("Erro GPS Final:", err2);
                setLoadingLoc(false);
                alert("Não conseguimos te localizar nem por GPS nem por Wi-Fi. Verifique sua conexão.");
            }
        }
    };

    const sucesso = (pos) => {
        const newLoc = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(newLoc);
        map.flyTo(newLoc, 16, { duration: 1.5 });
        setLoadingLoc(false);
    };

    return (
        <button
            className="locate-btn"
            onClick={handleLocate}
            title="Ir para minha localização"
            disabled={loadingLoc}
        >
            {loadingLoc ? (
                <div style={{
                    width: '20px', height: '20px',
                    border: '3px solid #ccc', borderTop: '3px solid #2e7d32',
                    borderRadius: '50%', animation: 'spin 1s linear infinite'
                }}></div>
            ) : (
                <FaCrosshairs />
            )}
        </button>
    );
};

const MapPage = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [trees, setTrees] = useState([]);
    const [userLocation, setUserLocation] = useState(null);

    // Estados do Modal
    const [selectedTree, setSelectedTree] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const defaultCenter = [-26.7672, -53.1678];

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.watchPosition(
                (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
                (err) => console.log("Erro GPS:", err),
                { enableHighAccuracy: true }
            );
        }

        api.get("/trees")
            .then(({ data }) => {
                const lista = Array.isArray(data) ? data : data.trees || [];
                setTrees(lista);
            })
            .catch(err => console.error("Erro API:", err));
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

    // Função para abrir o modal
    const handleViewDetails = (tree) => {
        setSelectedTree(tree);
        setShowModal(true);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "—";
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    };

    return (
        <div className="map-page-container" style={{
            height: 'calc(100vh - 80px)',
            width: '100%',
            position: 'relative',
            marginTop: '0px',
            borderRadius: '0px 0px 12px 12px'
        }}>
            {/* HEADER */}
            <div className="map-header">
                <button className="back-btn-map" onClick={() => navigate('/home')}>
                    <FaArrowLeft /> Início
                </button>
            </div>

            {/* LEGENDA (NA ESQUERDA) */}
            <div className="map-legend" style={{ left: '20px', right: 'auto' }}>
                <div className="legend-item"><span className="dot green"></span> Saudável</div>
                <div className="legend-item"><span className="dot orange"></span> Doente</div>
                <div className="legend-item"><span className="dot red"></span> Crítica</div>
                <div className="legend-item"><span className="dot blue"></span> Você</div>
            </div>

            <MapContainer
                center={defaultCenter}
                zoom={14}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={false}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap'
                />

                {/* BOTÃO DE GPS (Renderizado dentro do MapContainer) */}
                <LocationButton userLocation={userLocation} setUserLocation={setUserLocation} />

                {/* Marcador do Usuário */}
                {userLocation && (
                    <Marker position={userLocation} icon={iconUser}>
                        <Popup>Você está aqui!</Popup>
                    </Marker>
                )}

                {visibleTrees.map(tree => (
                    <Marker
                        key={tree.id}
                        position={[tree.latitude, tree.longitude]}
                        icon={getIcon(tree.estado_saude)}
                    >
                        <Popup>
                            <div className="popup-content">
                                {tree.imagem_url && (
                                    <div style={{
                                        backgroundImage: `url(${tree.imagem_url})`,
                                        height: '120px',
                                        width: '100%',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center'
                                    }}></div>
                                )}
                                <div style={{ padding: '10px' }}>
                                    <strong>{tree.nome_popular || "Árvore"}</strong>
                                    <div style={{ fontSize: '12px', color: '#666', margin: '5px 0' }}>
                                        {tree.nome_cientifico}
                                    </div>
                                    <button
                                        onClick={() => handleViewDetails(tree)}
                                        style={{
                                            background: '#2e7d32', color: 'white', border: 'none',
                                            padding: '8px 12px', borderRadius: '6px', width: '100%', cursor: 'pointer', marginTop: '5px'
                                        }}
                                    >
                                        Ver Detalhes Completo
                                    </button>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* --- MODAL DE DETALHES ATUALIZADO --- */}
            {showModal && selectedTree && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="tree-modal" onClick={e => e.stopPropagation()}>

                        {/* BOTÃO FECHAR (Agora isolado no topo absoluto) */}
                        <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                            <FaTimes />
                        </button>

                        <div className="modal-content">

                            {/* CABEÇALHO REORGANIZADO */}
                            {/* Usei padding-right no CSS para o texto não bater no X */}
                            <div className="modal-header-row">
                                <div>
                                    <span className="modal-tree-id">#{selectedTree.id}</span>
                                    <div className="modal-titles">
                                        <h2>{selectedTree.nome_cientifico}</h2>
                                        {selectedTree.nome_popular && (
                                            <div className="modal-popular-name">
                                                <FaLeaf /> {selectedTree.nome_popular}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Status Badge agora fica alinhado, mas sem bater no X */}
                                <span className={`status-tag ${selectedTree.estado_saude?.toLowerCase()}`} style={{ marginTop: '20px' }}>
                                    {selectedTree.estado_saude}
                                </span>
                            </div>

                            {/* SPECS (Altura/Diametro) */}
                            <div className="modal-specs-box">
                                <div className="modal-spec-item">
                                    <FaRulerVertical />
                                    <span>Alt: {selectedTree.altura ? `${selectedTree.altura}m` : "—"}</span>
                                </div>
                                <div className="modal-divider"></div>
                                <div className="modal-spec-item">
                                    <FaExpand />
                                    <span>Diâm: {selectedTree.diametro ? `${selectedTree.diametro}cm` : "—"}</span>
                                </div>
                            </div>

                            {/* DADOS */}
                            <div className="modal-info-list">
                                <div className="modal-info-row">
                                    <FaCalendarAlt />
                                    <span><strong>Plantio:</strong> {formatDate(selectedTree.data_plantio)}</span>
                                </div>

                                <div className="modal-info-row">
                                    <FaGlobeAmericas />
                                    <span><strong>Área:</strong> {selectedTree.nome_area || "Não vinculada"}</span>
                                </div>

                                <div className="modal-info-row">
                                    <FaMapMarkerAlt />
                                    <span style={{ wordBreak: 'break-word', fontSize: '0.9rem' }}>
                                        <strong>Local:</strong> {selectedTree.localizacao || "Sem endereço"}
                                    </span>
                                </div>

                                <div className="modal-info-row">
                                    <FaUser />
                                    <span><strong>Registrado por:</strong> {selectedTree.nome_registrante}</span>
                                </div>

                                {/* PRIVACIDADE */}
                                {user && selectedTree.usuario_id === user.id && (
                                    <div className="modal-privacy-badge" style={{
                                        color: selectedTree.visibilidade === 'privada' ? '#f59e0b' : '#166534'
                                    }}>
                                        {selectedTree.visibilidade === 'privada' ? <FaLock size={10} /> : <FaGlobeAmericas size={10} />}
                                        {selectedTree.visibilidade === 'privada' ? "Privado" : "Público"}
                                    </div>
                                )}
                            </div>

                            {/* DIÁRIO DE CRESCIMENTO (Expandido e sem scroll duplo) */}
                            <div className="timeline-section">
                                <h3 style={{
                                    fontSize: '1.1rem',
                                    marginBottom: '15px',
                                    color: '#1b5e20',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    borderBottom: '2px solid #e0e0e0', /* Linha separadora bonita */
                                    paddingBottom: '10px'
                                }}>
                                    Diário de Crescimento
                                </h3>

                                <div className="timeline-container-full">
                                    <TreeTimeline
                                        treeId={selectedTree.id}
                                        treeOwnerId={selectedTree.usuario_id}
                                    />
                                </div>

                            </div>

                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default MapPage;