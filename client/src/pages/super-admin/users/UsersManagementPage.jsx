import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Plus, Search } from "lucide-react";
import UserModal from "../../../components/admin/UserModal";
import UsersTable from "../../../components/admin/UsersTable";
import Pagination from "../../../components/ui/Pagination";
import {
  fetchAllUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  selectAdminUsers,
  selectAdminUsersListLoading,
  selectAdminUsersActionLoading,
  selectAdminUsersError,
  selectAdminUsersActionError,
} from "../../../features/adminUsers/adminUsersSlice";

const ROLE_OPTIONS = ["owner", "admin", "agent", "viewer", "super-admin"];

const defaultForm = {
  id: "",
  name: "",
  email: "",
  role: "viewer",
  password: "",
  authProvider: "local",
  oauthProviderId: "",
};

const UsersManagementPage = () => {
  const dispatch = useDispatch();
  const users = useSelector(selectAdminUsers);
  const listLoading = useSelector(selectAdminUsersListLoading);
  const actionLoading = useSelector(selectAdminUsersActionLoading);
  const listError = useSelector(selectAdminUsersError);
  const actionError = useSelector(selectAdminUsersActionError);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [modalMode, setModalMode] = useState(null);
  const [form, setForm] = useState(defaultForm);

  // ✅ Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    dispatch(fetchAllUsers());
  }, [dispatch]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.name?.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  // ✅ Reset to page 1 when filters/search/pageSize change (prevents empty pages)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [search, roleFilter, pageSize]);

  // ✅ Derived pagination values
  const totalItems = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedUsers = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, safePage, pageSize]);

  const openCreate = () => {
    setForm(defaultForm);
    setModalMode("create");
  };

  const openEdit = (user) => {
    setForm({
      id: String(user._id || user.id || ""),
      name: user.name || "",
      email: user.email || "",
      role: user.role || "viewer",
      password: "",
      authProvider: user.authProvider || "local",
      oauthProviderId: user.oauthProviderId || "",
    });
    setModalMode("edit");
  };

  const closeModal = () => {
    if (actionLoading) return;
    setModalMode(null);
    setForm(defaultForm);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (modalMode === "create") {
      await dispatch(
        createAdminUser({
          name: form.name,
          email: form.email,
          role: form.role,
          password: form.password,
        }),
      ).unwrap();
      closeModal();
      return;
    }

    await dispatch(
      updateAdminUser({
        id: form.id,
        updates: {
          name: form.name,
          email: form.email,
          role: form.role,
          ...(form.password ? { password: form.password } : {}),
        },
      }),
    ).unwrap();
    closeModal();
  };

  const handleDelete = async () => {
    if (!form.id || actionLoading) return;
    await dispatch(deleteAdminUser(form.id)).unwrap();
    closeModal();
  };

  return (
    <div className="theme-page pb-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500" />
          {users.length} total
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold flex items-center gap-2 hover:bg-primary-hover"
        >
          <Plus size={14} />
          Add User
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-80">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
          />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search users..."
            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/10"
          />
        </div>

        {/* ✅ Page size selector */}
        <div className="flex items-center justify-between md:justify-end gap-3">
          <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">
            Rows per page
          </span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/10"
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <UsersTable
        users={paginatedUsers}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        ROLE_OPTIONS={ROLE_OPTIONS}
        openEdit={openEdit}
        listLoading={listLoading}
        listError={listError}
        actionError={actionError}
      />

      {modalMode && (
        <div>
          <UserModal
            mode={modalMode}
            form={form}
            handleChange={handleFormChange}
            handleSubmit={handleSubmit}
            closeModal={closeModal}
            actionLoading={actionLoading}
          />
          {modalMode === "edit" && (
            <div className="fixed inset-0 z-50 pointer-events-none flex items-end justify-center p-6">
              <button
                type="button"
                onClick={handleDelete}
                disabled={actionLoading}
                className="pointer-events-auto px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold text-sm hover:bg-rose-100 dark:hover:bg-rose-500/20 disabled:opacity-50"
              >
                Delete Selected User
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UsersManagementPage;

