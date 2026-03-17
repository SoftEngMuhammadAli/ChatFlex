import React from "react";

const InviteTeamMemberForm = ({
  inviteForm,
  setInviteForm,
  allowedRoles,
  inviteLoading,
  handleInviteSubmit,
}) => {
  return (
    <form
      onSubmit={handleInviteSubmit}
      className="mt-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-1 md:grid-cols-5 gap-3"
    >
      <input
        type="text"
        value={inviteForm.name}
        onChange={(e) =>
          setInviteForm((prev) => ({ ...prev, name: e.target.value }))
        }
        placeholder="Full name (optional)"
        className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
      />

      <input
        type="email"
        required
        value={inviteForm.email}
        onChange={(e) =>
          setInviteForm((prev) => ({ ...prev, email: e.target.value }))
        }
        placeholder="Email address"
        className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
      />

      <select
        value={inviteForm.role}
        onChange={(e) =>
          setInviteForm((prev) => ({ ...prev, role: e.target.value }))
        }
        className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-emerald-500 capitalize"
      >
        {allowedRoles.map((role) => (
          <option key={role} value={role} className="capitalize">
            {role}
          </option>
        ))}
      </select>

      <input
        type="text"
        value={inviteForm.departments}
        onChange={(e) =>
          setInviteForm((prev) => ({
            ...prev,
            departments: e.target.value,
          }))
        }
        placeholder="Departments (sales,support)"
        className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
      />

      <button
        type="submit"
        disabled={inviteLoading}
        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold"
      >
        {inviteLoading ? "Sending..." : "Send Invitation"}
      </button>
    </form>
  );
};

export default InviteTeamMemberForm;
