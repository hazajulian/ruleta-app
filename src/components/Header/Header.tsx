import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { FaVolumeMute, FaVolumeUp } from "react-icons/fa";

import styles from "./Header.module.css";
import logo from "../../assets/logo.png";

/* Sound effects (global, optional, persisted) */
import { getSfxMuted, setSfxMuted, sfx } from "../../lib/sfx";

export function Header() {
  /* ---------------------------------------------------------
     Global sound toggle (persisted in LocalStorage)
     --------------------------------------------------------- */
  const [muted, setMuted] = useState<boolean>(() => getSfxMuted());

  useEffect(() => {
    setSfxMuted(muted);
  }, [muted]);

  const toggleSound = () => {
    setMuted((prev) => {
      const next = !prev;

      // Only play feedback when enabling sound (avoids "click while muting")
      if (!next) sfx.click();

      return next;
    });
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <NavLink to="/" className={styles.brand} aria-label="Ir al inicio" onClick={() => sfx.click()}>
          <img src={logo} alt="Ruletita.app" className={styles.logo} />
          <span className={styles.brandText}>
            Ruleta<span className={styles.brandAccent}>.app</span>
          </span>
        </NavLink>

        <nav className={styles.nav} aria-label="Navegación principal">
          <div className={styles.navInner}>
            <NavLink
              to="/"
              onClick={() => sfx.click()}
              className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
              end
            >
              Home
            </NavLink>

            <NavLink
              to="/wheel"
              onClick={() => sfx.click()}
              className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
            >
              Ruleta
            </NavLink>

            {/* -------------------------------------------------
               Sound toggle (non-intrusive, optional UX feature)
               ------------------------------------------------- */}
            <button
              type="button"
              onClick={toggleSound}
              className={styles.soundToggle}
              aria-label={muted ? "Activar sonido" : "Silenciar sonido"}
              title={muted ? "Sonido: OFF" : "Sonido: ON"}
            >
              {muted ? <FaVolumeMute /> : <FaVolumeUp />}
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
