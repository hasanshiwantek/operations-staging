import React from "react";

const StatsCard = ({ label, value, icon, alt }) => {
  return (
    <div className="bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-gray-500 text-xs truncate" title={label}>
          {label}
        </p>
        <img
          src={icon}
          alt={alt || `${label} icon`}
          className="w-6 h-6 shrink-0"
        />
      </div>
      <p className="text-lg font-semibold text-gray-900 truncate">{value}</p>
    </div>
  );
};

export default StatsCard;
