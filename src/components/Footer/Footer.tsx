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

        <button
          className={styles.githubBtn}
          type="button"
          disabled
          title="Repositorio (próximamente)"
          aria-label="Repositorio (próximamente)"
        >
          <FaGithub size={16} />
          <span>Repositorio</span>
        </button>
      </div>
    </footer>
  );
}
