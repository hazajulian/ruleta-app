import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./RandomNumberPage.module.css";
import { ResetModal } from "../components/ResetModal/ResetModal";

/* Sound effects (non-intrusive UI feedback) */
import { sfx } from "../lib/sfx";

type GenerateMode = "integer" | "decimal";

/* ===========================
   Helpers
   =========================== */

function clampInt(n: number, min: number, max: number) {
  const x = Number.isFinite(n) ? n : min;
  return Math.min(max, Math.max(min, Math.trunc(x)));
}

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

/* ===========================
   Page
   =========================== */

export function RandomNumberPage() {
  /* Mode */
  const [mode, setMode] = useState<GenerateMode>("integer");

  /* Range */
  const [minValue, setMinValue] = useState<number>(1);
  const [maxValue, setMaxValue] = useState<number>(100);

  /* Decimal options */
  const [decimals, setDecimals] = useState<number>(2);
  const [allowNegative, setAllowNegative] = useState<boolean>(true);

  /* Result state */
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string>("—");
  const [lastResult, setLastResult] = useState<string>("");

  const timeoutRef = useRef<number | null>(null);

  /* Reset modal */
  const [resetOpen, setResetOpen] = useState(false);

  /* ===========================
     Derived state
     =========================== */

  const canGenerate = useMemo(() => {
    return Number.isFinite(minValue) && Number.isFinite(maxValue);
  }, [minValue, maxValue]);

  const displayRange = useMemo(() => {
    const a = Math.min(minValue, maxValue);
    const b = Math.max(minValue, maxValue);
    return { a, b };
  }, [minValue, maxValue]);

  const helperText = useMemo(() => {
    if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
      return "Completá min y max con números válidos.";
    }
    if (minValue === maxValue) {
      return "Min y max son iguales: siempre dará ese número.";
    }
    if (minValue > maxValue) {
      return "Tip: Min es mayor que Max. Igual funciona (se invierte internamente).";
    }
    return "Rango listo. Tocá “Generar” para sacar un número al azar.";
  }, [minValue, maxValue]);

  const badge = useMemo(() => {
    if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
      return { label: "Rango inválido", tone: "bad" as const };
    }
    if (minValue > maxValue) {
      return { label: "Rango invertido", tone: "warn" as const };
    }
    return { label: "Listo", tone: "good" as const };
  }, [minValue, maxValue]);

  /* ===========================
     Effects
     =========================== */

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  /* ===========================
     Actions
     =========================== */

  function handleGenerate() {
    if (!canGenerate || isGenerating) return;

    /* SFX: click on generate action + success when the final value is set. */
    sfx.click();

    setIsGenerating(true);
    setLastResult(result);

    const { a, b } = displayRange;
    const DURATION_MS = 700;
    const TICK_MS = 55;
    const startedAt = performance.now();

    const tick = () => {
      const elapsed = performance.now() - startedAt;

      const temp =
        mode === "integer"
          ? String(Math.floor(randomBetween(a, b + 1)))
          : randomBetween(a, b).toFixed(clampInt(decimals, 0, 6));

      setResult(temp);

      if (elapsed < DURATION_MS) {
        timeoutRef.current = window.setTimeout(tick, TICK_MS);
        return;
      }

      let finalValue: string;

      if (mode === "integer") {
        const minI = Math.ceil(a);
        const maxI = Math.floor(b);
        finalValue =
          minI > maxI
            ? String(minI)
            : String(Math.floor(randomBetween(minI, maxI + 1)));
      } else {
        finalValue = randomBetween(a, b).toFixed(clampInt(decimals, 0, 6));
      }

      setResult(finalValue);
      sfx.success();
      timeoutRef.current = window.setTimeout(() => setIsGenerating(false), 120);
    };

    tick();
  }

  function handleSwap() {
    if (isGenerating) return;
    sfx.click();
    setMinValue(maxValue);
    setMaxValue(minValue);
  }

  function doReset() {
    if (isGenerating) return;

    setMode("integer");
    setMinValue(1);
    setMaxValue(100);
    setDecimals(2);
    setAllowNegative(true);
    setResult("—");
    setLastResult("");
    setIsGenerating(false);
    setResetOpen(false);
  }

  function onChangeMin(raw: string) {
    const v = Number(raw);
    if (raw.trim() === "" || Number.isNaN(v)) {
      setMinValue(NaN);
      return;
    }
    setMinValue(allowNegative ? v : Math.max(0, v));
  }

  function onChangeMax(raw: string) {
    const v = Number(raw);
    if (raw.trim() === "" || Number.isNaN(v)) {
      setMaxValue(NaN);
      return;
    }
    setMaxValue(allowNegative ? v : Math.max(0, v));
  }

  function onToggleAllowNegative(next: boolean) {
    if (isGenerating) return;
    sfx.click();
    setAllowNegative(next);

    if (!next) {
      setMinValue((p) => (Number.isFinite(p) ? Math.max(0, p) : p));
      setMaxValue((p) => (Number.isFinite(p) ? Math.max(0, p) : p));
    }
  }

  /* ===========================
     Render
     =========================== */

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Número random</h1>
        <p className={styles.subtitle}>
          Generá un número al azar dentro de un rango. Modo entero o decimal.
        </p>
      </header>

      <div className={styles.layout}>
        {/* Tool */}
        <section className={styles.toolArea}>
          <div className={styles.resultCard}>
            <div className={styles.resultHeader}>
              <span
                className={[
                  styles.badge,
                  badge.tone === "good" && styles.badgeGood,
                  badge.tone === "warn" && styles.badgeWarn,
                  badge.tone === "bad" && styles.badgeBad,
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {badge.label}
              </span>

              <span className={styles.rangeText}>
                {Number.isFinite(minValue) && Number.isFinite(maxValue)
                  ? `Rango: ${displayRange.a} → ${displayRange.b}`
                  : "Rango: —"}
              </span>
            </div>

            <div
              className={[
                styles.resultValue,
                isGenerating && styles.resultRolling,
                result !== "—" && styles.resultPop,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {result}
            </div>

            <div className={styles.metaRow}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Modo</span>
                <span className={styles.metaValue}>
                  {mode === "integer" ? "Entero" : "Decimal"}
                </span>
              </div>

              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Último</span>
                <span className={styles.metaValue}>{lastResult || "—"}</span>
              </div>
            </div>

            <div className={styles.bigActions}>
              <button
                className={`${styles.primaryBtn} btn`}
                onClick={handleGenerate}
                disabled={!canGenerate || isGenerating}
              >
                {isGenerating ? "Generando…" : "Generar"}
              </button>

              <button
                className={`${styles.secondaryBtn} btn`}
                onClick={() => {
                  sfx.click();
                  setResetOpen(true);
                }}
                disabled={isGenerating}
              >
                Resetear
              </button>
            </div>
          </div>
        </section>

        {/* Config */}
        <aside className={styles.actions}>
          <h2 className={styles.panelTitle}>Configuración</h2>

          <div className={styles.block}>
            <div className={styles.segmented}>
              <button
                className={`${styles.segBtn} ${mode === "integer" ? styles.segActive : ""} btn`}
                onClick={() => {
                  if (isGenerating) return;
                  sfx.click();
                  setMode("integer");
                }}
                disabled={isGenerating}
              >
                Entero
              </button>
              <button
                className={`${styles.segBtn} ${mode === "decimal" ? styles.segActive : ""} btn`}
                onClick={() => {
                  if (isGenerating) return;
                  sfx.click();
                  setMode("decimal");
                }}
                disabled={isGenerating}
              >
                Decimal
              </button>
            </div>

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span className={styles.label}>Min</span>
                <input
                  className={styles.input}
                  type="number"
                  value={Number.isFinite(minValue) ? minValue : ""}
                  onChange={(e) => onChangeMin(e.target.value)}
                  disabled={isGenerating}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Max</span>
                <input
                  className={styles.input}
                  type="number"
                  value={Number.isFinite(maxValue) ? maxValue : ""}
                  onChange={(e) => onChangeMax(e.target.value)}
                  disabled={isGenerating}
                />
              </label>
            </div>

            <div className={styles.rowButtons}>
              <button className={`${styles.smallBtn} btn`} onClick={handleSwap} disabled={isGenerating}>
                Invertir rango
              </button>
            </div>
          </div>

          {mode === "decimal" && (
            <div className={styles.block}>
              <h3 className={styles.blockTitle}>Decimales</h3>
              <input
                className={styles.input}
                type="number"
                min={0}
                max={6}
                value={clampInt(decimals, 0, 6)}
                onChange={(e) => setDecimals(clampInt(Number(e.target.value), 0, 6))}
                disabled={isGenerating}
              />
              <p className={styles.hint}>Tip: 2 decimales suele ser ideal.</p>
            </div>
          )}

          <div className={styles.block}>
            <h3 className={styles.blockTitle}>Reglas</h3>

            <label className={styles.switchRow}>
              <input
                type="checkbox"
                checked={allowNegative}
                onChange={(e) => onToggleAllowNegative(e.target.checked)}
                disabled={isGenerating}
              />
              <span>Permitir negativos</span>
            </label>

            <p className={styles.hint}>{helperText}</p>
          </div>
        </aside>
      </div>

      <ResetModal
        open={resetOpen}
        subject="número random"
        onClose={() => setResetOpen(false)}
        onConfirm={doReset}
      />
    </div>
  );
}
