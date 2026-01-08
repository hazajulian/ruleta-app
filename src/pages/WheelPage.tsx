import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import styles from "./WheelPage.module.css";
import { ResetModal } from "../components/ResetModal/ResetModal";

/* Sound effects (non-intrusive UI feedback) */
import { sfx } from "../lib/sfx";

type WheelOption = {
  id: string;
  label: string;
  color: string;
};

const STORAGE_KEY = "ruletita.options.v2";

const PALETTE = [
  "#FF6B6B",
  "#FFD93D",
  "#6BCB77",
  "#4D96FF",
  "#9D4EDD",
  "#FF922B",
  "#38BDF8",
  "#F472B6",
];

const SPIN_DURATION_MS = 10000;

/* Generates a stable id for new options. */
function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/* Migrates old storage formats to v2 if needed. */
function toV2Options(raw: unknown): WheelOption[] | null {
  if (
    Array.isArray(raw) &&
    raw.every((x) => x && typeof x === "object" && "id" in x && "label" in x && "color" in x)
  ) {
    return raw as WheelOption[];
  }

  if (Array.isArray(raw) && raw.every((x) => typeof x === "string")) {
    const arr = raw as string[];
    return arr.map((label, idx) => ({
      id: makeId(),
      label,
      color: PALETTE[idx % PALETTE.length],
    }));
  }

  return null;
}

/* Default wheel options when storage is empty or invalid. */
const DEFAULT_OPTIONS: WheelOption[] = [
  { id: makeId(), label: "Opción 1", color: PALETTE[0] },
  { id: makeId(), label: "Opción 2", color: PALETTE[1] },
  { id: makeId(), label: "Opción 3", color: PALETTE[2] },
];

