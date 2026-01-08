import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./CoinPage.module.css";
import { ResetModal } from "../components/ResetModal/ResetModal";

/* Sound effects (non-intrusive UI feedback) */
import { sfx } from "../lib/sfx";

type CoinSide = "heads" | "tails";

const FLIP_DURATION_MS = 1400;
const SETTLE_MS = 180;

/* Normalize degrees to [0..359]. */
function normalize360(deg: number) {
  return ((deg % 360) + 360) % 360;
}

/* Pick the nearest angle congruent to desiredDeg (0 or 180) to avoid end “jumps”. */
function nearestCongruentAngle(targetDeg: number, desiredDeg: 0 | 180) {
  const k = Math.round((targetDeg - desiredDeg) / 360);
  return desiredDeg + k * 360;
}

function CoinFront() {
  return (
    <svg viewBox="0 0 200 200" className={styles.coinSvg} aria-hidden="true">
      <defs>
        <radialGradient id="silver" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="35%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
        </radialGradient>

        <radialGradient id="gold" cx="35%" cy="28%" r="75%">
          <stop offset="0%" stopColor="rgba(255,220,140,0.65)" />
          <stop offset="45%" stopColor="rgba(255,190,90,0.22)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
        </radialGradient>

        <linearGradient id="engraveFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.52)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
        </linearGradient>

        <filter id="engraveShadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow
            dx="0"
            dy="1.2"
            stdDeviation="1.2"
            floodColor="rgba(0,0,0,0.50)"
          />
        </filter>
      </defs>

      <circle cx="100" cy="100" r="92" fill="url(#silver)" />
      <circle
        cx="100"
        cy="100"
        r="92"
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="10"
        strokeDasharray="2 10"
        opacity="0.9"
      />

      <circle cx="100" cy="100" r="62" fill="url(#gold)" />
      <circle cx="100" cy="100" r="62" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="3" />
      <circle cx="100" cy="100" r="46" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="2" />

      <g className={styles.engraved} filter="url(#engraveShadow)">
        <path
          className={styles.engraveFill}
          d="M108 76
             C100 69, 89 71, 85 81
             C81 91, 86 100, 92 104
             C96 106, 96 111, 93 114
             C90 118, 94 126, 104 126
             C120 126, 129 110, 125 95
             C123 87, 114 81, 108 76 Z"
        />

        <text x="100" y="155" textAnchor="middle" className={`${styles.coinText} ${styles.coinTextFront}`}>
          CARA
        </text>
      </g>
    </svg>
  );
}

function CoinBack() {
  return (
    <svg viewBox="0 0 200 200" className={styles.coinSvg} aria-hidden="true">
      <defs>
        <radialGradient id="silverB" cx="65%" cy="30%" r="75%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.32)" />
          <stop offset="35%" stopColor="rgba(255,255,255,0.11)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.58)" />
        </radialGradient>

        <radialGradient id="goldB" cx="65%" cy="28%" r="75%">
          <stop offset="0%" stopColor="rgba(255,220,140,0.60)" />
          <stop offset="45%" stopColor="rgba(255,190,90,0.20)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.58)" />
        </radialGradient>

        <linearGradient id="engraveFillB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.52)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
        </linearGradient>

        <filter id="engraveShadowB" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow
            dx="0"
            dy="1.2"
            stdDeviation="1.2"
            floodColor="rgba(0,0,0,0.50)"
          />
        </filter>
      </defs>

      <circle cx="100" cy="100" r="92" fill="url(#silverB)" />
      <circle
        cx="100"
        cy="100"
        r="92"
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="10"
        strokeDasharray="2 10"
        opacity="0.9"
      />

      <circle cx="100" cy="100" r="62" fill="url(#goldB)" />
      <circle cx="100" cy="100" r="62" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="3" />
      <circle cx="100" cy="100" r="46" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="2" />

      <g className={styles.engraved} filter="url(#engraveShadowB)">
        <path className={styles.engraveStrokeSoft} d="M78 78 L122 122 M122 78 L78 122" />
        <path className={styles.engraveStroke} d="M78 78 L122 122 M122 78 L78 122" />

        <text x="100" y="155" textAnchor="middle" className={`${styles.coinText} ${styles.coinTextBack}`}>
          CRUZ
        </text>
      </g>
    </svg>
  );
}

