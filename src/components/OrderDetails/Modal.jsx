import React, { useState } from "react";

const Modal = ({ title, options, selected, onSelect, onClose }) => {
  const [current, setCurrent] = useState(selected);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white w-full max-w-xs rounded-2xl p-5 shadow-lg">
        <h3 className="text-gray-700 font-semibold mb-4">{title}</h3>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {options.map((option, i) => {
            // Support both {label, value} objects and simple values
            const value = option?.value !== undefined ? option.value : option;
            const label = option?.label || null;

            const isActive = current === value;

            return (
              <button
                key={i}
                onClick={() => setCurrent(value)}
                className={`w-full px-3 py-2 rounded-lg flex items-center justify-between ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                {label ? <span>{label}</span> : <span>{value}</span>}
                <div className="flex items-center gap-2">
                  {label && <span className="font-medium">{value}</span>}
                  {isActive && (
                    <span className="text-indigo-600 font-bold">✓</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-between mt-4">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-100"
          >
            Close
          </button>
          <button
            onClick={() => {
              onSelect(current);
              onClose();
            }}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