/* Geometry helpers for winner detection. */
function centerOfRect(r: DOMRect) {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
function dist2(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function WheelPage() {
  /* Options state with localStorage hydration. */
  const [options, setOptions] = useState<WheelOption[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_OPTIONS;

    try {
      const parsed = JSON.parse(saved);
      return toV2Options(parsed) ?? DEFAULT_OPTIONS;
    } catch {
      return DEFAULT_OPTIONS;
    }
  });

  /* UI state. */
  const [inputValue, setInputValue] = useState("");
  const [winner, setWinner] = useState<WheelOption | null>(null);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  /* Timers/refs. */
  const timeoutRef = useRef<number | null>(null);
  const colorInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const pointerRef = useRef<HTMLDivElement | null>(null);
  const markerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  /* Derived flags. */
  const canAdd = useMemo(() => inputValue.trim().length > 0, [inputValue]);
  const canSpin = options.length >= 2 && !isSpinning;

  const showLabels = options.length > 0 && options.length <= 10;
  const showNumbers = options.length > 10;

  const sliceDeg = useMemo(() => (options.length ? 360 / options.length : 360), [options.length]);

  /* Persist options to localStorage. */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
  }, [options]);

  /* Cleanup timers on unmount. */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  /* Builds the conic gradient based on current options. */
  const wheelBackground = useMemo(() => {
    const n = Math.max(options.length, 1);
    const slice = 360 / n;

    const stops: string[] = [];
    for (let i = 0; i < n; i++) {
      const start = i * slice;
      const end = (i + 1) * slice;
      const color = options[i]?.color ?? PALETTE[i % PALETTE.length];
      stops.push(`${color} ${start}deg ${end}deg`);
    }

    return `conic-gradient(from -90deg, ${stops.join(", ")})`;
  }, [options]);

  /* Picks the least-used palette color to keep variety. */
  function pickNextColor() {
    const count = new Map<string, number>();
    for (const o of options) count.set(o.color, (count.get(o.color) ?? 0) + 1);

    let best = PALETTE[0];
    let bestCount = Number.POSITIVE_INFINITY;

    for (const c of PALETTE) {
      const cCount = count.get(c) ?? 0;
      if (cCount < bestCount) {
        bestCount = cCount;
        best = c;
      }
    }

    return best;
  }

  /* Adds a new option to the wheel. */
  function addOption() {
    if (isSpinning) return;

    const value = inputValue.trim();
    if (!value) return;

    sfx.click();

    const newOpt: WheelOption = {
      id: makeId(),
      label: value,
      color: pickNextColor(),
    };

    setOptions((prev) => [...prev, newOpt]);
    setInputValue("");
    setWinner(null);
  }

  /* Removes an option from the wheel. */
  function removeOption(idToRemove: string) {
    if (isSpinning) return;

    sfx.click();

    setOptions((prev) => prev.filter((o) => o.id !== idToRemove));
    setWinner(null);
  }

  /* Updates option color. */
  function updateColor(id: string, color: string) {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, color } : o)));
  }

  /* Form submit handler. */
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    addOption();
  }

  /* Resets wheel to default options. */
  function doReset() {
    if (isSpinning) return;
    setOptions(DEFAULT_OPTIONS);
    setWinner(null);
    setRotationDeg(0);
    setResetOpen(false);
  }

  /* Opens the hidden native color picker. */
  function openColorPicker(id: string) {
    if (isSpinning) return;

    sfx.click();

    const el = colorInputRefs.current[id];
    if (!el) return;
    el.click();
  }

  /* Computes the winner based on closest marker to the pointer tip. */
  function computeWinnerByGeometry(): WheelOption | null {
    const pointerEl = pointerRef.current;
    if (!pointerEl) return null;

    const pointerRect = pointerEl.getBoundingClientRect();
    const pointerPoint = centerOfRect(pointerRect);

    let bestId: string | null = null;
    let bestD = Number.POSITIVE_INFINITY;

    for (const opt of options) {
      const el = markerRefs.current[opt.id];
      if (!el) continue;

      const r = el.getBoundingClientRect();
      const c = centerOfRect(r);
      const d = dist2(pointerPoint, c);

      if (d < bestD) {
        bestD = d;
        bestId = opt.id;
      }
    }

    if (!bestId) return null;
    return options.find((o) => o.id === bestId) ?? null;
  }

  /* Spins the wheel and resolves a winner after the animation. */
  function spin() {
    if (!canSpin) return;

    sfx.click();

    setIsSpinning(true);
    setWinner(null);

    const n = options.length;
    const slice = 360 / n;

    const targetIndex = Math.floor(Math.random() * n);
    const safeOffset = slice * (0.18 + Math.random() * 0.64);

    const targetAngle = -90 + targetIndex * slice + safeOffset;
    const extraSpins = 6 + Math.floor(Math.random() * 3);

    const rotFinalWithin360 = 360 - targetAngle;
    const target = rotationDeg + extraSpins * 360 + rotFinalWithin360;

    setRotationDeg(target);

    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);

    timeoutRef.current = window.setTimeout(() => {
      setWinner(computeWinnerByGeometry());
      setIsSpinning(false);
      sfx.success();
    }, SPIN_DURATION_MS);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Ruleta</h1>
        <p className={styles.subtitle}>Agregá opciones, girá y dejá que la suerte decida.</p>
      </header>

      <section className={styles.layout}>
        <div className={styles.wheelArea}>
          <div className={styles.wheelWrap}>
            {/* Premium rim / shell */}
            <div className={styles.wheelShell} aria-hidden="true" />

            <div
              className={styles.wheel}
              style={{
                background: wheelBackground,
                transform: `rotate(${rotationDeg}deg)`,
                transition: isSpinning
                  ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.12, 0.8, 0.12, 1)`
                  : "none",
              }}
              aria-label="Wheel"
            >
              {/* Depth overlays (no blur / no blend-modes that wash colors) */}
              <div className={styles.wheelOverlays} aria-hidden="true">
                <div className={styles.wheelShine} />
                <div className={styles.wheelShade} />
                <div className={styles.wheelGrain} />
              </div>

              {showLabels && (
                <div className={styles.labels} aria-hidden="true">
                  {options.map((opt, idx) => {
                    const gradientCenter = -90 + (idx + 0.5) * sliceDeg;
                    const transformAngle = gradientCenter - 90;
                    const radius = 118;

                    return (
                      <div
                        key={opt.id}
                        className={styles.label}
                        style={{
                          transform: `translate(-50%, -50%) rotate(${transformAngle}deg) translateX(${radius}px)`,
                        }}
                        title={opt.label}
                      >
                        <span
                          className={styles.labelText}
                          style={{ transform: `rotate(${-(rotationDeg + transformAngle)}deg)` }}
                        >
                          {opt.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {showNumbers && (
                <div className={styles.labels} aria-hidden="true">
                  {options.map((opt, idx) => {
                    const gradientCenter = -90 + (idx + 0.5) * sliceDeg;
                    const transformAngle = gradientCenter - 90;
                    const radius = 126;

                    return (
                      <div
                        key={`num-${opt.id}`}
                        className={styles.number}
                        style={{
                          transform: `translate(-50%, -50%) rotate(${transformAngle}deg) translateX(${radius}px)`,
                        }}
                      >
                        <span
                          className={styles.numberText}
                          style={{ transform: `rotate(${-(rotationDeg + transformAngle)}deg)` }}
                        >
                          {idx + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Hidden markers for winner detection */}
              <div className={styles.labels} aria-hidden="true">
                {options.map((opt, idx) => {
                  const gradientCenter = -90 + (idx + 0.5) * sliceDeg;
                  const transformAngle = gradientCenter - 90;
                  const radius = 118;

                  return (
                    <div
                      key={`marker-${opt.id}`}
                      ref={(el) => {
                        markerRefs.current[opt.id] = el;
                      }}
                      className={styles.marker}
                      style={{
                        transform: `translate(-50%, -50%) rotate(${transformAngle}deg) translateX(${radius}px)`,
                      }}
                    />
                  );
                })}
              </div>

              <div className={styles.wheelCenter}>
                <div className={styles.wheelCenterInner} />
              </div>
            </div>

            {/* Pointer (no bubble) */}
            <div ref={pointerRef} className={styles.pointer} aria-hidden="true">
              <span className={styles.pointerTip} />
              <span className={styles.pointerBase} />
            </div>
          </div>

          <div className={styles.wheelControls}>
            <div className={styles.wheelButtons}>
              <button
                className={`${styles.spin} btn`}
                onClick={spin}
                disabled={!canSpin}
                title={!canSpin ? "Necesitás al menos 2 opciones" : "Girar"}
              >
                {isSpinning ? "Girando..." : "Girar"}
              </button>

              <button
                className={`${styles.reset} btn`}
                onClick={() => {
                  sfx.click();
                  setResetOpen(true);
                }}
                disabled={isSpinning}
                title="Restablecer a valores iniciales"
              >
                Resetear
              </button>
            </div>

            {winner && (
              <div className={styles.result} key={winner.id}>
                🎉 Resultado: <strong>{winner.label}</strong>
              </div>
            )}

            {showNumbers && (
              <div className={styles.legend} aria-label="Leyenda de opciones">
                {options.map((opt, idx) => (
                  <div key={`legend-${opt.id}`} className={styles.legendRow} title={opt.label}>
                    <span className={styles.legendNum}>{idx + 1}</span>
                    <span
                      className={styles.legendDot}
                      style={{ backgroundColor: opt.color }}
                      aria-hidden="true"
                    />
                    <span className={styles.legendText}>{opt.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className={styles.panel}>
          <h2 className={styles.panelTitle}>Opciones</h2>

          <form className={styles.inputRow} onSubmit={handleSubmit}>
            <input
              className={styles.input}
              placeholder="Ej: Pizza"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isSpinning}
            />
            <button
              className={`${styles.button} btn`}
              type="submit"
              disabled={!canAdd || isSpinning}
              title={isSpinning ? "Esperá a que termine" : "Agregar"}
            >
              Agregar
            </button>
          </form>

          <div className={styles.list}>
            {options.length === 0 ? (
              <div className={styles.empty}>No hay opciones. Agregá al menos 1.</div>
            ) : (
              options.map((opt) => (
                <div key={opt.id} className={styles.item}>
                  <button
                    type="button"
                    className={styles.dotButton}
                    onClick={() => openColorPicker(opt.id)}
                    disabled={isSpinning}
                    title="Cambiar color"
                    aria-label={`Cambiar color de ${opt.label}`}
                  >
                    <span className={styles.dot} style={{ backgroundColor: opt.color }} aria-hidden="true" />
                  </button>

                  <span className={styles.itemText}>{opt.label}</span>

                  <input
                    ref={(el) => {
                      colorInputRefs.current[opt.id] = el;
                    }}
                    className={styles.colorHidden}
                    type="color"
                    value={opt.color}
                    onChange={(e) => updateColor(opt.id, e.target.value)}
                    disabled={isSpinning}
                    aria-hidden="true"
                    tabIndex={-1}
                  />

                  <button
                    className={`${styles.remove} btn`}
                    type="button"
                    onClick={() => removeOption(opt.id)}
                    disabled={isSpinning}
                    title={isSpinning ? "Esperá a que termine" : "Eliminar"}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>
      </section>

      <ResetModal open={resetOpen} subject="ruleta" onClose={() => setResetOpen(false)} onConfirm={doReset} />
    </div>
  );
}
