import { Link } from "react-router-dom";
import { FaGithub } from "react-icons/fa";
import styles from "./Footer.module.css";

/* Sound effects (UI feedback only, optional) */
import { sfx } from "../../lib/sfx";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <Link
          to="/"
          className={styles.brand}
          title="Ir al inicio"
          onClick={() => sfx.click()} // UI feedback on navigation
        >
          Ruleta.app
        </Link>

        <p className={styles.text}>Herramientas de azar sin distracciones</p>

        <a
          href="https://github.com/hazajulian/ruleta-app"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.githubBtn}
          title="Ver repositorio en GitHub"
          aria-label="Ver repositorio en GitHub"
          onClick={() => sfx.click()}
        >
          <FaGithub size={16} />
          <span>Repositorio</span>
        </a>
      </div>
    </footer>
  );
}
