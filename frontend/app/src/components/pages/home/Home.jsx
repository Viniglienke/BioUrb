import React, { useEffect, useState } from 'react';
import { api } from "../../../services/api";
import { FaTree, FaMapMarkedAlt, FaUsers, FaHeartbeat } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './Home.css';

function Home() {
  const [stats, setStats] = useState({
    totalArvores: 0,
    totalAreas: 0,
    totalUsuarios: 0,
    arvoresSaudaveis: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get("/stats");
        setStats(response.data);
      } catch (error) {
        console.error("Erro ao buscar estatísticas:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="home-container">
      <header className="home-hero">
        <div className="hero-content">
          <h1 className="hero-title">BioUrb</h1>
          <p className="hero-subtitle">Transformando cidades em espaços mais verdes e sustentáveis</p>
          <p className="hero-description">
            Monitore, gerencie e contribua para a arborização urbana da sua cidade
          </p>
          <div className="hero-buttons">
            <button className="btn-primary" onClick={() => navigate('/trees')}>
              Cadastrar Árvore
            </button>
            <button className="btn-secondary" onClick={() => navigate('/areas')}>
              Ver Áreas Verdes
            </button>
          </div>
        </div>
      </header>

      <section className="stats-section">
        <h2 className="section-title">Nosso Impacto em Números</h2>
        <div className="stats-grid-modern">
          <div className="stat-card">
            <div className="stat-icon green">
              <FaTree />
            </div>
            <h3 className="stat-number">{loading ? '...' : stats.totalArvores}</h3>
            <p className="stat-label">Árvores Cadastradas</p>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue">
              <FaMapMarkedAlt />
            </div>
            <h3 className="stat-number">{loading ? '...' : stats.totalAreas}</h3>
            <p className="stat-label">Áreas Verdes</p>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple">
              <FaUsers />
            </div>
            <h3 className="stat-number">{loading ? '...' : stats.totalUsuarios}</h3>
            <p className="stat-label">Colaboradores</p>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange">
              <FaHeartbeat />
            </div>
            <h3 className="stat-number">{loading ? '...' : stats.arvoresSaudaveis}</h3>
            <p className="stat-label">Árvores Saudáveis</p>
          </div>
        </div>
      </section>

      <section className="benefits-section">
        <h2 className="section-title">Por Que Arborização Urbana?</h2>
        <div className="benefits-grid">
          <div className="benefit-card">
            <div className="benefit-icon">🌡️</div>
            <h3>Redução de Temperatura</h3>
            <p>As árvores ajudam a diminuir as temperaturas urbanas, criando microclimas mais agradáveis</p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">💨</div>
            <h3>Melhoria do Ar</h3>
            <p>Filtram poluentes e produzem oxigênio, melhorando significativamente a qualidade do ar</p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">🔇</div>
            <h3>Redução de Ruído</h3>
            <p>Funcionam como barreira natural contra a poluição sonora urbana</p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">🌈</div>
            <h3>Bem-Estar</h3>
            <p>Promovem saúde mental e física, aumentando a qualidade de vida</p>
          </div>
        </div>
      </section>

      <section className="features-section">
        <h2 className="section-title">Funcionalidades do Sistema</h2>
        <div className="features-list">
          <div className="feature-item">
            <div className="feature-number">01</div>
            <div className="feature-content">
              <h3>Cadastro de Árvores</h3>
              <p>Registre árvores com informações detalhadas como espécie, localização e estado de saúde</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-number">02</div>
            <div className="feature-content">
              <h3>Gestão de Áreas Verdes</h3>
              <p>Organize e monitore parques, praças e outras áreas de preservação</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-number">03</div>
            <div className="feature-content">
              <h3>Monitoramento em Tempo Real</h3>
              <p>Acompanhe o desenvolvimento e saúde das árvores cadastradas</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-number">04</div>
            <div className="feature-content">
              <h3>Relatórios e Análises</h3>
              <p>Gere dados estatísticos para tomada de decisões estratégicas</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-content">
          <h2>Faça Parte da Mudança</h2>
          <p>Contribua para um futuro mais verde e sustentável</p>
          <button className="btn-cta" onClick={() => navigate('/trees')}>
            Comece Agora
          </button>
        </div>
      </section>
    </div>
  );
}

export default Home;
