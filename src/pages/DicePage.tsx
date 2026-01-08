import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./DicePage.module.css";
import { ResetModal } from "../components/ResetModal/ResetModal";

/* Sound effects (non-intrusive UI feedback) */
import { sfx } from "../lib/sfx";

type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

const ROLL_DURATION_MS = 2300;
const MIN_DICE = 1;
const MAX_DICE = 6;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function randDie(): DieValue {
  return (1 + Math.floor(Math.random() * 6)) as DieValue;
}

function makeDice(count: number): DieValue[] {
  return Array.from({ length: count }, () => randDie());
}

type DieProps = {
  value: DieValue;
  isRolling: boolean;
};

function Die({ value, isRolling }: DieProps) {
  return (
    <div
      className={`${styles.die} ${isRolling ? styles.dieRolling : ""}`}
      data-value={value}
      aria-label={`Dado: ${value}`}
    >
      <span className={`${styles.pip} ${styles.pip1}`} />
      <span className={`${styles.pip} ${styles.pip2}`} />
      <span className={`${styles.pip} ${styles.pip3}`} />
      <span className={`${styles.pip} ${styles.pip4}`} />
      <span className={`${styles.pip} ${styles.pip5}`} />
      <span className={`${styles.pip} ${styles.pip6}`} />
      <span className={`${styles.pip} ${styles.pip7}`} />
      <span className={`${styles.pip} ${styles.pip8}`} />
      <span className={`${styles.pip} ${styles.pip9}`} />
    </div>
  );
}

export function DicePage() {
  const [count, setCount] = useState(2);
  const [dice, setDice] = useState<DieValue[]>(() => makeDice(2));
  const [isRolling, setIsRolling] = useState(false);

  const timeoutRef = useRef<number | null>(null);

  /* Reset modal state */
  const [resetOpen, setResetOpen] = useState(false);

  /* Derived values */
  const total = useMemo(() => dice.reduce((acc, v) => acc + v, 0), [dice]);

  /* Cleanup timers on unmount */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  function changeCount(next: number) {
    if (isRolling) return;

    /* SFX: click feedback on user controls. */
    sfx.click();

    const n = clamp(next, MIN_DICE, MAX_DICE);
    setCount(n);
    setDice(makeDice(n));
  }

  function roll() {
    if (isRolling) return;

    /* SFX: click on roll action + success when the roll finishes. */
    sfx.click();

    setIsRolling(true);

    const start = Date.now();

    const tick = () => {
      const elapsed = Date.now() - start;

      setDice(makeDice(count));

      if (elapsed >= ROLL_DURATION_MS) {
        setIsRolling(false);
        sfx.success();
        return;
      }

      const nextDelay = 70 + Math.floor(Math.random() * 60); // 70..129ms
      timeoutRef.current = window.setTimeout(tick, nextDelay);
    };

    tick();
  }

  function doReset() {
    if (isRolling) return;

    setCount(2);
    setDice(makeDice(2));
    setResetOpen(false);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dados</h1>
        <p className={styles.subtitle}>Tirá 1 o más dados en un click.</p>
      </header>

      <section className={styles.layout}>
        <div className={styles.diceArea}>
          <div className={styles.diceGrid} aria-label="Dados">
            {dice.map((v, idx) => (
              <Die key={`${idx}-${v}-${dice.length}`} value={v} isRolling={isRolling} />
            ))}
          </div>

          <div className={styles.total} aria-label={`Total: ${total}`}>
            <span className={styles.totalLabel}>TOTAL</span>
            <strong className={styles.totalValue}>{total}</strong>
          </div>
        </div>

        <aside className={styles.panel}>
          <h2 className={styles.panelTitle}>Acciones</h2>

          <div className={styles.control}>
            <span className={styles.controlLabel}>Cantidad</span>

            <div className={styles.stepper}>
              <button
                className={`${styles.stepBtn} btn`}
                onClick={() => changeCount(count - 1)}
                disabled={isRolling || count <= MIN_DICE}
                aria-label="Menos dados"
              >
                –
              </button>

              <div className={styles.countBox} aria-label={`Cantidad: ${count}`}>
                {count}
              </div>

              <button
                className={`${styles.stepBtn} btn`}
                onClick={() => changeCount(count + 1)}
                disabled={isRolling || count >= MAX_DICE}
                aria-label="Más dados"
              >
                +
              </button>
            </div>
          </div>

          <button className={`${styles.roll} btn`} onClick={roll} disabled={isRolling}>
            {isRolling ? "Rodando..." : "Tirar"}
          </button>

          <button
            className={`${styles.reset} btn`}
            onClick={() => {
              sfx.click();
              setResetOpen(true);
            }}
            disabled={isRolling}
          >
            Resetear
          </button>

          <div className={styles.tips}>
            <div className={styles.tipRow}>
              <span className={styles.tipDot} />
              <span>Podés tirar entre 1 y 6 dados.</span>
            </div>
            <div className={styles.tipRow}>
              <span className={styles.tipDot} />
              <span>Se bloquea todo mientras están rodando.</span>
            </div>
          </div>
        </aside>
      </section>

      <ResetModal
        open={resetOpen}
        subject="dados"
        onClose={() => setResetOpen(false)}
        onConfirm={doReset}
      />
    </div>
  );
}
