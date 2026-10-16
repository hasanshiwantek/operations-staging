import { Maximize2, X } from "lucide-react";
import { useEffect, useState } from "react";

// Inline text input with an expand button that opens a large editor modal
const ExpandableTextInput = ({
  name,
  label,
  value,
  onChange,
  disabled,
  maxLength,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const openEditor = () => {
    setDraft(value ?? "");
    setIsOpen(true);
  };

  const handleDone = () => {
    onChange({ target: { name, value: draft } });
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <>
      <div className="flex items-center gap-1 w-full min-w-0">
        <input
          type="text"
          name={name}
          value={value ?? ""}
          onChange={onChange}
          disabled={disabled}
          maxLength={maxLength}
          className={className}
        />
        <button
          type="button"
          onClick={openEditor}
          className="shrink-0 p-0.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded"
          title={disabled ? "View full text" : "Expand to edit"}
        >
          <Maximize2 size={12} />
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[120] p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-4 py-2.5 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">{label}</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 p-4 flex flex-col min-h-0">
              <textarea
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={disabled}
                maxLength={maxLength}
                className="flex-1 w-full resize-none border border-gray-300 rounded-md p-3 text-sm text-gray-800 outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-600"
              />
              {maxLength && (
                <p className="mt-1.5 text-xs text-right text-gray-500">
                  {draft.length} / {maxLength}
                </p>
              )}
            </div>

            <div className="border-t px-4 py-2.5 flex justify-center gap-3 bg-gray-50">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full sm:w-[150px] py-1.5 px-4 border border-gray-300 bg-white hover:bg-gray-100 font-medium text-sm text-gray-700 transition-colors"
              >
                Cancel
              </button>
              {!disabled && (
                <button
                  type="button"
                  onClick={handleDone}
                  className="w-full sm:w-[150px] py-1.5 px-4 bg-[#06245f] hover:bg-[#041b4a] text-white font-medium text-sm transition-colors"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExpandableTextInput;
