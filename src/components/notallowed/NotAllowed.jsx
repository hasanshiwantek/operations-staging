import React from "react";
import Lockicon from "../../assets/lock-icon.svg"

const NotAllowed = () => {
  return (
    <div className="flex flex-col items-center justify-center h-80 text-center p-6">
      {/* Icon */}
      <div className="w-20 h-20 flex items-center justify-center rounded-full border-2mb-6">
        <img src={Lockicon} alt="lock-icon" />
      </div>

      {/* Main message */}
      <h1 className="text-2xl font-semibold mb-2 text-gray-800">
        You don’t have access to this page
      </h1>

      {/* Sub message */}
      <p className="text-gray-500">
        Your account does not have permission to view this page. Contact your administrator.
      </p>
    </div>
  );
};

export default NotAllowed;
