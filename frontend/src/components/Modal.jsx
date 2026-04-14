import { X } from "lucide-react";
export function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-visible"
      style={{ marginTop: 0 }}>
      <div className="bg-surface border border-border rounded-xl w-full max-w-md p-6 shadow-2xl transition-colors">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-text font-semibold text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text transition-colors">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
