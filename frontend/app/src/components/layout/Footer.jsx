import { Link } from 'react-router-dom';
import {
  FaFacebook,
  FaGithub,
  FaInstagram,
  FaWhatsapp,
  FaEnvelope,
  FaMapMarkerAlt,
  FaPhone,
  FaArrowRight
} from 'react-icons/fa';
import styles from './Footer.module.css';

function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>

        {/* COLUNA 1: SOBRE A MARCA */}
        <div className={styles.brand_column}>
          <h2 className={styles.logo_text}>BioUrb</h2>
          <p className={styles.brand_desc}>
            Transformando cidades em espaços mais verdes e sustentáveis.
            Monitore, gerencie e contribua para a arborização urbana da sua região.
          </p>
        </div>

        {/* COLUNA 2: NAVEGAÇÃO */}
        <div className={styles.column}>
          <h3 className={styles.title}>Explorar</h3>
          <ul className={styles.link_list}>
            <li><Link to="/home">Início</Link></li>
            <li><Link to="/trees">Árvores</Link></li>
            <li><Link to="/areas">Áreas Verdes</Link></li>
            <li><Link to="/map">Mapa Interativo</Link></li>
            <li><Link to="/shop">Loja</Link></li>
          </ul>
        </div>

        {/* COLUNA 3: CONTATO (DADOS REAIS) */}
        <div className={styles.column}>
          <h3 className={styles.title}>Contato</h3>
          <ul className={styles.contact_info}>
            <li>
              <FaPhone className={styles.icon_small} />
              <span>(49) 3664-0044</span>
            </li>
            <li>
              <FaEnvelope className={styles.icon_small} />
              <span>contato.biourb@gmail.com</span>
            </li>
            <li>
              <FaMapMarkerAlt className={styles.icon_small} />
              <span>Av. Euclides da Cunha, 60<br />Centro, Maravilha - SC</span>
            </li>
          </ul>
        </div>

        {/* COLUNA 4: CHAMADA PARA AÇÃO & SOCIAL */}
        <div className={styles.column}>
          <h3 className={styles.title}>Fale Conosco</h3>
          <p className={styles.cta_text}>Tem dúvidas ou sugestões? Envie uma mensagem agora.</p>

          <Link to="/contact" className={styles.cta_button}>
            Formulário de Contato <FaArrowRight />
          </Link>

          <div className={styles.socials}>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <FaInstagram />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <FaFacebook />
            </a>
            <a href="https://github.com/Viniglienke/BioUrb" target="_blank" rel="noopener noreferrer" aria-label="Github">
              <FaGithub />
            </a>
          </div>
        </div>

      </div>

      {/* BARRA DE DIREITOS AUTORAIS */}
      <div className={styles.copyright_bar}>
        <p>&copy; 2025 BioUrb. Desenvolvido para um futuro sustentável.</p>
      </div>
    </footer>
  );
}

export default Footer;