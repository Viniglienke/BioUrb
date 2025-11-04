import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Axios from "axios";
import { FaUser, FaTree, FaCalendarAlt, FaHeartbeat, FaMapMarkerAlt } from "react-icons/fa";
import { format, isAfter, parseISO, isValid } from "date-fns";
import './Trees.css';

const Trees = () => {
    // Estado que armazena os valores do formulário
    const [values, setValues] = useState({
        usuName: "",
        treeName: "",
        plantingDate: "",
        lifecondition: "",
        location: ""
    });

    // Controle da exibição do popup de sucesso
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);

    // Hook para redirecionamento de rotas
    const navigate = useNavigate();

    // Estado que armazena o ID do usuário logado
    const [usuarioId, setUsuarioId] = useState(null);

    // Referência ao campo de localização (textarea)
    const locationRef = useRef(null);

    // Controla o tipo do input da data (para mudar de "text" para "date" ao focar)
    const [dateInputType, setDateInputType] = useState("text");

    // Recupera os dados do usuário autenticado do localStorage ao montar o componente
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("@Auth:user"));
        if (user) {
            setValues((prev) => ({
                ...prev,
                usuName: user.nome
            }));
            setUsuarioId(user.id);
        }
    }, []);

    // Ajusta a altura do textarea conforme o texto digitado
    const adjustTextareaHeight = () => {
        const el = locationRef.current;
        if (el) {
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
        }
    };

    // Executa o ajuste da altura do textarea ao carregar o componente
    useEffect(() => {
        adjustTextareaHeight();
    }, []);

    // Atualiza o estado com os valores digitados nos campos
    const handleChange = (e) => {
        setValues((prevValues) => ({
            ...prevValues,
            [e.target.name]: e.target.value
        }));

        // Se for o campo localização, ajusta a altura
        if (e.target.name === "location") {
            adjustTextareaHeight();
        }
    };

    // Muda o input da data para "date" ao focar
    const handleFocusDate = () => {
        setDateInputType("date");
    };

    // Volta o input para "text" se o campo estiver vazio ao perder o foco
    const handleBlurDate = () => {
        if (!values.plantingDate) {
            setDateInputType("text");
        }
    };

    // Função executada ao enviar o formulário
    const handleSubmit = (e) => {
        e.preventDefault();

        try {
            const dataSelecionada = parseISO(values.plantingDate);
            const hoje = new Date();

            // Verifica se a data é válida e se não está no futuro
            if (!isValid(dataSelecionada)) {
                alert("Por favor, insira uma data de plantio válida no formato DD-MM-AAAA.");
                return;
            }
            if (isAfter(dataSelecionada, hoje)) {
                alert("A data de plantio não pode ser no futuro.");
                return;
            }

            // Envia os dados para a API
            Axios.post(`${process.env.REACT_APP_API_URL}/trees`, {
                usuName: values.usuName,
                treeName: values.treeName,
                plantingDate: format(dataSelecionada, "yyyy-MM-dd"),
                lifecondition: values.lifecondition,
                location: values.location,
                usuario_id: usuarioId
            })
                .then(() => setShowSuccessPopup(true))
                .catch((error) => {
                    console.error("Erro ao registrar árvore:", error);
                    alert("Erro ao registrar árvore. Verifique o console para mais detalhes.");
                });
        } catch (error) {
            alert("Erro inesperado ao processar a data.");
            console.error("Erro no try-catch do handleSubmit:", error);
        }
    };

    // Fecha o popup de sucesso e redireciona para a tela de monitoramento
    const handleClosePopup = () => {
        setShowSuccessPopup(false);
        navigate("/monitoring");
    };

    // Define o valor máximo permitido para o campo de data (hoje)
    const maxDate = new Date().toISOString().split("T")[0];

    // Retorno visual (JSX)
    return (
        <>
            <div className="container">
                <form onSubmit={handleSubmit}>
                    <h1>Registrar Árvore</h1>

                    <div className="input-field">
                        <FaUser className="input-icon" />
                        <input
                            type="text"
                            placeholder="Nome do Registrante"
                            required
                            id="usuName"
                            name="usuName"
                            value={values.usuName}
                            onChange={handleChange}
                            readOnly
                        />
                    </div>

                    <div className="input-field">
                        <FaTree className="input-icon" />
                        <input
                            type="text"
                            placeholder="Nome Científico da Árvore"
                            required
                            id="treeName"
                            name="treeName"
                            value={values.treeName}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="input-field">
                        <FaCalendarAlt className="input-icon" />
                        <input
                            type={dateInputType}
                            placeholder="Data de Plantio"
                            required
                            id="plantingDate"
                            name="plantingDate"
                            value={values.plantingDate}
                            onChange={handleChange}
                            max={maxDate}
                            onFocus={handleFocusDate}
                            onBlur={handleBlurDate}
                        />
                    </div>

                    <div className="input-field">
                        <FaHeartbeat className="input-icon" />
                        <select
                            required
                            id="lifecondition"
                            name="lifecondition"
                            value={values.lifecondition}
                            onChange={handleChange}
                        >
                            <option value="" disabled>Saúde da Árvore</option>
                            <option value="Saudável">Saudável</option>
                            <option value="Doente">Doente</option>
                            <option value="Morrendo">Morrendo</option>
                        </select>
                    </div>

                    <div className="input-field">
                        <FaMapMarkerAlt
                            className="input-icon " style={{
                                position: 'absolute', top: '20px', left: '10px', color: '#555'
                            }}
                        />
                        <textarea
                            id="location"
                            name="location"
                            placeholder="Localização"
                            required
                            rows={1}
                            value={values.location}
                            onChange={handleChange}
                            ref={locationRef}
                            style={{
                                width: '100%',
                                padding: '10px 15px 10px 40px',
                                color: '#155802',
                                overflow: 'hidden',
                                resize: 'none'
                            }}
                        />
                    </div>

                    <button type="submit">Registrar Árvore</button>
                </form>
            </div>

            {showSuccessPopup && (
                <div className="success-popup-overlay">
                    <div className="success-popup">
                        <h2>Árvore registrada com sucesso!</h2>
                        <button onClick={handleClosePopup}>OK</button>
                    </div>
                </div>
            )}
        </>
    );
};

export default Trees;