import { useState, useRef, useEffect, useContext } from "react";
import { FaPaperPlane, FaTimes } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import { api } from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import styles from "./Urbaninho.module.css";
import mascotImg from "../../img/urbaninho-avatar.svg";


const Urbaninho = () => {
    // PEGA O ESTADO DE LOGIN
    const { signed } = useContext(AuthContext);

    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    const [messages, setMessages] = useState([
        { role: "model", text: "Olá! Sou o Urbaninho, seu assistente ecológico! 🌳 Como posso ajudar suas plantas hoje?" }
    ]);

    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;
        const userMsg = input;
        setInput("");

        // Adiciona a mensagem do usuário na tela imediatamente
        setMessages(prev => [...prev, { role: "user", text: userMsg }]);
        setLoading(true);

        try {
            // 1. Removemos a primeira mensagem (a saudação do Urbaninho) do histórico
            // pois a API do Google exige que o histórico comece com 'user'.
            const cleanHistory = messages.slice(1);

            // 2. Formatamos para a API (limitando às últimas 6 mensagens para contexto)
            const historyForApi = cleanHistory.slice(-6).map(msg => ({
                role: msg.role === "user" ? "user" : "model",
                parts: [{ text: msg.text }]
            }));

            const { data } = await api.post("/chat", {
                message: userMsg,
                history: historyForApi
            });

            setMessages(prev => [...prev, { role: "model", text: data.reply }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: "model", text: "Ops, minha conexão com a natureza falhou. Tente de novo! 🍂" }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSend();
    };

    // Se não estiver logado, não retorna NADA (o componente some)
    if (!signed) return null;

    return (
        <div className={`${styles.urbaninhoContainer} ${isOpen ? styles.openState : ''}`}>
            {/* 1. NOVO BOTÃO DO MASCOTE (Apenas a "foto") */}
            {!isOpen && (
                <button className={styles.mascotFab} onClick={() => setIsOpen(true)}>
                    <div className={styles.pulseRing}></div>
                    <img src={mascotImg} alt="Urbaninho" className={styles.mascotFabImg} />
                </button>
            )}

            {/* JANELA DO CHAT MODERNIZADA */}
            {isOpen && (
                <div className={styles.chatWindow}>
                    {/* 2. CABEÇALHO COM MASCOTE MAIOR */}
                    <div className={styles.header}>
                        <div className={styles.headerBrand}>
                            <img src={mascotImg} alt="Mascote" className={styles.mascotHeaderImg} />
                            <div>
                                <h3>Urbaninho</h3>
                                <span className={styles.status}>Online e pronto para ajudar! 💚</span>
                            </div>
                        </div>
                        <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
                            <FaTimes />
                        </button>
                    </div>

                    <div className={styles.body}>
                        {messages.map((msg, index) => (
                            <div key={index} className={msg.role === "user" ? styles.userRow : styles.botRow}>
                                {/* 3. MINIATURA DO MASCOTE NAS MENSAGENS DO ROBÔ */}
                                {msg.role === "model" && (
                                    <img src={mascotImg} alt="Bot" className={styles.tinyMascot} />
                                )}
                                <div className={`${styles.message} ${msg.role === "user" ? styles.userBubble : styles.botBubble}`}>
                                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className={styles.botRow}>
                                <img src={mascotImg} alt="Bot" className={styles.tinyMascot} />
                                <div className={`${styles.message} ${styles.botBubble}`}>
                                    <span className={styles.typing}>Digitando...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className={styles.footer}>
                        <input
                            type="text"
                            placeholder="Digite sua dúvida..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyPress}
                            disabled={loading}
                        />
                        <button className={styles.sendBtn} onClick={handleSend} disabled={loading || !input.trim()}>
                            <FaPaperPlane />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Urbaninho;