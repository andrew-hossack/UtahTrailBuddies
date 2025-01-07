import React from "react";

interface CustomAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmClassName?: string;
}

const CustomAlertDialog: React.FC<CustomAlertDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmClassName = "",
}) => {
  if (!open) return null;

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  // Handle escape key press
  // eslint-disable-next-line react-hooks/rules-of-hooks
  React.useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [open, onOpenChange]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        <div className="mb-6">
          <h2 id="alert-dialog-title" className="text-xl font-semibold mb-2">
            {title}
          </h2>
          <p id="alert-dialog-description" className="text-gray-600">
            {description}
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => {
              onCancel?.();
              onOpenChange(false);
            }}
            className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-800"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm?.();
              onOpenChange(false);
            }}
            className={`px-4 py-2 rounded text-white ${
              confirmClassName || "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomAlertDialog;
