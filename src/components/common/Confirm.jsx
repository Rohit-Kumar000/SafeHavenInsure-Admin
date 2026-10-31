import Modal from "./Modal";
import { btnDanger, btnGhost, btnPrimary } from "./ui";

function Confirm({ open, title, message, children, confirmLabel = "Confirm", danger, disabled, onConfirm, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-3 text-sm text-gray-600 dark:text-slate-300">
        {message && <p>{message}</p>}
        {children}
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className={btnGhost}>Cancel</button>
        <button onClick={onConfirm} disabled={disabled} className={danger ? btnDanger : btnPrimary}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export default Confirm;