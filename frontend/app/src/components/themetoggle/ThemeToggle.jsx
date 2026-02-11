import { FaMoon, FaSun } from "react-icons/fa";
import { useTheme } from "../../context/ThemeContext";
import styles from "./ThemeToggle.module.css";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className={`${styles.toggle} ${
        theme === "dark" ? styles.dark : styles.light
      }`}
      onClick={toggleTheme}
      aria-label="Alternar tema"
      title="Alternar tema"
    >
      <span className={styles.icon}>
        {theme === "light" ? <FaMoon /> : <FaSun />}
      </span>
    </button>
  );
}

export default ThemeToggle;