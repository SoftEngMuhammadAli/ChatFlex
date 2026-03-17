import React from "react";
import { Activity } from "lucide-react";

const ErrorToast = ({ message }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-8 right-8">
      <div className="bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4">
        <Activity size={20} />
        <div>
          <p className="text-xs font-black uppercase">Data Stream Error</p>
          <p className="text-sm">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default ErrorToast;
