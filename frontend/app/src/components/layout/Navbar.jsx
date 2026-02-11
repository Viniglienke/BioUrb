import { Link, useNavigate, useLocation } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext";
import styles from "./Navbar.module.css";
import logoIcon from "../../img/logo-icon.svg";
import { FaCoins, FaUser } from "react-icons/fa";

function Navbar() {
  const { signed, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [currentBalance, setCurrentBalance] = useState(0);

  useEffect(() => {
    if (user) setCurrentBalance(user.saldo || 0);
  }, [user]);

  useEffect(() => {
    const handleBalanceUpdate = () => {
      const storedUser = JSON.parse(localStorage.getItem("@Auth:user"));
      if (storedUser) setCurrentBalance(storedUser.saldo);
    };
    window.addEventListener("balanceUpdated", handleBalanceUpdate);
    return () => window.removeEventListener("balanceUpdated", handleBalanceUpdate);
  }, []);

  const isActive = (path) => location.pathname === path ? styles.active : "";

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        
        {/* 1. MARCA (ESQUERDA) */}
        <Link to="/home" className={styles.brand}>
          <img src={logoIcon} alt="BioUrb" className={styles.logo_icon} />
          <span className={styles.brand_name}>BioUrb</span>
        </Link>

        {/* 2. LINKS DE NAVEGAÇÃO (CENTRO-ESQUERDA) */}
        <ul className={styles.nav_links}>
          <li className={`${styles.item} ${isActive("/trees")}`}>
            <Link to="/trees">Árvores</Link>
          </li>
          <li className={`${styles.item} ${isActive("/areas")}`}>
            <Link to="/areas">Áreas Verdes</Link>
          </li>
          <li className={`${styles.item} ${isActive("/monitoring")}`}>
            <Link to="/monitoring">Monitoramento</Link>
          </li>
          <li className={`${styles.item} ${isActive("/map")}`}>
            <Link to="/map">Mapa</Link>
          </li>
          <li className={`${styles.item} ${isActive("/shop")}`}>
            <Link to="/shop">Loja</Link>
          </li>
        </ul>

        {/* 3. ÁREA DO USUÁRIO (EXTREMA DIREITA) */}
        <div className={styles.user_area}>
          
          {/* MOEDAS */}
          {signed && (
            <div className={styles.coinDisplay}>
              <FaCoins className={styles.coinIcon} />
              <span>{currentBalance}</span>
            </div>
          )}

          {/* PERFIL OU LOGIN */}
          {signed ? (
            <Link to="/profile" className={styles.profile_btn} title="Meu Perfil">
              {user?.foto ? (
                <img 
                  src={user.foto} 
                  alt="Avatar" 
                  className={styles.avatar_img} 
                />
              ) : (
                <FaUser />
              )}
            </Link>
          ) : (
            <button
              className={styles.button_login}
              onClick={() => navigate("/")}
            >
              Entrar
            </button>
          )}
        </div>

      </div>
    </nav>
  );
}

export default Navbar;