import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
const Footer = () => {

  return (
    <footer className="bg-[#1C1C1C] text-gray-300 py-4">
      <div className="max-w-7xl mx-auto px-4 text-center ">
        <p className="text-lg mt-1">
          Proudly made by Wexl Digital
          {/* From package.json "version" (vite.config.js) */}
          <span className="ml-3 pl-3 border-l border-gray-600 text-sm text-gray-400 align-middle">
            V.{__APP_VERSION__}
          </span>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
