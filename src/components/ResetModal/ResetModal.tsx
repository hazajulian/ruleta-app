import { useEffect } from "react";
import styles from "./ResetModal.module.css";

/* Sound effects (UI feedback on user actions) */
import { sfx } from "../../lib/sfx";

/* Props del modal de confirmación reutilizable */
type ResetModalProps = {
  open: boolean;
  subject?: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function ResetModal({ open, subject = "herramienta", onClose, onConfirm }: ResetModalProps) {
  /* Side-effects del modal: Escape, focus y scroll-lock */
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={`Confirmar reset de ${subject}`}
      onMouseDown={() => {
        sfx.click(); // UI feedback on backdrop close
        onClose();
      }}
    >
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <button
          className={styles.close}
          onClick={() => {
            sfx.click(); // UI feedback on close action
            onClose();
          }}
          aria-label="Cerrar"
        >
          ✕
        </button>

        <h3 className={styles.title}>Restablecer {subject}</h3>

        <p className={styles.text}>
          Vas a perder tu configuración actual y volver a los valores iniciales.
        </p>

        <div className={styles.actions}>
          <button
            className={`${styles.btnGhost} btn`}
            onClick={() => {
              sfx.click(); // UI feedback on cancel
              onClose();
            }}
          >
            Cancelar
          </button>

          <button
            className={`${styles.btnPrimary} btn`}
            onClick={() => {
              sfx.click(); // UI feedback on confirm
              onConfirm();
            }}
          >
            Resetear
          </button>
        </div>
      </div>
    </div>
  );
}
