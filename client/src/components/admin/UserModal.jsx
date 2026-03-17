import React from "react";
import {
  X,
  User,
  Mail,
  Shield,
  Lock,
  Save,
  ChevronDown,
  Building2,
} from "lucide-react";
import CustomLoader from "../ui/Loader";

const UserModal = ({
  mode,
  form,
  handleChange,
  handleSubmit,
  closeModal,
  actionLoading,
  roleOptions = ["owner", "admin", "agent", "viewer", "super-admin"],
}) => {
  const authProvider = String(form.authProvider || "local").toLowerCase();
  const oauthProviderId = String(form.oauthProviderId || "").trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-500"
        onClick={closeModal}
      ></div>

      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                {mode === "create" ? "Add New User" : "Edit User"}
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                {mode === "create"
                  ? "Enter the details for the new team member."
                  : "Update the user's information and role."}
              </p>
            </div>
            <button
              onClick={closeModal}
              className="p-2 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 ml-1">
                  Full Name
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 dark:text-slate-500 group-focus-within:text-primary transition-colors">
                    <User size={18} />
                  </div>
                  <input
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl py-2.5 pl-11 pr-4 text-sm text-gray-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all"
                    name="name"
                    placeholder="e.g. Jane Doe"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 ml-1">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 dark:text-slate-500 group-focus-within:text-primary transition-colors">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl py-2.5 pl-11 pr-4 text-sm text-gray-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all"
                    name="email"
                    placeholder="jane@company.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 ml-1">
                  Role
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 dark:text-slate-500 group-focus-within:text-primary transition-colors">
                    <Shield size={18} />
                  </div>
                  <select
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl py-2.5 pl-11 pr-10 text-sm text-gray-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all appearance-none font-semibold"
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    required
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400 dark:text-slate-500">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 ml-1">
                  Departments
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 dark:text-slate-500 group-focus-within:text-primary transition-colors">
                    <Building2 size={18} />
                  </div>
                  <input
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl py-2.5 pl-11 pr-4 text-sm text-gray-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all"
                    name="departments"
                    placeholder="sales,support"
                    value={form.departments || ""}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 ml-1">
                  Password {mode === "edit" ? "(optional)" : ""}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 dark:text-slate-500 group-focus-within:text-primary transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl py-2.5 pl-11 pr-4 text-sm text-gray-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500"
                    name="password"
                    placeholder="********"
                    value={form.password}
                    onChange={handleChange}
                    required={mode === "create"}
                    minLength={mode === "create" ? 6 : 0}
                  />
                </div>
              </div>

              {mode === "edit" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300 ml-1">
                      Sign-in Method
                    </label>
                    <input
                      className="w-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm text-gray-700 dark:text-slate-300 outline-none"
                      value={authProvider}
                      readOnly
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300 ml-1">
                      OAuth User ID
                    </label>
                    <input
                      className="w-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm text-gray-700 dark:text-slate-300 outline-none"
                      value={oauthProviderId || "-"}
                      readOnly
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={closeModal}
                className="px-6 py-2.5 rounded-xl text-gray-600 dark:text-slate-300 font-bold text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-sm shadow-lg shadow-primary/10 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {actionLoading ? (
                  <CustomLoader iconOnly={true} className="w-4 h-4 border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <Save size={16} />
                    <span>
                      {mode === "create" ? "Create User" : "Save Changes"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserModal;
