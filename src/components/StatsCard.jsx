import React from "react";

const StatsCard = ({ label, value, icon, alt }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <p className="text-gray-500 text-sm">{label}</p>
        <img src={icon} alt={alt || `${label} icon`} className="w-8 h-8" />
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
};

export default StatsCard;
