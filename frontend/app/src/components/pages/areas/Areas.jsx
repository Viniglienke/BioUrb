import React, { useState, useEffect } from 'react';
import {
  FaMapMarkedAlt, FaUser, FaInfoCircle, FaLeaf, FaLock,
  FaSearch, FaFilter, FaUndo, FaGlobeAmericas, FaExclamationTriangle
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../services/api';
import './Areas.css';

const Areas = () => {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // --- ESTADO DE VISUALIZAÇÃO (NOVO) ---
  // 'mine' = Meus Registros | 'community' = Comunidade
  const [viewMode, setViewMode] = useState('mine');

  // --- ESTADOS DOS FILTROS ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    localizacao: '',
    responsavel: '',
    status: 'Ativa',
    visibilidade: 'publica'
  });

  const user = JSON.parse(localStorage.getItem("@Auth:user"));
  const [modalMode, setModalMode] = useState("create"); // "create" | "edit"
  const [editingAreaId, setEditingAreaId] = useState(null);


  // --- LÓGICA DE FILTRAGEM (ATUALIZADA) ---
  const filteredAreas = areas.filter(area => {

    // 1. Filtro de MODO DE VISUALIZAÇÃO
    let matchesViewMode = false;

    if (viewMode === 'mine') {
      // Mostra APENAS o que eu criei
      matchesViewMode = area.usuario_id === user.id;
    } else {
      // Comunidade: Mostra TUDO que é público
      const isPublic = area.visibilidade === 'publica' || !area.visibilidade;
      matchesViewMode = isPublic;
    }

    if (!matchesViewMode) return false;

    // 2. Filtros de Texto e Status
    const matchesSearch =
      area.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (area.responsavel && area.responsavel.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (area.localizacao && area.localizacao.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter ? area.status === statusFilter : true;

    return matchesSearch && matchesStatus;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
  };

  const handleEditArea = (area) => {
    setModalMode("edit");
    setEditingAreaId(area.id);
    setFormData({
      nome: area.nome || "",
      descricao: area.descricao || "",
      localizacao: area.localizacao || "",
      responsavel: area.responsavel || "",
      status: area.status || "Ativa",
      visibilidade: area.visibilidade || "publica"
    });
    setShowForm(true);
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  const fetchAreas = async () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("@Auth:user"));
      // Envia o ID
      const response = await api.get(`/areas?userId=${storedUser?.id}`);

      const data = Array.isArray(response.data) ? response.data : response.data.areas || [];
      setAreas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao buscar áreas:", error);
      toast.error("Erro ao carregar áreas verdes");
      setAreas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nome || !formData.localizacao) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    const payload = {
      nome: formData.nome.trim(),
      localizacao: formData.localizacao.trim(),
      status: formData.status,
      descricao: formData.descricao?.trim() || "Não informado",
      responsavel: formData.responsavel?.trim() || "Não informado",
      visibilidade: formData.visibilidade,
      usuario_id: user.id
    };

    try {
      if (modalMode === 'edit') {
        await api.put(`/areas/${editingAreaId}`, payload);
        toast.success("Área atualizada com sucesso!");
      } else {
        await api.post("/areas", payload);
        toast.success("Área verde cadastrada com sucesso!");
      }
      setShowForm(false);
      fetchAreas();
    } catch (error) {
      toast.error("Erro ao salvar área verde");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente excluir esta área verde?")) return;

    try {
      await api.delete(`/areas/${id}`);
      toast.success("Área verde excluída com sucesso!");
      fetchAreas();
    } catch (error) {
      console.error("Erro ao excluir área:", error);
      toast.error("Erro ao excluir área verde");
    }
  };

  return (
    <div className="areas-container">
      <header className="areas-header">
        <h1>Áreas Verdes</h1>
        <p>Gerencie e monitore as áreas verdes da cidade</p>
        <button
          className="btn-new-area"
          onClick={() => {
            setModalMode("create");
            setEditingAreaId(null);
            setFormData({
              nome: "",
              descricao: "",
              localizacao: "",
              responsavel: "",
              status: "Ativa",
              visibilidade: "publica"
            });
            setShowForm(true);
          }}
        >
          + Nova Área Verde
        </button>
      </header>

      {/* --- ABAS DE NAVEGAÇÃO (IGUAL AO MONITORING) --- */}
      <div className="view-tabs-container">
        <div className="view-tabs">
          <button
            className={`view-tab ${viewMode === 'mine' ? 'active' : ''}`}
            onClick={() => { setViewMode('mine'); clearFilters(); }}
          >
            <FaUser /> Meus Registros
          </button>
          <button
            className={`view-tab ${viewMode === 'community' ? 'active' : ''}`}
            onClick={() => { setViewMode('community'); clearFilters(); }}
          >
            <FaGlobeAmericas /> Explorar Comunidade
          </button>
        </div>
      </div>

      {/* --- BARRA DE FILTROS --- */}
      <div className="filter-bar">
        <div className="filter-group search-group">
          <FaSearch className="filter-icon" />
          <input
            type="text"
            placeholder="Buscar por nome, local ou responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <FaFilter className="filter-icon" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos os Status</option>
            <option value="Ativa">Ativa</option>
            <option value="Em Manutenção">Em Manutenção</option>
            <option value="Planejada">Planejada</option>
          </select>
        </div>

        <button className="btn-clear-filters" onClick={clearFilters} title="Limpar Filtros">
          <FaUndo />
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content area-modal">
            <header className="modal-header">
              <h2>
                {modalMode === "create"
                  ? "Cadastrar Nova Área Verde"
                  : "Editar Área Verde"}
              </h2>
              <button
                className="modal-close"
                onClick={() => setShowForm(false)}
              >
                ✕
              </button>
            </header>

            <form onSubmit={handleSubmit} className="area-form">

              {/* SELETOR DE PRIVACIDADE */}
              <div className="visibility-section">
                <label className="section-label">Privacidade</label>
                <div className="visibility-options">
                  <div
                    className={`vis-option ${formData.visibilidade === 'publica' ? 'selected' : ''}`}
                    onClick={() => setFormData({ ...formData, visibilidade: 'publica' })}
                  >
                    <FaGlobeAmericas /> Público
                  </div>
                  <div
                    className={`vis-option ${formData.visibilidade === 'privada' ? 'selected' : ''}`}
                    onClick={() => setFormData({ ...formData, visibilidade: 'privada' })}
                  >
                    <FaLock /> Privado
                  </div>
                </div>
                <small className="vis-hint">
                  {formData.visibilidade === 'publica'
                    ? "Visível para todos no mapa."
                    : "Visível apenas para você."}
                </small>
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label>Nome da Área</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) =>
                      setFormData({ ...formData, nome: e.target.value })
                    }
                    placeholder="Ex: Parque Central"
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Responsável</label>
                  <input
                    type="text"
                    value={formData.responsavel}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        responsavel: e.target.value,
                      })
                    }
                    placeholder="Nome do responsável"
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Localização</label>
                <textarea
                  value={formData.localizacao}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      localizacao: e.target.value,
                    })
                  }
                  placeholder="Endereço completo"
                  required
                />
              </div>

              <div className="input-group">
                <label>Descrição</label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      descricao: e.target.value,
                    })
                  }
                  placeholder="Descrição da área verde"
                />
              </div>

              <div className="input-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value,
                    })
                  }
                >
                  <option value="Ativa">Ativa</option>
                  <option value="Em Manutenção">Em Manutenção</option>
                  <option value="Planejada">Planejada</option>
                </select>
              </div>
              <button type="submit" className="btn-submit">
                {modalMode === "create" ? "Cadastrar Área" : "Salvar Alterações"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- GRID DE CARDS --- */}
      <div className="areas-grid">
        {loading ? (
          <p className="loading-text">Carregando...</p>
        ) : filteredAreas.length === 0 ? (
          <div className="no-areas">
            <p>
              {viewMode === 'mine'
                ? "Você ainda não tem áreas com esses filtros."
                : "Nenhuma área pública encontrada com esses filtros."}
            </p>
            <button className="btn-link" onClick={clearFilters}>Limpar filtros</button>
          </div>
        ) : (
          filteredAreas.map((area) => (
            <div key={area.id} className="area-card">
              <div className="area-card-header">
                <h3>{area.nome}</h3>
                <span className={`status-badge status-${area.status?.toLowerCase().replace(' ', '-')}`}>
                  {area.status}
                </span>
              </div>

              <div className="area-card-body">
                {area.descricao && (
                  <div className="area-info">
                    <FaInfoCircle />
                    <p>{area.descricao}</p>
                  </div>
                )}

                <div className="area-info">
                  <FaMapMarkedAlt />
                  <p>{area.localizacao}</p>
                </div>

                {area.responsavel && (
                  <div className="area-info">
                    <FaUser />
                    <p>Responsável: {area.responsavel}</p>
                  </div>
                )}

                <div className="area-info">
                  <FaLeaf />
                  <p>{area.total_arvores || 0} árvore(s) cadastrada(s)</p>
                </div>

                <div className="area-meta">
                  <small>Registrado por: {area.nome_registrante || '—'}</small>

                  {/* Ícone de Privacidade (Visível apenas para o dono) */}
                  {area.usuario_id === user.id && (
                    <span
                      title={area.visibilidade === 'privada' ? "Privado" : "Público"}
                      style={{ marginLeft: '10px', color: area.visibilidade === 'privada' ? '#f59e0b' : 'var(--primary)' }}
                    >
                      {area.visibilidade === 'privada' ? <FaLock /> : <FaGlobeAmericas />}
                    </span>
                  )}
                </div>
              </div>

              <div className="area-card-footer">
                {(user.id === area.usuario_id || user.id === 1) ? (
                  <>
                    <button className="btn-action btn-delete" onClick={() => handleDelete(area.id)}>Excluir</button>
                    <button className="btn-action btn-edit" onClick={() => handleEditArea(area)}>Editar</button>
                  </>
                ) : (
                  <span
                    className="readonly-label tooltip-wrapper"
                    data-tooltip="Você não pode editar esta área porque não foi o responsável pelo cadastro."
                  >
                    <FaLock className="readonly-icon" />
                    Apenas visualização
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Areas;