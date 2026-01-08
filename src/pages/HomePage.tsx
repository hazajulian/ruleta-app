import { memo } from "react";
import { NavLink } from "react-router-dom";
import styles from "./HomePage.module.css";

/* Sound effects (UI feedback on navigation) */
import { sfx } from "../lib/sfx";

// Icons (PNG) - adjust the path if your structure differs
import wheelIcon from "../assets/wheel.png";
import coinIcon from "../assets/coin.png";
import diceIcon from "../assets/dice.png";
import randomNumberIcon from "../assets/random-number.png";
import nameIcon from "../assets/name.png";

/* ===========================
   Types
   =========================== */

type IconKey = "wheel" | "coin" | "dice" | "random" | "name";

type ToolCard = {
  title: string;
  description: string;
  icon: string;
  to?: string;
  badge?: string;
  iconKey?: IconKey;
};

/* ===========================
   Data
   =========================== */

// Tipado explícito para evitar inferencia "never" en .map()
const TOOLS: ReadonlyArray<ToolCard> = [
  {
    title: "Ruleta",
    description: "Agregá opciones, girá y obtené una decisión clara al instante.",
    icon: wheelIcon,
    to: "/wheel",
    badge: "Disponible",
    iconKey: "wheel",
  },
  {
    title: "Moneda",
    description: "Cara o cruz para desempates rápidos, sin vueltas ni fricción.",
    icon: coinIcon,
    to: "/coin",
    badge: "Disponible",
    iconKey: "coin",
  },
  {
    title: "Dados",
    description: "Tirá de 1 a 6 dados en un click. Ideal para juegos y actividades.",
    icon: diceIcon,
    to: "/dice",
    badge: "Disponible",
    iconKey: "dice",
  },
  {
    title: "Número random",
    description: "Generá un número dentro de un rango, en modo entero o decimal.",
    icon: randomNumberIcon,
    to: "/random-number",
    badge: "Disponible",
    iconKey: "random",
  },
  {
    title: "Sorteo de nombres",
    description: "Pegá una lista y sorteá ganadores de forma simple y legible.",
    icon: nameIcon,
    to: "/name-draw",
    badge: "Disponible",
    iconKey: "name",
  },
];

/* ===========================
   Helpers
   =========================== */

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ===========================
   UI
   =========================== */

const ToolCardContent = memo(function ToolCardContent({ tool }: { tool: ToolCard }) {
  const iconBoostClass = tool.iconKey ? styles[`icon_${tool.iconKey}`] : undefined;

  return (
    <>
      {tool.badge ? <span className={styles.badge}>{tool.badge}</span> : null}

      <div className={styles.iconTile} aria-hidden="true">
        <img className={cx(styles.icon, iconBoostClass)} src={tool.icon} alt="" />
      </div>

      <h2 className={styles.cardTitle}>{tool.title}</h2>
      <p className={styles.cardDesc}>{tool.description}</p>
    </>
  );
});

export function HomePage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1 className={styles.title}>Herramientas de azar, sin distracciones.</h1>

        <p className={styles.subtitle}>
          Ruleta.app es un set de herramientas rápidas y cuidadas para decidir, sortear y jugar con la
          suerte. Sin anuncios, sin ruido visual.
        </p>

        <div className={styles.pills} aria-label="Beneficios principales">
          <div className={styles.pill}>
            <span className={styles.pillLabel}>SIN ANUNCIOS</span>
            <span className={styles.pillText}>Experiencia limpia, sin interrupciones.</span>
          </div>

          <div className={styles.pill}>
            <span className={styles.pillLabel}>LISTO PARA COMPARTIR</span>
            <span className={styles.pillText}>Ideal para streams, clases y sorteos.</span>
          </div>

          <div className={styles.pill}>
            <span className={styles.pillLabel}>RESULTADOS CLAROS</span>
            <span className={styles.pillText}>Interfaz simple, estable y fácil de leer.</span>
          </div>
        </div>
      </section>

      <section className={styles.grid} aria-label="Herramientas disponibles">
        {TOOLS.map((tool) => {
          const content = <ToolCardContent tool={tool} />;

          if (tool.to) {
            return (
              <NavLink
                key={tool.title}
                to={tool.to}
                className={cx(styles.card, styles.cardActive)}
                onClick={() => sfx.click()} // UI feedback on tool navigation
              >
                {content}
              </NavLink>
            );
          }

          return (
            <div key={tool.title} className={cx(styles.card, styles.cardDisabled)}>
              {content}
            </div>
          );
        })}
      </section>
    </div>
  );
}
