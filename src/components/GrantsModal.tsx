import { useEffect } from "react";
import { createPortal } from "react-dom";
import GrantsView from "./GrantsView";

type GrantsModalProps = {
  title: string;
  grants: any[];
  downloadFilename: string;
  onClose: () => void;
};

const parseAmount = (v: unknown) => {
  if (typeof v === "number") return v;
  const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const formatUsd = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

export default function GrantsModal({
  title,
  grants,
  downloadFilename,
  onClose,
}: GrantsModalProps) {
  // Close on Escape, and lock background scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const totalFunding = grants.reduce(
    (sum, g) => sum + parseAmount(g?.["Amount"] ?? g?.Amount),
    0
  );

  return createPortal(
    <div
      className="grantsModalBackdrop"
      onMouseDown={(e) => {
        // Only close when the click starts on the backdrop itself.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="grantsModal"
        role="dialog"
        aria-modal="true"
        aria-label={`${title} — grants`}
      >
        <div className="grantsModalHeader">
          <div className="grantsModalTitleBlock">
            <div className="grantsModalTitle">{title}</div>
            <div className="grantsModalMeta">
              <strong>{grants.length.toLocaleString()}</strong> grant
              {grants.length === 1 ? "" : "s"}
              <span className="grantsModalFunding">{formatUsd(totalFunding)}</span>
            </div>
          </div>
          <button
            type="button"
            className="grantsModalClose"
            aria-label="Close"
            title="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="grantsModalBody">
          <GrantsView grants={grants} downloadFilename={downloadFilename} />
        </div>
      </div>
    </div>,
    document.body
  );
}
