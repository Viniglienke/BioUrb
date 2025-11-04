import React from 'react';
import './Home.css'; 

function Home() {
  return (
    <div className="home-container">
      <header className="home-header">
        <h1>Sistema de Controle de Arborização Urbana</h1>
        <p>Bem-vindo ao sistema de controle de áreas e loteamentos arborizados. Monitore e gerencie suas áreas verdes de forma eficiente.</p>
      </header>
      <section>
        <h2>História</h2>
        <p>
          Nosso sistema de arborização urbana foi criado com o objetivo de
          melhorar a qualidade de vida nas cidades. Com o aumento da
          urbanização, é essencial garantir que as áreas urbanas permaneçam
          verdes e saudáveis. A arborização proporciona diversos benefícios,
          incluindo a melhoria da qualidade do ar, redução das ilhas de calor
          urbano e promoção do bem-estar físico e mental dos cidadãos.
        </p>
      </section>
      <section>
        <h2>Objetivo</h2>
        <p>
          O objetivo principal deste sistema é monitorar e gerenciar a
          arborização em diferentes áreas urbanas. Através deste sistema, é
          possível registrar e acompanhar o plantio de árvores, monitorar seu
          crescimento e saúde ao longo do tempo e garantir que as espécies
          plantadas sejam adequadas para cada região.
        </p>
      </section>
      <section>
        <h2>Funcionalidades</h2>
        <ul className="stats-grid">
          <li className="stat-item">
            <p>Cadastro de novas áreas de plantio</p>
          </li>
          <li className="stat-item">
            <p>Registro das espécies de árvores plantadas</p>
          </li>
          <li className="stat-item">
            <p>Acompanhamento do crescimento e saúde das árvores</p>
          </li>
          <li className="stat-item">
            <p>Relatórios e estatísticas sobre a arborização urbana</p>
          </li>
        </ul>
      </section>
      <section>
        <h2>Benefícios</h2>
        <p>
          Com a utilização deste sistema, esperamos proporcionar um ambiente
          urbano mais verde e sustentável, promover a biodiversidade e melhorar
          a qualidade de vida dos moradores. A arborização urbana é uma
          ferramenta essencial para combater os efeitos das mudanças climáticas
          e criar cidades mais resilientes e agradáveis para viver.
        </p>
      </section>
      <section className="home-stats">
        <h2>Estatísticas Rápidas</h2>
        <div className="stats-grid">
          <div className="stat-item">
            <h3>50</h3>
            <p>Áreas Monitoradas</p>
          </div>
          <div className="stat-item">
            <h3>200</h3>
            <p>Árvores Plantadas</p>
          </div>
          <div className="stat-item">
            <h3>30</h3>
            <p>Inspeções Recentes</p>
          </div>
          <div className="stat-item">
            <h3>15</h3>
            <p>Árvores em Risco</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
