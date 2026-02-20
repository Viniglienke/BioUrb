import { useState, useEffect } from "react";
import { FaCamera, FaImages, FaSpinner, FaTrash, FaLock, FaMapMarkerAlt, FaUserEdit } from "react-icons/fa";
import { toast } from "react-toastify";
import { uploadTreePhoto } from "../../services/storageService";
import { api } from "../../services/api";
import styles from "./TreeTimeline.module.css";

const TreeTimeline = ({ treeId, treeOwnerId, treeLat, treeLng, treeVisibility }) => {
    const [uploading, setUploading] = useState(false);
    const [verifyingLocation, setVerifyingLocation] = useState(false);
    const [entries, setEntries] = useState([]);
    const [description, setDescription] = useState("");
    const [loadingData, setLoadingData] = useState(true);

    const user = JSON.parse(localStorage.getItem("@Auth:user"));

    // Detecta se é celular ou PC
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    const isOwnerOrAdmin = user && (user.isAdmin || user.id === treeOwnerId);

    // Regra de visualização do painel de Upload
    const canViewUpload = isOwnerOrAdmin || (user && treeVisibility === 'comunidade');

    useEffect(() => {
        const fetchTimeline = async () => {
            try {
                const { data } = await api.get(`/timeline?treeId=${treeId}`);
                setEntries(data);
            } catch (error) {
                console.error("Erro ao carregar diário", error);
            } finally {
                setLoadingData(false);
            }
        };

        if (treeId) {
            fetchTimeline();
        }
    }, [treeId]);

    const updateLocalBalance = (newSaldo) => {
        const storedUser = JSON.parse(localStorage.getItem("@Auth:user"));
        if (storedUser) {
            storedUser.saldo = newSaldo;
            localStorage.setItem("@Auth:user", JSON.stringify(storedUser));
            window.dispatchEvent(new Event("balanceUpdated"));
        }
    };

    // Haversine
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // --- FUNÇÃO QUE SÓ CHAMA O INPUT SE TUDO DER CERTO ---
    const triggerFileInput = (source) => {
        // Mostra o aviso do PC apenas na hora exata de abrir o input
        if (source === 'camera' && !isMobile) {
            toast.info("No computador, esta opção abrirá o explorador de arquivos ou sua webcam.", { autoClose: 4000 });
        }
        document.getElementById(`timeline-file-upload-${source}`).click();
    };

    const handleAddRecordClick = (source) => {
        // Dono e Admin pulam o GPS e vão direto para o Input
        if (isOwnerOrAdmin) {
            triggerFileInput(source);
            return;
        }

        // Validação da Comunidade
        if (!treeLat || !treeLng) {
            toast.error("Árvore sem coordenadas. Impossível validar GPS.");
            return;
        }

        if (!navigator.geolocation) {
            toast.error("Seu navegador não suporta GPS.");
            return;
        }

        setVerifyingLocation(true);
        const toastId = toast.loading("Verificando sua localização exata...");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                if (position.coords.accuracy > 150) {
                    setVerifyingLocation(false);
                    toast.update(toastId, { render: `Sinal de GPS fraco (Margem de erro: ${Math.round(position.coords.accuracy)}m). Vá para um local a céu aberto.`, type: "error", isLoading: false, autoClose: 5000 });
                    return; // Interrompe aqui, não abre input nem aviso de PC
                }

                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                const distance = calculateDistance(userLat, userLng, treeLat, treeLng);
                setVerifyingLocation(false);

                if (distance <= 100) {
                    toast.update(toastId, { render: `Alvo alcançado! (${Math.round(distance)}m). Liberação concedida!`, type: "success", isLoading: false, autoClose: 3000 });

                    // Chama a função que abre o input (e mostra o aviso do PC se for o caso)
                    triggerFileInput(source);
                } else {
                    toast.update(toastId, { render: `Muito longe! Você está a ${Math.round(distance)}m. Aproxime-se (máx 100m).`, type: "error", isLoading: false, autoClose: 6000 });
                }
            },
            (error) => {
                console.error(error);
                setVerifyingLocation(false);
                toast.update(toastId, { render: "Erro ao obter GPS. Ative a localização de alta precisão no seu dispositivo.", type: "error", isLoading: false, autoClose: 5000 });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);

        try {
            const photoUrl = await uploadTreePhoto(file);

            const newEntryData = {
                treeId: treeId,
                photoUrl: photoUrl,
                note: description || "Registro da comunidade.",
                date: new Date().toISOString(),
                userId: user.id
            };

            const { data } = await api.post("/timeline", newEntryData);

            setEntries([data, ...entries]);

            if (data.newBalance !== undefined && data.newBalance !== null) {
                updateLocalBalance(data.newBalance);
            }

            if (data.msg) toast.success(data.msg);
            setDescription("");

        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.msg || "Erro ao salvar registro.");
        } finally {
            setUploading(false);
            e.target.value = null;
        }
    };

    const handleDelete = async (id, entryUserId) => {
        if (!window.confirm("Tem certeza que deseja apagar essa lembrança?")) return;

        try {
            const { data } = await api.delete(`/timeline/${id}`, { data: { userId: user.id } });
            setEntries(entries.filter(entry => entry.id !== id));

            if (data.newBalance !== undefined && data.newBalance !== null) {
                if (user.id === entryUserId) {
                    updateLocalBalance(data.newBalance);
                }
            }

            toast.success(data.msg);
        } catch (error) {
            toast.error(error.response?.data?.msg || "Erro ao excluir.");
        }
    };

    if (loadingData) return <p style={{ padding: '20px' }}>Carregando histórico...</p>;

    return (
        <div className={styles.timelineContainer}>

            {canViewUpload ? (
                <div className={styles.uploadCard}>
                    {!isOwnerOrAdmin && (
                        <div style={{ fontSize: '0.8rem', color: '#f57c00', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(245, 124, 0, 0.1)', padding: '8px', borderRadius: '6px' }}>
                            <FaMapMarkerAlt /> Árvore da Comunidade: Requer GPS ativo (Máx 100m)
                        </div>
                    )}
                    <textarea
                        placeholder="Escreva uma observação..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className={styles.noteInput}
                    />

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            type="button"
                            className={styles.uploadBtn}
                            onClick={() => handleAddRecordClick('camera')}
                            style={{ flex: 1, cursor: verifyingLocation || uploading ? 'wait' : 'pointer', opacity: verifyingLocation || uploading ? 0.7 : 1 }}
                            disabled={uploading || verifyingLocation}
                        >
                            {uploading || verifyingLocation ? <FaSpinner className="icon-spin" /> : <FaCamera />}
                            <span>Câmera</span>
                        </button>

                        <button
                            type="button"
                            className={styles.uploadBtn}
                            onClick={() => handleAddRecordClick('gallery')}
                            style={{ flex: 1, backgroundColor: '#2196f3', cursor: verifyingLocation || uploading ? 'wait' : 'pointer', opacity: verifyingLocation || uploading ? 0.7 : 1 }}
                            disabled={uploading || verifyingLocation}
                        >
                            {uploading || verifyingLocation ? <FaSpinner className="icon-spin" /> : <FaImages />}
                            <span>Galeria</span>
                        </button>
                    </div>

                    <input id="timeline-file-upload-camera" type="file" accept="image/*" capture="environment" onChange={handleFileChange} hidden />
                    <input id="timeline-file-upload-gallery" type="file" accept="image/*" onChange={handleFileChange} hidden />
                </div>
            ) : (
                <div className={styles.permissionWarning}>
                    <FaLock size={24} style={{ opacity: 0.6 }} />
                    <p>
                        {!user
                            ? "Faça login para interagir."
                            : "Esta é uma Árvore Pública. Apenas quem a registrou pode adicionar novas fotos no diário."}
                    </p>
                </div>
            )}

            <div className={styles.timeline}>
                {entries.length === 0 && <p style={{ color: '#888' }}>Nenhum registro ainda.</p>}

                {entries.map((entry) => {
                    const canDeleteEntry = isOwnerOrAdmin || (user && user.id === entry.usuario_id);

                    return (
                        <div key={entry.id} className={styles.timelineItem}>
                            <div className={styles.itemHeader}>
                                <div>
                                    <div className={styles.timelineDate}>
                                        {new Date(entry.date).toLocaleDateString('pt-BR')}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                        <FaUserEdit /> {entry.nome_autor}
                                    </div>
                                </div>

                                {canDeleteEntry && (
                                    <button
                                        onClick={() => handleDelete(entry.id, entry.usuario_id)}
                                        className={styles.deleteBtn}
                                        title="Excluir registro"
                                    >
                                        <FaTrash />
                                    </button>
                                )}
                            </div>
                            <div className={styles.timelinePoint}></div>
                            <div className={styles.timelineContent}>
                                <img src={entry.photoUrl} alt="Registro" />
                                <p>{entry.note}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TreeTimeline;