import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  FaMapMarkedAlt, FaUser, FaInfoCircle, FaLeaf, FaLock,
  FaSearch, FaFilter, FaUndo, FaGlobeAmericas, FaDrawPolygon, FaEraser, FaReply
} from 'react-icons/fa';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { toast } from 'react-toastify';
import { api } from '../../../services/api';
import './Areas.css';

// --- ÍCONE DE VÉRTICE (Bolinha branca) ---
const vertexIcon = new L.DivIcon({
  className: 'vertex-icon',
  html: `<div style="
        background-color: white; 
        width: 14px; height: 14px; 
        border-radius: 50%; 
        border: 2px solid #6b21a8; 
        box-shadow: 0 0 4px rgba(0,0,0,0.5);
        cursor: grab;
    "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// --- COMPONENTE MARCADOR ARRASTÁVEL OTIMIZADO ---
// Adicionamos a prop 'onDrag' para atualizações em tempo real
const DraggableMarker = ({ position, index, onDrag, onDragEnd, onRemove }) => {
  const markerRef = useRef(null);

  const eventHandlers = useMemo(
    () => ({
      // ENQUANTO ARRASTA (Feedback visual instantâneo)
      drag(e) {
        if (onDrag) {
          const { lat, lng } = e.target.getLatLng();
          onDrag(index, [lat, lng]);
        }
      },
      // AO SOLTAR (Atualiza o estado do React)
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const { lat, lng } = marker.getLatLng();
          onDragEnd(index, [lat, lng]);
        }
      },
      // Clique para remover
      click(e) {
        L.DomEvent.stopPropagation(e);
        onRemove(index);
      },
      contextmenu(e) {
        L.DomEvent.stopPropagation(e);
        onRemove(index);
      }
    }),
    [index, onDrag, onDragEnd, onRemove]
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      icon={vertexIcon}
      ref={markerRef}
      riseOnHover={true}
      zIndexOffset={1000}
    />
  );
};

// Controlador de cliques no mapa
const MapEvents = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onMapClick([lat, lng]);
    },
  });
  return null;
};

const Areas = () => {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState('mine');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formData, setFormData] = useState({
    nome: '', descricao: '', localizacao: '', responsavel: '',
    status: 'Ativa', visibilidade: 'publica'
  });

  // --- ESTADO DOS PONTOS ---
  const [polygonPoints, setPolygonPoints] = useState([]);

  // --- REFERÊNCIAS PARA ATUALIZAÇÃO EM TEMPO REAL ---
  // Usamos refs para acessar o polígono/linha do Leaflet diretamente
  const polygonRef = useRef(null);
  const polylineRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("@Auth:user"));
  const [modalMode, setModalMode] = useState("create");
  const [editingAreaId, setEditingAreaId] = useState(null);

  // --- FUNÇÕES DO MAPA ---

  const handleMapClick = useCallback((newPoint) => {
    setPolygonPoints((prev) => [...prev, newPoint]);
  }, []);

  // --- NOVO: FUNÇÃO CHAMADA ENQUANTO ARRASTA (EM TEMPO REAL) ---
  // Atualiza visualmente o polígono sem avisar o React (zero lag)
  const handleMarkerDrag = useCallback((index, newPos) => {
    // Cria a nova lista de pontos baseada no estado atual
    const currentPoints = [...polygonPoints];
    currentPoints[index] = newPos;

    // Atualiza o Polígono instantaneamente
    if (polygonRef.current) {
      polygonRef.current.setLatLngs(currentPoints);
    }
    // Atualiza a Linha tracejada instantaneamente
    if (polylineRef.current) {
      // Precisamos fechar o loop para a linha (adicionar o primeiro ponto no final)
      const linePoints = [...currentPoints];
      if (linePoints.length > 0) {
        linePoints.push(linePoints[0]);
      }
      polylineRef.current.setLatLngs(linePoints);
    }
  }, [polygonPoints]); // Depende dos pontos atuais

  // Função chamada ao SOLTAR o mouse (commit final)
  const handleMarkerDragEnd = useCallback((index, newPos) => {
    setPolygonPoints((prev) => {
      const newPoints = [...prev];
      newPoints[index] = newPos;
      return newPoints;
    });
    // O React vai re-renderizar agora com a posição oficial
  }, []);

  const handleRemovePoint = useCallback((index) => {
    setPolygonPoints((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const undoLastPoint = () => {
    setPolygonPoints(prev => prev.slice(0, -1));
  };

  // --- CRUD ---
  useEffect(() => { fetchAreas(); }, []);

  const fetchAreas = async () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("@Auth:user"));
      const response = await api.get(`/areas?userId=${storedUser?.id}`);
      const data = Array.isArray(response.data) ? response.data : response.data.areas || [];
      setAreas(Array.isArray(data) ? data : []);
    } catch (error) { toast.error("Erro ao carregar"); } finally { setLoading(false); }
  };

  const handleEditArea = (area) => {
    setModalMode("edit");
    setEditingAreaId(area.id);
    let loadedPoints = [];
    if (area.polygon_path) {
      try { loadedPoints = JSON.parse(area.polygon_path); } catch (e) { console.error(e); }
    }
    setPolygonPoints(loadedPoints);
    setFormData({
      nome: area.nome || "", descricao: area.descricao || "", localizacao: area.localizacao || "",
      responsavel: area.responsavel || "", status: area.status || "Ativa", visibilidade: area.visibilidade || "publica"
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome || !formData.localizacao) { toast.error("Preencha os campos obrigatórios"); return; }

    if (polygonPoints.length > 0 && polygonPoints.length < 3) {
      toast.warn("Marque pelo menos 3 pontos para formar uma área fechada.");
      return;
    }

    let lat = null, lng = null;
    if (polygonPoints.length > 0) {
      lat = polygonPoints[0][0]; lng = polygonPoints[0][1];
    }

    const payload = {
      ...formData, usuario_id: user.id, latitude: lat, longitude: lng,
      polygonPath: polygonPoints.length > 0 ? polygonPoints : null
    };

    try {
      if (modalMode === 'edit') { await api.put(`/areas/${editingAreaId}`, payload); toast.success("Atualizado!"); }
      else { await api.post("/areas", payload); toast.success("Cadastrado!"); }
      setShowForm(false); fetchAreas();
    } catch (error) { toast.error("Erro ao salvar"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Excluir?")) return;
    try { await api.delete(`/areas/${id}`); fetchAreas(); toast.success("Excluído"); } catch (e) { toast.error("Erro"); }
  };

  const filteredAreas = areas.filter(area => {
    let matchView = viewMode === 'mine' ? area.usuario_id === user.id : (area.visibilidade === 'publica' || !area.visibilidade);
    if (!matchView) return false;
    const search = searchTerm.toLowerCase();
    return (area.nome.toLowerCase().includes(search) || area.localizacao.toLowerCase().includes(search)) &&
      (statusFilter ? area.status === statusFilter : true);
  });

  const clearFilters = () => { setSearchTerm(''); setStatusFilter(''); };

  return (
    <div className="areas-container">
      <header className="areas-header">
        <h1>Áreas Verdes</h1>
        <p>Gerencie as áreas delimitadas da cidade</p>
        <button className="btn-new-area" onClick={() => {
          setModalMode("create"); setEditingAreaId(null); setPolygonPoints([]);
          setFormData({ nome: "", descricao: "", localizacao: "", responsavel: "", status: "Ativa", visibilidade: "publica" });
          setShowForm(true);
        }}>+ Nova Área Verde</button>
      </header>

      <div className="view-tabs-container">
        <div className="view-tabs">
          <button className={`view-tab ${viewMode === 'mine' ? 'active' : ''}`} onClick={() => { setViewMode('mine'); clearFilters(); }}><FaUser /> Meus Registros</button>
          <button className={`view-tab ${viewMode === 'community' ? 'active' : ''}`} onClick={() => { setViewMode('community'); clearFilters(); }}><FaGlobeAmericas /> Explorar Comunidade</button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-group search-group"><FaSearch className="filter-icon" /><input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
        <div className="filter-group"><FaFilter className="filter-icon" /><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">Todos Status</option><option value="Ativa">Ativa</option><option value="Em Manutenção">Em Manutenção</option><option value="Planejada">Planejada</option></select></div>
        <button className="btn-clear-filters" onClick={clearFilters}><FaUndo /></button>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content area-modal">
            <header className="modal-header">
              <h2>{modalMode === "create" ? "Nova Área Verde" : "Editar Área"}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </header>

            <form onSubmit={handleSubmit} className="area-form">
              <div className="map-draw-section">
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Delimitar Área <span style={{ color: 'red' }}>*</span></span>
                  {polygonPoints.length > 0 && <span style={{ fontSize: '0.8rem', color: '#9333ea', fontWeight: 'bold' }}>{polygonPoints.length} Vértices</span>}
                </label>
                <p className="hint-text">Clique no mapa para adicionar pontos. Arraste as bolinhas brancas para corrigir.</p>

                <div className="mini-map-container">
                  <MapContainer center={[-26.763, -53.167]} zoom={15} style={{ height: '350px', width: '100%', borderRadius: '8px' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapEvents onMapClick={handleMapClick} />

                    {polygonPoints.length > 0 && (
                      <>
                        {/* Adicionamos 'ref={polygonRef}' aqui */}
                        <Polygon
                          ref={polygonRef}
                          positions={polygonPoints}
                          pathOptions={{ color: '#9333ea', fillColor: '#9333ea', fillOpacity: 0.4, weight: 2 }}
                        />
                        {/* Adicionamos 'ref={polylineRef}' aqui */}
                        <Polyline
                          ref={polylineRef}
                          positions={[...polygonPoints, polygonPoints[0]]}
                          pathOptions={{ color: '#9333ea', weight: 1, dashArray: '5, 5', opacity: 0.5 }}
                        />
                      </>
                    )}

                    {polygonPoints.map((pos, idx) => (
                      <DraggableMarker
                        key={`vertex-${idx}`}
                        index={idx}
                        position={pos}
                        onDrag={handleMarkerDrag}       // <--- NOVA PROP
                        onDragEnd={handleMarkerDragEnd} // PROP EXISTENTE
                        onRemove={handleRemovePoint}
                      />
                    ))}
                  </MapContainer>

                  <div className="map-actions">
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button type="button" className="btn-map-action btn-undo" onClick={undoLastPoint} disabled={polygonPoints.length === 0}><FaReply /> Desfazer</button>
                      <button type="button" className="btn-map-action btn-reset" onClick={() => setPolygonPoints([])} disabled={polygonPoints.length === 0}><FaEraser /> Limpar</button>
                    </div>
                    <span className="points-count">{polygonPoints.length < 3 ? <span style={{ color: '#f59e0b' }}>Marque +{3 - polygonPoints.length} pts</span> : <span style={{ color: '#22c55e' }}>Área Fechada ✔</span>}</span>
                  </div>
                </div>
              </div>

              {/* RESTO DO FORM (VISIBILIDADE, INPUTS...) MANTIDO IGUAL */}
              <div className="visibility-section">
                <div className="visibility-options">
                  <div className={`vis-option ${formData.visibilidade === 'publica' ? 'selected' : ''}`} onClick={() => setFormData({ ...formData, visibilidade: 'publica' })}><FaGlobeAmericas /> Público</div>
                  <div className={`vis-option ${formData.visibilidade === 'privada' ? 'selected' : ''}`} onClick={() => setFormData({ ...formData, visibilidade: 'privada' })}><FaLock /> Privado</div>
                </div>
              </div>
              <div className="form-row">
                <div className="input-group"><label>Nome da Área</label><input type="text" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required /></div>
                <div className="input-group"><label>Responsável</label><input type="text" value={formData.responsavel} onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })} /></div>
              </div>
              <div className="input-group"><label>Endereço / Referência</label><textarea value={formData.localizacao} onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })} required rows={2} /></div>
              <div className="input-group"><label>Descrição</label><textarea value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} rows={2} /></div>
              <div className="input-group"><label>Status</label><select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}><option value="Ativa">Ativa</option><option value="Em Manutenção">Em Manutenção</option><option value="Planejada">Planejada</option></select></div>

              <button type="submit" className="btn-submit">{modalMode === "create" ? "Salvar Área" : "Atualizar"}</button>
            </form>
          </div>
        </div>
      )}

      {/* LISTA DE CARDS MANTIDA IGUAL */}
      <div className="areas-grid">
        {filteredAreas.map((area) => (
          <div key={area.id} className="area-card">
            <div className="area-card-header">
              <h3>{area.nome}</h3>
              {area.polygon_path && <span title="Área Mapeada" style={{ color: 'white', opacity: 0.9 }}><FaDrawPolygon /></span>}
              <span className={`status-badge status-${area.status?.toLowerCase().replace(' ', '-')}`}>{area.status}</span>
            </div>
            <div className="area-card-body">
              <div className="area-info"><FaMapMarkedAlt /><p>{area.localizacao}</p></div>
              {area.descricao && <div className="area-info"><FaInfoCircle /><p>{area.descricao}</p></div>}
              <div className="area-info"><FaUser /><p>{area.responsavel}</p></div>
              <div className="area-meta">
                <small>Por: {area.nome_registrante || '—'}</small>
                {area.usuario_id === user.id && <span style={{ marginLeft: '10px', color: area.visibilidade === 'privada' ? '#f59e0b' : 'var(--primary)' }}>{area.visibilidade === 'privada' ? <FaLock /> : <FaGlobeAmericas />}</span>}
              </div>
            </div>
            <div className="area-card-footer">
              {(user.id === area.usuario_id || user.id === 1) ? (<><button className="btn-action btn-delete" onClick={() => handleDelete(area.id)}>Excluir</button><button className="btn-action btn-edit" onClick={() => handleEditArea(area)}>Editar</button></>) : (<span className="readonly-label"><FaLock className="readonly-icon" /> Visualização</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Areas;