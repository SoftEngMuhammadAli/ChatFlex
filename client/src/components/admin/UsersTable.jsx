import React, { useState, useMemo } from "react";
import {
  Pencil,
  Trash2,
  ChevronRight,
  User as UserIcon,
  Shield,
} from "lucide-react";
import Pagination from "../ui/Pagination";
import UserAvatar from "../ui/UserAvatar";
import CustomLoader from "../ui/Loader";
import ErrorBox from "../ui/ErrorBox";



const ITEMS_PER_PAGE = 8;

const getAuthProvider = (user) =>
  String(user?.authProvider || "local").toLowerCase();

const getAuthBadgeClass = (provider) => {
  if (provider === "google") {
    return "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-500/30";
  }
  if (provider === "github") {
    return "bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-100 dark:border-violet-500/30";
  }
  return "bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-100 dark:border-slate-700";
};

const UsersTable = ({
  users = [],
  roleFilter,
  setRoleFilter,
  ROLE_OPTIONS,
  openEdit,
  handleDelete,
  listLoading,
  listError,
  actionError,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(users.length / ITEMS_PER_PAGE));
  const effectivePage = Math.min(currentPage, totalPages);

  const paginatedUsers = useMemo(() => {
    const start = (effectivePage - 1) * ITEMS_PER_PAGE;
    return users.slice(start, start + ITEMS_PER_PAGE);
  }, [users, effectivePage]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-50 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Team Members</h3>

        <div className="flex items-center gap-3">
          <label
            htmlFor="role-filter"
            className="text-xs font-semibold text-gray-400 dark:text-slate-500"
          >
            Role:
          </label>

          <div className="relative">
            <select
              id="role-filter"
              className="appearance-none bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-lg py-1.5 pl-3 pr-8 outline-none focus:border-primary transition-all text-xs font-bold text-gray-700 dark:text-slate-200"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Users</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <ChevronRight size={14} className="rotate-90" />
            </div>
          </div>
        </div>
      </div>

      {(listError || actionError) && (
        <ErrorBox error={listError || actionError} className="mx-8 mt-6" />
      )}

      {listLoading ? (
        <CustomLoader message="Fetching Directory..." />
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto custom-scrollbar smart-x-scroll">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-50 dark:border-slate-800">
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                    User
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                    Email
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                    Role
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                    Departments
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                    Sign-in
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {paginatedUsers.map((user) => {
                  const id = String(user._id || user.id || "");
                  const provider = getAuthProvider(user);

                  return (
                    <tr
                      key={id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={user.name}
                            src={user.profilePictureUrl}
                            sizeClass="w-8 h-8"
                            textClass="text-xs"
                            className="rounded-lg group-hover:scale-105 transition-transform"
                            fallbackClassName="bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
                          />
                          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">
                            {user.name}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-gray-600 dark:text-slate-300">
                        {user.email}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            user.role === "admin" || user.role === "owner"
                              ? "bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-300 border-red-100 dark:border-red-500/30"
                              : "bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-300 border-gray-100 dark:border-slate-700"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600 dark:text-slate-300">
                        {Array.isArray(user?.departments) && user.departments.length > 0
                          ? user.departments.join(", ")
                          : "-"}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getAuthBadgeClass(
                            provider,
                          )}`}
                        >
                          {provider}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-gray-600 dark:text-slate-300 capitalize">
                        {user.status || "offline"}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEdit(user)}
                            className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-primary hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete?.(id)}
                            className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-8 py-20 text-center">
                      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-500">
                        <UserIcon size={32} />
                      </div>
                      <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-xs">
                        No personnel discovered in this group.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <Pagination
            currentPage={effectivePage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            className="!rounded-none border-0 border-t"
          />
        </>
      )}
    </div>
  );
};

export default UsersTable;
