import React, { useState, useEffect, useContext } from 'react';
import { QRCodeSVG } from "qrcode.react";
import { api } from '../../../services/api';
import { AuthContext } from '../../../context/AuthContext';
import { FaTicketAlt, FaTimes, FaPrint, FaCheckCircle, FaClock, FaList, FaBoxOpen } from 'react-icons/fa';
import './Inventory.css';
import logoImg from '../../../assets/icon.svg';

const formatType = (type) => {
    const map = {
        'badge': 'EMBLEMA',
        'fisico': 'ITEM FÍSICO',
        'skin': 'VISUAL APP'
    };
    return map[type] || type.toUpperCase();
};

const Inventory = () => {
    const { user } = useContext(AuthContext);
    const [items, setItems] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);

    // Filtro padrão: 'todos'
    const [filterStatus, setFilterStatus] = useState('todos');

    useEffect(() => {
        if (user) fetchInventory();
    }, [user]);

    const fetchInventory = async () => {
        try {
            const res = await api.get(`/inventory/${user.id}`);
            setItems(res.data);
        } catch (error) {
            console.error("Erro ao buscar inventário");
        }
    };

    const handlePrint = () => {
        window.print();
    };

    // Lógica de filtragem
    const filteredItems = items.filter(item => {
        if (filterStatus === 'todos') return true;
        return item.status.toLowerCase() === filterStatus;
    });

    return (
        <div className="inventory-container">
            <div className="inventory-header-block">
                <h1>Meus Itens & Recompensas</h1>
                <p>Gerencie suas compras e retire seus prêmios.</p>
            </div>

            {/* ABAS DE FILTRO */}
            <div className="inventory-tabs">
                <button
                    className={`tab-btn ${filterStatus === 'todos' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('todos')}
                >
                    <FaList /> Todos
                </button>
                <button
                    className={`tab-btn ${filterStatus === 'pendente' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('pendente')}
                >
                    <FaClock /> Aguardando Retirada
                </button>
                <button
                    className={`tab-btn ${filterStatus === 'retirado' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('retirado')}
                >
                    <FaCheckCircle /> Retirados
                </button>
            </div>

            {/* GRID DE ITENS */}
            <div className="inventory-grid">
                {filteredItems.length > 0 ? (
                    filteredItems.map(item => (
                        <div key={item.id} className="inventory-card">
                            <div className="inv-img">
                                <img src={item.imagem_url} alt={item.nome} />
                            </div>
                            <div className="inv-info">
                                <h3>{item.nome}</h3>
                                <div className={`status-tag ${item.status.toLowerCase()}`}>
                                    {item.status === 'Pendente' ? <FaClock /> : <FaCheckCircle />}
                                    {item.status}
                                </div>
                                <small>Comprado em: {new Date(item.data_compra).toLocaleDateString()}</small>

                                <button className="btn-ticket" onClick={() => setSelectedTicket(item)}>
                                    <FaTicketAlt /> Ver Comprovante
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-state">
                        <FaBoxOpen size={50} color="#ccc" />
                        <p>Nenhum item encontrado nesta categoria.</p>
                    </div>
                )}
            </div>

            {/* MODAL DO COMPROVANTE (TICKET) */}
            {selectedTicket && (
                <div className="modal-overlay">
                    <div className="ticket-modal">
                        <div className="ticket-notch notch-left"></div>
                        <div className="ticket-notch notch-right"></div>

                        <div className="ticket-header">
                            <h2>Comprovante de Retirada</h2>
                            <button className="close-btn" onClick={() => setSelectedTicket(null)}><FaTimes /></button>
                        </div>

                        <div className="ticket-body" id="printable-area">
                            <div className="brand-section">
                                <img src={logoImg} alt="BioUrb Logo" className="ticket-main-logo" />
                                <div className="ticket-brand">BioUrb</div>
                            </div>

                            <div className="ticket-item-section">
                                <div className="item-image-wrapper">
                                    <img src={selectedTicket.imagem_url} alt="Item" />
                                </div>
                                <h3>{selectedTicket.nome}</h3>
                                <span className="item-type-badge">{formatType(selectedTicket.tipo)}</span>
                            </div>

                            <div className="ticket-divider"></div>

                            <div className="ticket-details">
                                <div className="detail-row">
                                    <span className="label">Beneficiário</span>
                                    <span className="value">{user.nome}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">Data de Compra</span>
                                    <span className="value">{new Date(selectedTicket.data_compra).toLocaleDateString()}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">Status Atual</span>
                                    <span className={`value status-${selectedTicket.status.toLowerCase()}`}>{selectedTicket.status}</span>
                                </div>
                            </div>

                            <div className="ticket-code-box">
                                <small>QR CODE DE VALIDAÇÃO</small>

                                {/* --- AQUI ESTÁ A ADIÇÃO DO QR CODE --- */}
                                <div style={{ background: 'white', display: 'inline-block', borderRadius: '8px' }}>
                                    <QRCodeSVG
                                        value={selectedTicket.codigo_resgate}
                                        size={110}
                                        level={"H"} // Alto nível de correção de erro para leitura fácil
                                    />
                                </div>
                                {/* ------------------------------------- */}

                                <small>CÓDIGO MANUAL</small>
                                <div className="the-code">{selectedTicket.codigo_resgate}</div>
                            </div>

                            <p className="ticket-footer">
                                Apresente este QR Code na prefeitura ou posto de coleta autorizado para retirar seu item.
                            </p>
                        </div>

                        <div className="ticket-actions">
                            <button className="btn-print" onClick={handlePrint}>
                                <FaPrint /> Imprimir Comprovante
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;