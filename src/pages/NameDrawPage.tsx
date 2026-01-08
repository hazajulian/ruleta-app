import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./NameDrawPage.module.css";
import { ResetModal } from "../components/ResetModal/ResetModal";

/* Sound effects (non-intrusive UI feedback) */
import { sfx } from "../lib/sfx";

type DurationPreset = "short" | "medium" | "long";

const DURATION_MAP: Record<DurationPreset, number> = {
  short: 3000,
  medium: 6000,
  long: 12000,
};

/* ===========================
   Helpers
   =========================== */

function sanitizeNames(raw: string) {
  return raw
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean);
}

function uniq(list: string[], caseInsensitive: boolean) {
  if (!caseInsensitive) return Array.from(new Set(list));

  const seen = new Set<string>();
  const out: string[] = [];

  for (const n of list) {
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }

  return out;
}

function pickRandom(list: string[]) {
  return list[Math.floor(Math.random() * list.length)];
}

/* ===========================
   Page
   =========================== */

export function NameDrawPage() {
  /* Input */
  const [input, setInput] = useState("");

  /* Rules */
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [caseInsensitiveDupes, setCaseInsensitiveDupes] = useState(true);
  const [excludeWinner, setExcludeWinner] = useState(false);

  /* Duration */
  const [durationPreset, setDurationPreset] = useState<DurationPreset>("medium");

  /* Draw state */
  const [isDrawing, setIsDrawing] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [rollingName, setRollingName] = useState("—");

  /* Reset modal */
  const [resetOpen, setResetOpen] = useState(false);

  /* Excluded winners (case-insensitive) */
  const [excludedSet, setExcludedSet] = useState<Set<string>>(() => new Set());

  /* Copy toast */
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<number | null>(null);

  /* Timers */
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  /* ===========================
     Derived state
     =========================== */

  const baseNames = useMemo(() => sanitizeNames(input), [input]);

  const processedNames = useMemo(() => {
    let list = baseNames;

    if (removeDuplicates) {
      list = uniq(list, caseInsensitiveDupes);
    }

    if (excludeWinner && excludedSet.size > 0) {
      list = list.filter((n) => !excludedSet.has(n.toLowerCase()));
    }

    return list;
  }, [baseNames, removeDuplicates, caseInsensitiveDupes, excludeWinner, excludedSet]);

  const total = processedNames.length;
  const canDraw = total > 0 && !isDrawing;
  const durationMs = DURATION_MAP[durationPreset];
  const statusLabel = isDrawing ? "Sorteando..." : "Listo";

  /* ===========================
     Effects
     =========================== */

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      if (copiedTimeoutRef.current) window.clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  /* ===========================
     Actions
     =========================== */

  function clearCopiedSoon() {
    if (copiedTimeoutRef.current) window.clearTimeout(copiedTimeoutRef.current);
    copiedTimeoutRef.current = window.setTimeout(() => setCopied(false), 1400);
  }

  function handleDraw() {
    if (!canDraw) return;

    /* SFX: click on draw action + success when winner is decided. */
    sfx.click();

    setIsDrawing(true);
    setWinner(null);
    setCopied(false);

    const start = performance.now();
    const end = start + durationMs;

    // Easing progresivo para frenar hacia el final
    let lastTick = start;
    let nextDelay = 35;

    const loop = (now: number) => {
      if (now - lastTick >= nextDelay) {
        lastTick = now;
        setRollingName(pickRandom(processedNames));

        const t = Math.min(1, (now - start) / durationMs);
        nextDelay = 35 + Math.floor(260 * t * t);
      }

      if (now < end) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const final = pickRandom(processedNames);
      setRollingName(final);
      setWinner(final);

      if (excludeWinner) {
        setExcludedSet((prev) => {
          const copy = new Set(prev);
          copy.add(final.toLowerCase());
          return copy;
        });
      }

      sfx.success();
      timeoutRef.current = window.setTimeout(() => setIsDrawing(false), 160);
    };

    rafRef.current = requestAnimationFrame(loop);
  }

  async function handleCopy() {
    if (!winner || isDrawing) return;

    /* SFX: click feedback for copy action (success remains reserved for draw result). */
    sfx.click();

    try {
      await navigator.clipboard.writeText(winner);
    } catch {
      // Silent fallback
    } finally {
      setCopied(true);
      clearCopiedSoon();
    }
  }

  function doResetAll() {
    if (isDrawing) return;

    setInput("");
    setWinner(null);
    setRollingName("—");
    setExcludedSet(new Set());
    setCopied(false);

    setDurationPreset("medium");
    setRemoveDuplicates(true);
    setCaseInsensitiveDupes(true);
    setExcludeWinner(false);

    setResetOpen(false);
  }

  function handleResetWinners() {
    if (isDrawing) return;

    /* SFX: click feedback on cleanup action. */
    sfx.click();

    setExcludedSet(new Set());
    setWinner(null);
    setRollingName("—");
    setCopied(false);
  }

  /* ===========================
     Render
     =========================== */

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Sorteo de nombres</h1>
        <p className={styles.subtitle}>Pegá una lista de nombres y sorteá un ganador al azar.</p>
      </header>

      <div className={styles.layout}>
        <section className={styles.toolArea}>
          <div className={styles.resultCard}>
            <div className={styles.resultTop}>
              <span className={styles.badge} data-state={isDrawing ? "run" : "idle"}>
                {statusLabel}
              </span>

              <span className={styles.miniInfo}>
                Total: <strong>{total}</strong>
                {excludeWinner && excludedSet.size > 0 ? (
                  <>
                    {" "}
                    · Excluidos: <strong>{excludedSet.size}</strong>
                  </>
                ) : null}
              </span>
            </div>

            <div
              className={[
                styles.resultValue,
                isDrawing && styles.rolling,
                winner && styles.pop,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {winner ?? rollingName}
            </div>

            <div className={styles.actionsRow}>
              <button className={`${styles.primaryBtn} btn`} onClick={handleDraw} disabled={!canDraw}>
                {isDrawing ? "Sorteando..." : "Sortear"}
              </button>

              <button
                className={`${styles.secondaryBtn} btn`}
                onClick={() => {
                  sfx.click();
                  setResetOpen(true);
                }}
                disabled={isDrawing}
              >
                Reset completo
              </button>
            </div>

            <div className={styles.actionsRow}>
              <button
                className={`${styles.ghostBtn} btn`}
                onClick={handleCopy}
                disabled={!winner || isDrawing}
                title="Copiar ganador"
              >
                Copiar ganador
              </button>

              <button
                className={`${styles.ghostBtn} btn`}
                onClick={handleResetWinners}
                disabled={isDrawing}
                title="Borrar resultado y excluidos"
              >
                Limpiar ganadores
              </button>
            </div>

            <div className={`${styles.toast} ${copied ? styles.toastShow : ""}`} aria-live="polite">
              Nombre copiado
            </div>
          </div>
        </section>

        <aside className={styles.panel}>
          <h2 className={styles.panelTitle}>Lista</h2>

          <textarea
            className={styles.textarea}
            placeholder="Un nombre por línea..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isDrawing}
          />

          <div className={styles.panelGroup}>
            <div className={styles.panelSubTitle}>Duración</div>

            <div className={styles.segment} role="tablist" aria-label="Duración del sorteo">
              <button
                type="button"
                className={`${styles.segBtn} ${durationPreset === "short" ? styles.segActive : ""} btn`}
                onClick={() => {
                  sfx.click();
                  setDurationPreset("short");
                }}
                disabled={isDrawing}
                aria-pressed={durationPreset === "short"}
              >
                Rápido <span className={styles.segHint}>3s</span>
              </button>

              <button
                type="button"
                className={`${styles.segBtn} ${durationPreset === "medium" ? styles.segActive : ""} btn`}
                onClick={() => {
                  sfx.click();
                  setDurationPreset("medium");
                }}
                disabled={isDrawing}
                aria-pressed={durationPreset === "medium"}
              >
                Normal <span className={styles.segHint}>6s</span>
              </button>

              <button
                type="button"
                className={`${styles.segBtn} ${durationPreset === "long" ? styles.segActive : ""} btn`}
                onClick={() => {
                  sfx.click();
                  setDurationPreset("long");
                }}
                disabled={isDrawing}
                aria-pressed={durationPreset === "long"}
              >
                Suspenso <span className={styles.segHint}>12s</span>
              </button>
            </div>
          </div>

          <div className={styles.panelGroup}>
            <div className={styles.panelSubTitle}>Reglas</div>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={removeDuplicates}
                onChange={(e) => {
                  sfx.click();
                  setRemoveDuplicates(e.target.checked);
                }}
                disabled={isDrawing}
              />
              Quitar duplicados
            </label>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={caseInsensitiveDupes}
                onChange={(e) => {
                  sfx.click();
                  setCaseInsensitiveDupes(e.target.checked);
                }}
                disabled={isDrawing || !removeDuplicates}
              />
              Ignorar mayúsculas/minúsculas
            </label>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={excludeWinner}
                onChange={(e) => {
                  sfx.click();
                  setExcludeWinner(e.target.checked);
                }}
                disabled={isDrawing}
              />
              Excluir ganador (no repetir)
            </label>
          </div>

          <div className={styles.info}>
            Tip: para más suspenso, elegí <strong>“Suspenso”</strong>.
          </div>
        </aside>
      </div>

      <ResetModal
        open={resetOpen}
        subject="sorteo"
        onClose={() => setResetOpen(false)}
        onConfirm={doResetAll}
      />
    </div>
  );
}
