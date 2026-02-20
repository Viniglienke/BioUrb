import React, { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUser, FaTree, FaCalendarAlt, FaHeartbeat, FaMapMarkerAlt,
  FaLeaf, FaGlobeAmericas, FaLock, FaMap, FaUsers
} from "react-icons/fa";
import { format, isAfter, parseISO, isValid } from "date-fns";
import { toast } from "react-toastify";
import { api } from "../../../services/api";
import "./Trees.css";
import FormBase from "../../../components/FormBase/FormBase";
import { AuthContext } from "../../../context/AuthContext";
import LocationPicker from "../../../components/locationpicker/LocationPicker";

const Trees = () => {
  const { updateUserData, user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Estado para controlar o loading do GPS visualmente
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const locationRef = useRef(null);
  const [areas, setAreas] = useState([]);

  const [values, setValues] = useState({
    usuName: "",
    treeName: "",
    popularName: "",
    plantingDate: "",
    lifecondition: "",
    location: "",
    areaVerdeId: "",
    visibilidade: "publica",
    latitude: null,
    longitude: null,
  });

  /* ===============================
     LOAD DATA
  ================================ */
  useEffect(() => {
    // Tenta pegar do contexto primeiro, se não, vai no storage
    const storedUser = JSON.parse(localStorage.getItem("@Auth:user"));
    const currentUser = user || storedUser;

    if (currentUser) {
      setValues((prev) => ({ ...prev, usuName: currentUser.nome }));
    }

    fetchAreas(currentUser?.id);
  }, [user]);

  const fetchAreas = async (userId) => {
    if (!userId) return;
    try {
      const response = await api.get(`/areas?userId=${userId}`);
      const areasData = Array.isArray(response.data) ? response.data : response.data.areas || [];
      setAreas(areasData);
    } catch {
      console.error("Erro ao buscar áreas");
      setAreas([]);
    }
  };

  /* ===============================
     LÓGICA GPS E MAPA
  ================================ */
  // Helper para Promessificar o GPS
  const getPosition = (options) => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  };

  const handleGetLocation = async () => {
    if (isLoadingLocation) return; // Evita duplo clique

    setIsLoadingLocation(true);
    const toastId = toast.loading("Buscando localização...");

    if (!navigator.geolocation) {
      toast.update(toastId, { render: "Navegador sem suporte a GPS.", type: "error", isLoading: false, autoClose: 3000 });
      setIsLoadingLocation(false);
      return;
    }

    try {
      // TENTATIVA 1: Alta Precisão (GPS) - Timeout de 5s
      const pos = await getPosition({ enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
      updateFormWithLocation(pos, toastId);

    } catch (err) {
      console.warn("GPS preciso falhou. Tentando Wi-Fi...");

      try {
        // TENTATIVA 2: Baixa Precisão (Wi-Fi/IP) - Timeout de 10s
        const pos = await getPosition({ enableHighAccuracy: false, timeout: 10000, maximumAge: 0 });
        updateFormWithLocation(pos, toastId);

      } catch (err2) {
        console.error("Erro GPS Final:", err2);

        let msg = "Não foi possível obter localização.";
        if (err2.code === 1) msg = "Permissão negada pelo usuário/navegador.";
        if (err2.code === 3) msg = "Sinal demorou muito. Tente digitar ou usar o Mapa.";

        toast.update(toastId, { render: msg, type: "error", isLoading: false, autoClose: 4000 });
        setIsLoadingLocation(false);
      }
    }
  };

  const updateFormWithLocation = (pos, toastId) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    setValues(prev => ({
      ...prev,
      location: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`, // Texto limpo desde o início
      latitude: lat,
      longitude: lng
    }));

    toast.update(toastId, { render: "Localização encontrada!", type: "success", isLoading: false, autoClose: 2000 });
    setIsLoadingLocation(false);

    // Ajusta altura do textarea se necessário
    setTimeout(adjustTextareaHeight, 100);
  };

  const handleLocationPicked = (data) => {
    // Se vier com o nome genérico, ignora e usa só Lat/Lng. Se vier nome de rua, mantém a rua + Lat/Lng
    let cleanAddress = data.addressText;
    if (!cleanAddress || cleanAddress.includes("Localização") || cleanAddress.includes("Clique")) {
      cleanAddress = "";
    }

    const locText = cleanAddress
      ? `${cleanAddress} - Lat: ${data.lat.toFixed(5)}, Lng: ${data.lng.toFixed(5)}`
      : `Lat: ${data.lat.toFixed(5)}, Lng: ${data.lng.toFixed(5)}`;

    setValues(prev => ({
      ...prev,
      location: locText,
      latitude: data.lat,
      longitude: data.lng
    }));

    setShowMapPicker(false);
    toast.success("Localização atualizada pelo mapa!");
  };

  /* ===============================
     OUTROS HANDLERS
  ================================ */
  const adjustTextareaHeight = () => {
    if (locationRef.current) {
      locationRef.current.style.height = "auto";
      locationRef.current.style.height = locationRef.current.scrollHeight + "px";
    }
  };

  const handleChange = (e) => {
    let { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (name === "location") adjustTextareaHeight();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const dataSelecionada = parseISO(values.plantingDate);
    // Ajuste para evitar problema de timezone bloqueando o dia de hoje
    const adjustedDate = new Date(dataSelecionada.getTime() + dataSelecionada.getTimezoneOffset() * 60000);
    const hoje = new Date();

    if (!values.plantingDate || !isValid(dataSelecionada)) return toast.error("Data inválida.");
    if (isAfter(adjustedDate, hoje)) return toast.error("Data não pode ser futura.");

    // Pega ID do usuário (Contexto ou Storage)
    const storedUser = JSON.parse(localStorage.getItem("@Auth:user"));
    const currentUserId = user?.id || storedUser?.id;

    if (!currentUserId) return toast.error("Usuário não identificado. Faça login novamente.");

    try {
      const payload = {
        ...values,
        plantingDate: format(dataSelecionada, "yyyy-MM-dd"),
        areaVerdeId: values.areaVerdeId || null,
        usuario_id: currentUserId,
      };

      const response = await api.post("/trees", payload);

      // Atualiza saldo (Gamificação)
      if (response.data.newBalance !== undefined) {
        updateUserData({ saldo: response.data.newBalance });
        toast.success(`Árvore registrada! +50 moedas!`);
      } else {
        const currentBalance = user?.saldo || 0;
        updateUserData({ saldo: currentBalance + 50 });
        toast.success("Árvore cadastrada com sucesso!");
      }

      navigate("/monitoring");
    } catch (error) {
      console.error("Erro submit:", error);
      const msg = error.response?.data?.msg || "Erro ao registrar árvore.";
      toast.error(msg);
    }
  };

  const maxDate = new Date().toISOString().split("T")[0];

  /* ===============================
     RENDER
  ================================ */
  return (
    <FormBase
      title="Registrar Árvore"
      subtitle="Cadastre uma nova árvore no sistema"
      onSubmit={handleSubmit}
    >
      <div className="trees-form-content">

        {/* PRIVACIDADE */}
        <div className="visibility-group">
          <label className="section-label">Tipo de Registro</label>
          <div className="visibility-options" style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>

            <div className={`vis-option vis-privada ${values.visibilidade === 'privada' ? 'selected' : ''}`} onClick={() => setValues(prev => ({ ...prev, visibilidade: 'privada' }))} style={{ flex: 1, minWidth: '100px', fontSize: '0.85rem' }}>
              <FaLock /> Privada
            </div>

            <div className={`vis-option vis-publica ${values.visibilidade === 'publica' ? 'selected' : ''}`} onClick={() => setValues(prev => ({ ...prev, visibilidade: 'publica' }))} style={{ flex: 1, minWidth: '100px', fontSize: '0.85rem' }}>
              <FaGlobeAmericas /> Pública
            </div>

            <div className={`vis-option vis-comunidade ${values.visibilidade === 'comunidade' ? 'selected' : ''}`} onClick={() => setValues(prev => ({ ...prev, visibilidade: 'comunidade' }))} style={{ flex: 1, minWidth: '100px', fontSize: '0.85rem' }}>
              <FaUsers /> Comunidade
            </div>

          </div>

          <small className="vis-hint" style={{ display: 'block', marginTop: '10px', height: '30px' }}>
            {values.visibilidade === 'privada' && "Apenas você pode ver e gerenciar esta árvore."}
            {values.visibilidade === 'publica' && "Todos veem no mapa, mas só você adiciona registros."}
            {values.visibilidade === 'comunidade' && "Aberta a todos. Qualquer pessoa que visitar o local poderá adicionar registros."}
          </small>
        </div>

        {/* LINHA 1 */}
        <div className="form-row">
          <div className="form-group">
            <label>Registrado por</label>
            <div className="input-wrapper disabled">
              <FaUser className="input-icon" />
              <input type="text" value={values.usuName} readOnly />
            </div>
          </div>

          <div className="form-group">
            <label>Área Verde</label>
            <div className="input-wrapper">
              <FaGlobeAmericas className="input-icon" />
              <select name="areaVerdeId" value={values.areaVerdeId} onChange={handleChange}>
                <option value="">Selecione uma área (Opcional)</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>{area.nome}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* LINHA 2 */}
        <div className="form-row">
          <div className="form-group">
            <label>Nome Científico</label>
            <div className="input-wrapper">
              <FaTree className="input-icon" />
              <input
                type="text" name="treeName"
                placeholder="Ex: Araucaria angustifolia"
                required onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Nome Popular</label>
            <div className="input-wrapper">
              <FaLeaf className="input-icon" />
              <input
                type="text" name="popularName"
                placeholder="Ex: Pinheiro-do-paraná"
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* LINHA 3 */}
        <div className="form-row">
          <div className="form-group">
            <label>Data de Plantio</label>
            <div className="input-wrapper">
              <FaCalendarAlt className="input-icon" />
              <input
                type="date" name="plantingDate"
                max={maxDate} required onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Saúde</label>
            <div className="input-wrapper">
              <FaHeartbeat className="input-icon" />
              <select name="lifecondition" required onChange={handleChange} value={values.lifecondition}>
                <option value="" disabled>Selecione o estado</option>
                <option value="Saudável">Saudável</option>
                <option value="Doente">Doente</option>
                <option value="Morrendo">Morrendo</option>
              </select>
            </div>
          </div>
        </div>

        {/* LINHA 4 - LOCALIZAÇÃO */}
        <div className="form-group">
          <label>
            Localização
          </label>

          <div className="input-wrapper">
            <FaMapMarkerAlt className="input-icon icon-top" />
            <textarea
              name="location"
              className="input-with-actions"
              value={values.location}
              placeholder="Clique no botão de GPS ou Mapa para preencher automaticamente..."
              required
              ref={locationRef}
              rows={2}
              onChange={handleChange}
            />

            {/* BOTÃO GPS COM LOADING */}
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={isLoadingLocation}
              className="btn-input-action btn-action-gps"
              title="Detectar minha localização atual"
              style={{ cursor: isLoadingLocation ? 'wait' : 'pointer' }}
            >
              {isLoadingLocation ? (
                <div className="spinner-small"></div>
              ) : (
                <FaMapMarkerAlt size={12} />
              )}
            </button>

            {/* BOTÃO MAPA */}
            <button
              type="button"
              onClick={() => setShowMapPicker(true)}
              disabled={isLoadingLocation}
              className="btn-input-action btn-action-map"
              title="Selecionar local no mapa"
            >
              <FaMap size={12} />
            </button>
          </div>

          <small style={{ fontSize: '0.75rem', color: '#555', marginTop: '6px', display: 'block', lineHeight: '1.4' }}>
            <strong style={{ color: '#e65100' }}>Atenção:</strong> Para que esta árvore apareça no <strong>Mapa Interativo</strong>, as coordenadas são obrigatórias.
            <br />
            Se o GPS não preencher automaticamente, utilize o botão do <strong>Mapa</strong> ao lado para selecionar o local.
          </small>
        </div>

        {/* MODAL DO MAPA (com z-index forçado) */}
        {showMapPicker && (
          <div style={{ position: 'relative', zIndex: 99999 }}>
            <LocationPicker
              onClose={() => setShowMapPicker(false)}
              onConfirm={handleLocationPicked}
              initialPosition={values.latitude ? { lat: values.latitude, lng: values.longitude } : null}
            />
          </div>
        )}

        <button type="submit" className="btn-submit-tree" disabled={isLoadingLocation}>
          Registrar Árvore
        </button>
      </div>

      <style>{`
        .spinner-small {
          width: 12px; height: 12px;
          border: 2px solid #fff;
          border-top: 2px solid transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </FormBase>
  );
};

export default Trees;