import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { FaTimes, FaCheck, FaCrosshairs } from 'react-icons/fa';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import './LocationPicker.css';

// Ícone do Pino (Pode usar o padrão ou um customizado)
const markerIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// --- COMPONENTE INTERNO: BOTÃO DE MIRA (GPS) ---
const LocateControl = ({ setPosition, setAddressText }) => {
    const map = useMap();
    const [loading, setLoading] = useState(false);

    const handleLocate = () => {
        setLoading(true);
        if (!navigator.geolocation) {
            alert("Navegador sem GPS.");
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                const newPos = { lat: latitude, lng: longitude };

                // 1. Voa para o local
                map.flyTo(newPos, 16, { duration: 1.5 });

                // 2. Atualiza o pino para este local
                setPosition(newPos);

                // 3. Tenta buscar o nome da rua (Opcional, mas legal)
                try {
                    const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                    if (response.data && response.data.display_name) {
                        setAddressText(response.data.display_name.split(',')[0]); // Pega só a primeira parte
                    }
                } catch (error) {
                    console.log("Erro ao buscar endereço reverso");
                }

                setLoading(false);
            },
            (err) => {
                console.error("Erro GPS:", err);
                alert("Não foi possível obter sua localização atual.");
                setLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    return (
        <button
            className="picker-locate-btn"
            onClick={handleLocate}
            title="Usar minha localização atual"
            type="button" // Importante para não submeter forms
        >
            {loading ? <span className="picker-spinner"></span> : <FaCrosshairs />}
        </button>
    );
};

// --- COMPONENTE INTERNO: Clica no mapa para mover o pino ---
const LocationMarker = ({ position, setPosition, setAddressText }) => {
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            // Opcional: Buscar endereço ao clicar
            fetchAddress(e.latlng.lat, e.latlng.lng, setAddressText);
        },
    });

    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);

    return position === null ? null : (
        <Marker position={position} icon={markerIcon}>
            <Popup>Local selecionado!</Popup>
        </Marker>
    );
};

// Função auxiliar de busca de endereço
const fetchAddress = async (lat, lng, setAddress) => {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
        const res = await axios.get(url);
        if (res.data && res.data.display_name) {
            // Pega rua e número, ou cidade se não tiver rua
            const parts = res.data.display_name.split(',');
            setAddress(parts[0]);
        }
    } catch (e) {
        setAddress("Localização personalizada");
    }
};

// --- COMPONENTE PRINCIPAL ---
const LocationPicker = ({ onClose, onConfirm, initialPosition }) => {
    // Posição padrão (Maravilha-SC) se não vier nada
    const defaultCenter = { lat: -26.7672, lng: -53.1678 };

    const [position, setPosition] = useState(initialPosition || defaultCenter);
    const [addressText, setAddressText] = useState("Clique no mapa ou use o GPS");

    const handleConfirm = () => {
        onConfirm({
            lat: position.lat,
            lng: position.lng,
            addressText: addressText
        });
    };

    return (
        <div className="picker-overlay">
            <div className="picker-modal">
                <div className="picker-header">
                    <h3>Selecionar Localização</h3>
                    <button className="picker-close" onClick={onClose}><FaTimes /></button>
                </div>

                <div className="picker-map-container">
                    <MapContainer
                        center={position}
                        zoom={15}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; OpenStreetMap'
                        />

                        {/* Adiciona o botão de GPS aqui dentro */}
                        <LocateControl setPosition={setPosition} setAddressText={setAddressText} />

                        <LocationMarker
                            position={position}
                            setPosition={setPosition}
                            setAddressText={setAddressText}
                        />
                    </MapContainer>
                </div>

                <div className="picker-footer">
                    <p className="selected-address">
                        <strong>Selecionado:</strong> {addressText}
                    </p>
                    <button className="picker-confirm-btn" onClick={handleConfirm}>
                        <FaCheck /> Confirmar Local
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LocationPicker;