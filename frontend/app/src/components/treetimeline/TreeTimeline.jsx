import { useState, useEffect } from "react";
import { FaCamera, FaSpinner, FaTrash, FaLock } from "react-icons/fa";
import { toast } from "react-toastify";
import { uploadTreePhoto } from "../../services/storageService";
import { api } from "../../services/api";
import styles from "./TreeTimeline.module.css";

// Recebe treeOwnerId via props
const TreeTimeline = ({ treeId, treeOwnerId }) => {
    const [uploading, setUploading] = useState(false);
    const [entries, setEntries] = useState([]);
    const [description, setDescription] = useState("");
    const [loadingData, setLoadingData] = useState(true);

    // Pega dados do usuário logado
    const user = JSON.parse(localStorage.getItem("@Auth:user"));

    // Lógica de Permissão: É Admin OU É o Dono da árvore
    // Nota: user.isAdmin pode vir como string ou boolean dependendo do banco, o !! garante boolean
    const canEdit = user && (user.isAdmin || user.id === treeOwnerId);

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
        // Atualiza o localStorage para persistir se der F5
        const storedUser = JSON.parse(localStorage.getItem("@Auth:user"));
        if (storedUser) {
            storedUser.saldo = newSaldo;
            localStorage.setItem("@Auth:user", JSON.stringify(storedUser));

            // O GRANDE TRUQUE: Dispara um evento global que o Header vai ouvir
            window.dispatchEvent(new Event("balanceUpdated"));
        }
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
                note: description || "Registro de crescimento.",
                date: new Date().toISOString(),
                userId: user.id // Enviamos quem está tentando postar para o backend validar
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
            // Se o backend bloquear, mostra o erro aqui
            toast.error(error.response?.data?.msg || "Erro ao salvar registro.");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Tem certeza que deseja apagar essa lembrança?")) return;

        try {
            // Agora pegamos a resposta 'data' do axios
            const { data } = await api.delete(`/timeline/${id}`, { data: { userId: user.id } });

            // Remove da lista visual
            setEntries(entries.filter(entry => entry.id !== id));

            // CORREÇÃO: Usa o saldo que veio do servidor (Fonte da Verdade)
            // Se newBalance não for null/undefined, significa que o saldo mudou.
            if (data.newBalance !== undefined && data.newBalance !== null) {
                // Só atualiza se eu for o dono (para não bugar saldo de admin moderando)
                if (user.id === treeOwnerId) {
                    updateLocalBalance(data.newBalance);
                }
            }

            toast.success(data.msg); // Usa a mensagem do servidor
        } catch (error) {
            toast.error(error.response?.data?.msg || "Erro ao excluir.");
        }
    };

    if (loadingData) return <p style={{ padding: '20px' }}>Carregando histórico...</p>;

    return (
        <div className={styles.timelineContainer}>

            {/* 1. SÓ MOSTRA O CARD DE UPLOAD SE TIVER PERMISSÃO */}
            {canEdit ? (
                <div className={styles.uploadCard}>
                    <textarea
                        placeholder="Escreva uma observação..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className={styles.noteInput}
                    />
                    <label className={styles.uploadBtn}>
                        {uploading ? <FaSpinner className="icon-spin" /> : <FaCamera />}
                        <span>{uploading ? "Salvando..." : "Adicionar Foto"}</span>
                        <input type="file" accept="image/*" onChange={handleFileChange} hidden disabled={uploading} />
                    </label>
                </div>
            ) : (
                <div className={styles.permissionWarning}>
                    <FaLock size={24} style={{ opacity: 0.6 }} />
                    <p>Modo Visualização: Apenas o dono pode adicionar registros.</p>
                </div>
            )}

            {/* LINHA DO TEMPO */}
            <div className={styles.timeline}>
                {entries.length === 0 && <p style={{ color: '#888' }}>Nenhum registro ainda.</p>}

                {entries.map((entry) => (
                    <div key={entry.id} className={styles.timelineItem}>

                        <div className={styles.itemHeader}>
                            <div className={styles.timelineDate}>
                                {new Date(entry.date).toLocaleDateString('pt-BR')}
                            </div>

                            {/* 2. SÓ MOSTRA O BOTÃO DE EXCLUIR SE TIVER PERMISSÃO */}
                            {canEdit && (
                                <button
                                    onClick={() => handleDelete(entry.id)}
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
                ))}
            </div>
        </div>
    );
};

export default TreeTimeline;