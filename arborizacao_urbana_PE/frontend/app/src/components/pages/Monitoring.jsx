import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Monitoring.css';
import { FaLock } from 'react-icons/fa';
import emailjs from '@emailjs/browser';
import { FaUser, FaTree, FaCalendarAlt, FaHeartbeat, FaMapMarkerAlt, FaSearch } from "react-icons/fa";
import { useRef } from 'react';
import { isAfter } from 'date-fns';

const Monitoring = () => {
    // Estados para controlar modais, loading e mensagens de sucesso
    const [showLocationModal, setShowLocationModal] = useState(false); // modal que mostra localização completa
    const [selectedLocation, setSelectedLocation] = useState(''); // localização selecionada para mostrar no modal
    const [loadingDeleteId, setLoadingDeleteId] = useState(null); // mostra loading somente para o id da árvore que está sendo deletada
    const [showSuccessDelete, setShowSuccessDelete] = useState(false); // popup de sucesso ao deletar
    const [showSuccessEdit, setShowSuccessEdit] = useState(false); // popup de sucesso ao editar
    const [successMessage, setSuccessMessage] = useState(''); // mensagem geral de sucesso
    const [loading, setLoading] = useState(false); // loading para enviar relatório por email
    const [showReportModal, setShowReportModal] = useState(false); // modal para reportar problema
    const [reportTreeId, setReportTreeId] = useState(null); // id da árvore que está sendo reportada
    const [reportText, setReportText] = useState(""); // texto do problema reportado

    const user = JSON.parse(localStorage.getItem("@Auth:user")); // usuário logado
    
    const [trees, setTrees] = useState([]); // lista das árvores carregadas do backend
    const [editing, setEditing] = useState(false); // flag para controle de modo edição
    const [currentTree, setCurrentTree] = useState({ // dados da árvore sendo editada
        id: null,
        nome_registrante: '',
        nome_cientifico: '',
        data_plantio: '',
        estado_saude: '',
        localizacao: ''
    });

    // Buscar as árvores assim que o componente monta
    useEffect(() => {
        fetchTrees();
    }, []);

    // Ajustar altura da textarea ao entrar em modo edição
    useEffect(() => {
        if (editing) {
            setTimeout(adjustEditTextareaHeight, 0); // pequeno delay para garantir que o textarea já esteja no DOM
        }
    }, [editing]);

    // Função para buscar árvores da API
    const fetchTrees = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/trees`);
            setTrees(response.data);
        } catch (error) {
            console.error("Erro ao buscar árvores:", error);
        }
    };

    // Abre o modal para reportar problema na árvore com o id selecionado
    const handleReportClick = (treeId) => {
        setReportTreeId(treeId);
        setShowReportModal(true);
    };

    // Fecha o modal de reportar problema e limpa o texto
    const handleCloseModal = () => {
        setShowReportModal(false);
        setReportText("");
    };

    // Envia o relatório do problema via email usando emailjs
    const handleSendReport = async () => {
        if (reportText.trim() === '') {
            alert('Descreva o problema antes de enviar.');
            return;
        }

        setLoading(true);

        const templateParams = {
            from_name: user.nome,
            email: user.email,
            user_id: user.id,
            tree_id: reportTreeId,
            problem_description: reportText
        };

        emailjs.send("service_vk5hd8d", "template_qviar4b", templateParams, "0EZ5fZfY7LfCvIBry")
            .then((response) => {
                console.log("EMAIL ENVIADO", response.status, response.text);
                setLoading(false);
                setSuccessMessage("Problema reportado com sucesso!");
                handleCloseModal();
            })
            .catch((err) => {
                console.log("ERRO AO ENVIAR:", err);
                setLoading(false);
                alert("Erro ao enviar o problema. Tente novamente.");
            });
    };

    // Ativa o modo de edição preenchendo os dados do formulário
    const handleEditClick = (tree) => {
        // Formata a data para yyyy-mm-dd para input type date
        const formattedDate = new Date(tree.data_plantio).toISOString().split('T')[0];

        setEditing(true);
        setCurrentTree({
            id: tree.id,
            nome_registrante: tree.nome_registrante,
            nome_cientifico: tree.nome_cientifico,
            data_plantio: formattedDate,
            estado_saude: tree.estado_saude,
            localizacao: tree.localizacao
        });
    };

    // Função para deletar árvore pelo id
    const handleDeleteTree = async (id) => {
        try {
            setLoadingDeleteId(id);
            await axios.delete(`${process.env.REACT_APP_API_URL}/trees/${id}`);
            fetchTrees();
            setShowSuccessDelete(true);
        } catch (error) {
            console.error('Erro ao excluir árvore', error);
        } finally {
            setLoadingDeleteId(null);
        }
    };

    {
        showSuccessDelete && (
            <div className="action-success-overlay">
                <div className="action-success-message">
                    <h2>Árvore excluída com sucesso!</h2>
                    <button onClick={() => setShowSuccessDelete(false)}>Fechar</button>
                </div>
            </div>
        )
    }

    // Ref para o textarea da localização em modo edição para ajustar altura dinamicamente
    const locationEditRef = useRef(null);

    // Ajusta a altura da textarea para evitar scrollbar interno
    const adjustEditTextareaHeight = () => {
        const el = locationEditRef.current;
        if (el) {
            el.style.height = 'auto'; // reset antes de ajustar
            el.style.height = el.scrollHeight + 'px';
        }
    };

    // Atualiza o estado dos campos do formulário de edição, ajustando textarea se for localização
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCurrentTree(prev => ({ ...prev, [name]: value }));

        if (name === "localizacao") {
            adjustEditTextareaHeight();
        }
    };

    // Submete atualização da árvore, com validação da data para não permitir datas futuras
    const handleUpdateSubmit = async (e) => {
        e.preventDefault();

        const today = new Date();
        const selectedDate = new Date(currentTree.data_plantio);

        if (isAfter(selectedDate, today)) {
            alert("A data de plantio não pode estar no futuro.");
            return;
        }

        try {
            await axios.put(`${process.env.REACT_APP_API_URL}/trees/${currentTree.id}`, {
                treeName: currentTree.nome_cientifico,
                plantingDate: currentTree.data_plantio,
                lifecondition: currentTree.estado_saude,
                location: currentTree.localizacao
            });
            setEditing(false);
            fetchTrees();
            setShowSuccessEdit(true);
        } catch (error) {
            console.error("Erro ao atualizar árvore:", error);
        }
    };


    // Formata data no formato brasileiro DD/MM/YYYY para exibição na tabela
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = String(date.getUTCDate()).padStart(2, '0'); // Pega o dia UTC
        const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Pega o mês UTC, mas adiciona 1 porque começa em 0
        const year = date.getUTCFullYear(); // Pega o ano UTC

        return `${day}/${month}/${year}`;
    };


    return (
        <div className="monitoring-container">
            <h1 className='monitoring-title'>Monitoramento de Árvores</h1>
            {editing ? (
                <div className="edit-mode">
                    <form className="edit-form" onSubmit={handleUpdateSubmit}>
                        <h2>Editar Árvore</h2>
                        <div className="input-field">
                            <FaUser className="input-icon" />
                            <input
                                type="text"
                                name="nome_registrante"
                                value={currentTree.nome_registrante}
                                onChange={handleInputChange}
                                placeholder="Nome do Registrante"
                                readOnly
                            />
                        </div>
                        <div className="input-field">
                            <FaTree className="input-icon" />
                            <input
                                type="text"
                                name="nome_cientifico"
                                value={currentTree.nome_cientifico}
                                onChange={handleInputChange}
                                placeholder="Nome Científico da Árvore"
                            />
                        </div>
                        <div className="input-field">
                            <FaCalendarAlt className="input-icon" />
                            <input
                                type="date"
                                name="data_plantio"
                                value={currentTree.data_plantio}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div className="input-field">
                            <FaHeartbeat className="input-icon" />
                            <select
                                name="estado_saude"
                                value={currentTree.estado_saude}
                                onChange={handleInputChange}
                            >
                                <option value="" disabled>Saúde da Árvore</option>
                                <option value="Saudável">Saudável</option>
                                <option value="Doente">Doente</option>
                                <option value="Morrendo">Morrendo</option>
                            </select>
                        </div>
                        <div className="input-field">
                            <FaMapMarkerAlt className="input-icon" style={{
                                position: 'absolute', top: '20px', left: '10px', color: '#555'
                            }}
                            />
                            <textarea
                                name="localizacao"
                                value={currentTree.localizacao}
                                onChange={handleInputChange}
                                placeholder="Localização"
                                ref={locationEditRef}
                                rows={1}
                                style={{
                                    width: '100%',
                                    padding: '10px 15px 10px 40px',
                                    color: '#155802',
                                    overflow: 'hidden',
                                    resize: 'none'
                                }}
                            />
                        </div>
                        <button className="update" type="submit">Atualizar Árvore</button>
                        <button className="cancel-button" onClick={() => setEditing(false)}>Cancelar</button>
                    </form>
                </div>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Usuário</th>
                            <th>Nome Científico</th>
                            <th>Data de Plantio</th>
                            <th>Estado de Saúde</th>
                            <th>Localização</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {trees.map(tree => (
                            <tr key={tree.id}>
                                <td>{tree.id}</td>
                                <td>{tree.nome_registrante}</td>
                                <td>{tree.nome_cientifico}</td>
                                <td>{formatDate(tree.data_plantio)}</td>
                                <td>{tree.estado_saude}</td>
                                <td
                                    onClick={() => {
                                        // Ao clicar na localização truncada, abre modal com texto completo
                                        if (tree.localizacao.length > 25) {
                                            setSelectedLocation(tree.localizacao);
                                            setShowLocationModal(true);
                                        }
                                    }}
                                    style={{
                                        cursor: tree.localizacao.length > 25 ? 'pointer' : 'default',
                                        color: 'inherit',
                                        padding: '8px 12px',
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        maxWidth: '180px',
                                    }}>
                                        <span style={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            display: 'inline-block',
                                            verticalAlign: 'middle',
                                        }}>
                                            {tree.localizacao}
                                        </span>
                                        {/* Ícone de lupa aparece se texto truncado */}
                                        {tree.localizacao.length > 25 && (
                                            <FaSearch size={12} style={{ color: 'inherit', flexShrink: 0 }} />
                                        )}
                                    </div>
                                </td>



                                <td>
                                    {/* Somente usuário dono ou admin (id=1) pode editar/excluir */}
                                    {tree.usuario_id === user.id || user.id === 1 ? (
                                        <>
                                            <button onClick={() => handleEditClick(tree)}>Editar</button>
                                            <button
                                                className="delete-button" onClick={() => handleDeleteTree(tree.id)} disabled={loadingDeleteId === tree.id}
                                            >
                                                {loadingDeleteId === tree.id ? "Excluindo..." : "Excluir"}
                                            </button>
                                        </>
                                    ) : (
                                        /* Usuários sem permissão só podem reportar problemas */
                                        <div className="readonly-actions">
                                            <FaLock title="Você não pode editar ou excluir esta árvore" style={{ color: 'gray', marginRight: '8px' }} />
                                            <button className="report-button" onClick={() => handleReportClick(tree.id)}>Reportar problema</button>
                                        </div>
                                    )}
                                </td>



                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            {/* Modal para reportar problema */}
            {showReportModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Reportar Problema</h2>
                        <textarea
                            value={reportText}
                            onChange={(e) => setReportText(e.target.value)}
                            placeholder="Descreva o problema encontrado..."
                        />
                        <div className="modal-actions">
                            <button className="send-button" onClick={handleSendReport} disabled={loading}>
                                {loading ? "Enviando..." : "Enviar"}
                            </button>
                            <button className="cancel-button" onClick={handleCloseModal}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Popup genérico de sucesso */}
            {successMessage && (
                <div className="success-overlay">
                    <div className="success-message">
                        <h2>{successMessage}</h2>
                        <button onClick={() => setSuccessMessage('')}>Fechar</button>
                    </div>
                </div>
            )}

            {/* Popup de sucesso para exclusão */}
            {showSuccessDelete && (
                <div className="delete-success-overlay">
                    <div className="delete-success-message">
                        <h2>Árvore deletada com sucesso!</h2>
                        <button onClick={() => setShowSuccessDelete(false)}>Fechar</button>
                    </div>
                </div>

            )}

            {/* Popup de sucesso para edição */}
            {showSuccessEdit && (
                <div className="action-success-overlay">
                    <div className="action-success-message">
                        <h2>Árvore editada com sucesso!</h2>
                        <button onClick={() => setShowSuccessEdit(false)}>Fechar</button>
                    </div>
                </div>
            )}

            {/* Modal que mostra a localização completa */}
            {showLocationModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Localização Completa</h2>
                        <p style={{ wordBreak: 'break-word' }}>{selectedLocation}</p>
                        <div className="modal-actions">
                            <button className="cancel-button" onClick={() => setShowLocationModal(false)}>
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Monitoring;