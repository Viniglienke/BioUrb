import React, { useState, useRef, useEffect, useCallback } from 'react';
import { QrReader } from 'react-qr-reader';
import { api } from '../../../services/api';
import { FaArrowLeft, FaCheckCircle, FaTimesCircle, FaCamera, FaBoxOpen, FaBan, FaKeyboard, FaQrcode } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import styles from './Scanner.module.css';

// 1. DEFINIÇÃO ESTÁTICA (Fora do componente para não recriar a cada render)
const QR_CONSTRAINTS = { facingMode: 'environment' };

const Scanner = () => {
    const navigate = useNavigate();

    // --- ESTADOS ---
    const [scannerState, setScannerState] = useState('idle');
    const [itemDetails, setItemDetails] = useState(null);
    const [message, setMessage] = useState("Aponte a câmera para o QR Code");
    const [resultStatus, setResultStatus] = useState(null);
    const [isManualMode, setIsManualMode] = useState(false);
    const [manualInput, setManualInput] = useState("");

    // --- REFS ---
    const lastScannedCode = useRef(null);
    const isProcessing = useRef(false);

    useEffect(() => {
        return () => {
            isProcessing.current = false;
            lastScannedCode.current = null;
        };
    }, []);

    // --- FUNÇÃO DE PROCESSAMENTO ---
    const processCode = useCallback(async (codigo) => {
        if (isProcessing.current) return;

        console.log("Validando:", codigo);
        isProcessing.current = true;

        setScannerState('checking');
        setMessage("Verificando código...");

        try {
            const { data } = await api.post("/inventory/check", { codigo });
            setItemDetails(data.item);
            setMessage(data.msg);
            setScannerState('confirming');
            playBeep('neutral');
        } catch (err) {
            setResultStatus('error');
            const errorMsg = err.response?.data?.msg || "Erro ao validar código.";
            setMessage(errorMsg);
            if (err.response?.data?.item) setItemDetails(err.response?.data?.item);
            setScannerState('result');
            playBeep('error');
        }
    }, []); // Dependências vazias = função nunca muda

    // --- 2. CALLBACK ESTABILIZADO ---
    // Usamos useCallback para que o QrReader não ache que a função mudou e reinicie o vídeo
    const handleScan = useCallback((result, error) => {
        if (!result?.text) return;
        if (isProcessing.current) return;

        // Validação de Formato (deve ter 8 chars)
        if (result.text.length !== 8) {
            // Opcional: toast.warning("Formato de código inválido");
            // Retorna sem travar o scanner para não ficar apitando em QR code errado
            return;
        }

        if (result.text === lastScannedCode.current) return;

        lastScannedCode.current = result.text;
        processCode(result.text);
    }, [processCode]);

    // --- RESTO DAS FUNÇÕES ---
    const handleConfirmRedeem = async () => {
        const codigoParaBaixar = lastScannedCode.current || manualInput.toUpperCase();
        if (!codigoParaBaixar) return;

        setMessage("Finalizando entrega...");
        try {
            const { data } = await api.post("/inventory/redeem", { codigo: codigoParaBaixar });
            setResultStatus('success');
            setMessage(data.msg);
            setScannerState('result');
            playBeep('success');
        } catch (err) {
            setResultStatus('error');
            setMessage(err.response?.data?.msg || "Erro ao confirmar entrega.");
            setScannerState('result');
            playBeep('error');
        }
    };

    const resetScanner = () => {
        setScannerState('idle');
        setResultStatus(null);
        setItemDetails(null);
        setMessage(isManualMode ? "Digite o código abaixo" : "Aponte a câmera para o QR Code");
        setManualInput("");
        isProcessing.current = false;
        setTimeout(() => { lastScannedCode.current = null; }, 2000);
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (!manualInput.trim()) return;
        const codigo = manualInput.trim().toUpperCase();
        lastScannedCode.current = codigo;
        processCode(codigo);
    };

    const toggleMode = () => {
        setIsManualMode(prev => !prev); // Jeito seguro de alternar estado
        // Pequeno delay para garantir que o estado atualizou antes de resetar visualmente
        setTimeout(() => resetScanner(), 50);
    };

    const playBeep = (type) => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = type === 'success' ? 1000 : (type === 'error' ? 200 : 600);
            osc.type = 'sine';
            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.2);
            setTimeout(() => { osc.stop(); ctx.close(); }, 200);
        } catch (e) { console.error("Erro de áudio (ignorar)", e); }
    };

    // Variável simples para controle visual
    const showCamera = !isManualMode;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button onClick={() => navigate('/')} className={styles.backBtn}>
                    <FaArrowLeft /> Voltar
                </button>
                <h2>Validador BioUrb</h2>
            </div>

            <div className={styles.cameraWrapper}>

                {showCamera && (
                    <div className={styles.cameraOverlay} style={{ opacity: scannerState === 'idle' || scannerState === 'checking' ? 1 : 0.3 }}>
                        <QrReader
                            onResult={handleScan}
                            constraints={QR_CONSTRAINTS} /* USANDO A CONSTANTE ESTÁTICA */
                            className={styles.qrReader}
                            scanDelay={500}
                        />
                    </div>
                )}

                {/* MOLDURA VISUAL */}
                {showCamera && (scannerState === 'idle' || scannerState === 'checking') && (
                    <>
                        <div className={`${styles.scanFrame} ${scannerState === 'checking' ? styles.pulsing : ''}`}></div>
                        <p className={styles.instruction}>
                            {scannerState === 'checking' ? 'Processando...' : 'Enquadre o QR Code no quadrado'}
                        </p>
                    </>
                )}

                {/* MODAL MANUAL */}
                {isManualMode && (
                    <div className={styles.manualCard}>
                        <h3>Digitação Manual</h3>
                        <p>Insira o código:</p>
                        <form onSubmit={handleManualSubmit}>
                            <input
                                type="text"
                                className={styles.manualInput}
                                placeholder="A1B2-C3D4"
                                value={manualInput}
                                onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                                autoFocus
                            />
                            <button type="submit" className={styles.verifyBtn} disabled={!manualInput}>Verificar</button>
                        </form>
                    </div>
                )}

                {/* MODAL CONFIRMAÇÃO */}
                {scannerState === 'confirming' && itemDetails && (
                    <div className={styles.modalCard}>
                        <div className={styles.modalHeader}>
                            <FaBoxOpen className={styles.modalIcon} />
                            <h3>Confirmar Entrega?</h3>
                        </div>
                        <div className={styles.itemDetailsBox}>
                            <p><strong>Item:</strong> {itemDetails.nome_item}</p>
                            <p><strong>Usuário:</strong> {itemDetails.nome_usuario || itemDetails.usuario_nome}</p>
                            <small>Cód: {itemDetails.codigo_resgate}</small>
                        </div>
                        <div className={styles.actionButtons}>
                            <button onClick={handleConfirmRedeem} className={styles.confirmBtn}>
                                <FaCheckCircle /> Confirmar Entrega
                            </button>
                            <button onClick={resetScanner} className={styles.cancelBtn}>
                                <FaBan /> Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {/* MODAL RESULTADO */}
                {scannerState === 'result' && (
                    <div className={`${styles.resultCard} ${styles[resultStatus]}`}>
                        <div className={styles.iconWrapper}>
                            {resultStatus === 'success' ? <FaCheckCircle /> : <FaTimesCircle />}
                        </div>
                        <h3>{resultStatus === 'success' ? 'SUCESSO!' : 'ERRO!'}</h3>
                        <p className={styles.resultMsg}>{message}</p>

                        {resultStatus === 'error' && itemDetails && (
                            <div className={styles.errorDetails}>
                                <strong>Item:</strong> {itemDetails.nome_item || itemDetails.nome}
                            </div>
                        )}

                        <button onClick={resetScanner} className={styles.newScanBtn}>
                            <FaCamera /> Ler Novo Código
                        </button>
                    </div>
                )}

                {/* BOTÃO ALTERNAR MODO */}
                {scannerState === 'idle' && (
                    <button onClick={toggleMode} className={styles.toggleModeBtn}>
                        {isManualMode ? <><FaQrcode /> Usar Câmera</> : <><FaKeyboard /> Digitar Código</>}
                    </button>
                )}

            </div>
        </div>
    );
};

export default Scanner;