export function CoinPage() {
  const [isFlipping, setIsFlipping] = useState(false);
  const [isSettling, setIsSettling] = useState(false);

  const [result, setResult] = useState<CoinSide | null>(null);
  const [rotationY, setRotationY] = useState(0);

  const flipTimeoutRef = useRef<number | null>(null);
  const settleTimeoutRef = useRef<number | null>(null);

  const [resetOpen, setResetOpen] = useState(false);

  const canInteract = !isFlipping && !isSettling;

  const transition = useMemo(() => {
    if (isFlipping) return `transform ${FLIP_DURATION_MS}ms cubic-bezier(0.12, 0.8, 0.12, 1)`;
    if (isSettling) return `transform ${SETTLE_MS}ms cubic-bezier(0.2, 0.9, 0.2, 1)`;
    return "none";
  }, [isFlipping, isSettling]);

  const resultLabel = result === "heads" ? "Cara" : result === "tails" ? "Cruz" : "—";

  useEffect(() => {
    return () => {
      if (flipTimeoutRef.current) window.clearTimeout(flipTimeoutRef.current);
      if (settleTimeoutRef.current) window.clearTimeout(settleTimeoutRef.current);
    };
  }, []);

  function handleFlip() {
    if (!canInteract) return;

    /* SFX: click on user action + success when the result settles. */
    sfx.click();

    const next: CoinSide = Math.random() < 0.5 ? "heads" : "tails";
    const desired: 0 | 180 = next === "tails" ? 180 : 0;

    const curNorm = normalize360(rotationY);

    let delta = desired - curNorm;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    const extraSpins = 6 + Math.floor(Math.random() * 3);
    const targetFlip = rotationY + extraSpins * 360 + delta;

    setIsFlipping(true);
    setIsSettling(false);
    setResult(null);
    setRotationY(targetFlip);

    if (flipTimeoutRef.current) window.clearTimeout(flipTimeoutRef.current);
    if (settleTimeoutRef.current) window.clearTimeout(settleTimeoutRef.current);

    flipTimeoutRef.current = window.setTimeout(() => {
      const finalExact = nearestCongruentAngle(targetFlip, desired);

      setIsFlipping(false);
      setIsSettling(true);
      setRotationY(finalExact);

      settleTimeoutRef.current = window.setTimeout(() => {
        setResult(next);
        setIsSettling(false);
        sfx.success();
      }, SETTLE_MS);
    }, FLIP_DURATION_MS);
  }

  function doReset() {
    if (!canInteract) return;

    setResult(null);
    setRotationY(0);
    setResetOpen(false);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Moneda</h1>
        <p className={styles.subtitle}>Cara o cruz, sin vueltas.</p>
      </header>

      <section className={styles.layout}>
        <div className={styles.coinArea}>
          <div className={styles.coinWrap} aria-label="Moneda">
            <div
              className={styles.coin}
              style={{
                transform: `rotateY(${rotationY}deg)`,
                transition,
              }}
            >
              <div className={`${styles.face} ${styles.front}`} aria-hidden="true">
                <CoinFront />
              </div>

              <div className={`${styles.face} ${styles.back}`} aria-hidden="true">
                <CoinBack />
              </div>
            </div>
          </div>

          {result && canInteract && (
            <div className={styles.result} key={result}>
              Resultado: <strong>{resultLabel}</strong>
            </div>
          )}
        </div>

        <aside className={styles.panel}>
          <h2 className={styles.panelTitle}>Acciones</h2>

          <button className={`${styles.spin} btn`} onClick={handleFlip} disabled={!canInteract}>
            {isFlipping || isSettling ? "Lanzando..." : "Lanzar"}
          </button>

          <button
            className={`${styles.reset} btn`}
            onClick={() => {
              sfx.click();
              setResetOpen(true);
            }}
            disabled={!canInteract}
          >
            Resetear
          </button>

          <div className={styles.tips}>
            <div className={styles.tipRow}>
              <span className={styles.tipDot} />
              <span>Durante el lanzamiento se bloquea todo.</span>
            </div>
            <div className={styles.tipRow}>
              <span className={styles.tipDot} />
              <span>El resultado aparece cuando termina el flip.</span>
            </div>
          </div>
        </aside>
      </section>

      <ResetModal open={resetOpen} subject="moneda" onClose={() => setResetOpen(false)} onConfirm={doReset} />
    </div>
  );
}
