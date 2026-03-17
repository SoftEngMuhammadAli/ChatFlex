import React from "react";

const LogoutButton = ({ closeLogoutDialog, confirmLogout }) => {
  return (
    <div className="mt-5 flex items-center justify-end gap-2">
      <button
        onClick={closeLogoutDialog}
        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        Cancel
      </button>
      <button
        onClick={confirmLogout}
        className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
      >
        Yes, Logout
      </button>
    </div>
  );
};

export default LogoutButton;
