import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaMapMarkedAlt, FaUser, FaInfoCircle, FaLeaf } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import './Areas.css';

const Areas = () => {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    localizacao: '',
    responsavel: '',
    status: 'Ativa'
  });

  const user = JSON.parse(localStorage.getItem("@Auth:user"));
  const navigate = useNavigate();

  useEffect(() => {
    fetchAreas();
  }, []);

  const fetchAreas = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/areas`);
      setAreas(response.data);
    } catch (error) {
      console.error("Erro ao buscar áreas:", error);
      toast.error("Erro ao carregar áreas verdes");
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

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/areas`, {
        ...formData,
        usuario_id: user.id
      });

      toast.success("Área verde cadastrada com sucesso!");
      setFormData({ nome: '', descricao: '', localizacao: '', responsavel: '', status: 'Ativa' });
      setShowForm(false);
      fetchAreas();
    } catch (error) {
      console.error("Erro ao cadastrar área:", error);
      toast.error("Erro ao cadastrar área verde");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente excluir esta área verde?")) return;

    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/areas/${id}`);
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
        <button className="btn-new-area" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nova Área Verde'}
        </button>
      </header>

      {showForm && (
        <div className="area-form-container">
          <h2>Cadastrar Nova Área Verde</h2>
          <form onSubmit={handleSubmit} className="area-form">
            <div className="form-row">
              <div className="input-group">
                <label>Nome da Área</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  placeholder="Ex: Parque Central"
                  required
                />
              </div>
              <div className="input-group">
                <label>Responsável</label>
                <input
                  type="text"
                  value={formData.responsavel}
                  onChange={(e) => setFormData({...formData, responsavel: e.target.value})}
                  placeholder="Nome do responsável"
                />
              </div>
            </div>

            <div className="input-group">
              <label>Localização</label>
              <textarea
                value={formData.localizacao}
                onChange={(e) => setFormData({...formData, localizacao: e.target.value})}
                placeholder="Endereço completo"
                required
              />
            </div>

            <div className="input-group">
              <label>Descrição</label>
              <textarea
                value={formData.descricao}
                onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                placeholder="Descrição da área verde"
              />
            </div>

            <div className="input-group">
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
              >
                <option value="Ativa">Ativa</option>
                <option value="Em Manutenção">Em Manutenção</option>
                <option value="Planejada">Planejada</option>
              </select>
            </div>

            <button type="submit" className="btn-submit">Cadastrar Área</button>
          </form>
        </div>
      )}

      <div className="areas-grid">
        {loading ? (
          <p>Carregando...</p>
        ) : areas.length === 0 ? (
          <p className="no-areas">Nenhuma área verde cadastrada ainda.</p>
        ) : (
          areas.map((area) => (
            <div key={area.id} className="area-card">
              <div className="area-card-header">
                <h3>{area.nome}</h3>
                <span className={`status-badge status-${area.status.toLowerCase().replace(' ', '-')}`}>
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
                  <p>{area.total_arvores} árvore(s) cadastrada(s)</p>
                </div>

                <div className="area-meta">
                  <small>Registrado por: {area.nome_registrante}</small>
                </div>
              </div>

              {(user.id === area.usuario_id || user.id === 1) && (
                <div className="area-card-actions">
                  <button className="btn-delete" onClick={() => handleDelete(area.id)}>
                    Excluir
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Areas;
