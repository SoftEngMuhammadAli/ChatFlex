import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  RefreshCcw,
  UserPlus,
  Users,
  ShieldCheck,
  Activity,
  Zap,
} from "lucide-react";
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUserById,
  fetchAllUsers,
  updateAdminUser,
  selectAdminUsers,
  selectAdminUsersActionError,
  selectAdminUsersActionLoading,
  selectAdminUsersError,
  selectAdminUsersListLoading,
} from "../../features/adminUsers/adminUsersSlice";
import { selectUser } from "../../features/auth/authSlice";

import StatsCard from "../../components/ui/StatsCard";

// Admin Components
import UserModal from "../../components/admin/UserModal";
import UsersTable from "../../components/admin/UsersTable";

const emptyForm = {
  name: "",
  email: "",
  role: "agent",
  departments: "",
  password: "",
  authProvider: "local",
  oauthProviderId: "",
};
const getUserId = (user) => String(user?._id || user?.id || "");

const UsersPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const sessionUser = useSelector(selectUser);
  const sessionRole = String(sessionUser?.role || "").toLowerCase();
  const users = useSelector(selectAdminUsers);
  const listLoading = useSelector(selectAdminUsersListLoading);
  const listError = useSelector(selectAdminUsersError);
  const actionLoading = useSelector(selectAdminUsersActionLoading);
  const actionError = useSelector(selectAdminUsersActionError);

  const [roleFilter, setRoleFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState("create");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    dispatch(fetchAllUsers());
  }, [dispatch]);

  const roleOptions = useMemo(() => {
    if (sessionRole === "owner") return ["admin", "agent", "viewer"];
    if (sessionRole === "admin") return ["agent", "viewer"];
    return ["agent", "viewer"];
  }, [sessionRole]);

  const tableRoleOptions = useMemo(() => {
    if (sessionRole === "owner") return ["owner", ...roleOptions];
    return roleOptions;
  }, [sessionRole, roleOptions]);

  const manageableUsers = useMemo(() => {
    if (sessionRole === "owner") {
      return users.filter((user) => user.role !== "super-admin");
    }
    if (sessionRole === "admin") {
      return users.filter((user) =>
        ["agent", "viewer"].includes(String(user.role || "").toLowerCase()),
      );
    }
    return users;
  }, [users, sessionRole]);

  const filteredUsers = useMemo(() => {
    if (roleFilter === "all") return manageableUsers;
    return manageableUsers.filter((user) => user.role === roleFilter);
  }, [manageableUsers, roleFilter]);

  const stats = useMemo(() => {
    const agents = manageableUsers.filter((u) => u.role === "agent");
    const activeAgents = agents.filter(
      (u) => u.status === "active" || u.status === "online",
    ).length;
    const busyAgents = agents.filter((u) => u.status === "busy").length;
    return {
      total: manageableUsers.length,
      owners: manageableUsers.filter((u) => u.role === "owner").length,
      admins: manageableUsers.filter((u) => u.role === "admin").length,
      agents: agents.length,
      activeAgents,
      busyAgents,
    };
  }, [manageableUsers]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId("");
  };

  const openCreate = () => {
    setMode("create");
    resetForm();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const openEdit = async (user) => {
    const id = getUserId(user);
    if (!id) return;

    setMode("edit");
    setEditingId(id);
    setIsModalOpen(true);

    try {
      const detailed = await dispatch(fetchAdminUserById(id)).unwrap();
      setForm({
        name: detailed?.name || "",
        email: detailed?.email || "",
        role: detailed?.role || "agent",
        departments: Array.isArray(detailed?.departments)
          ? detailed.departments.join(", ")
          : "",
        password: "",
        authProvider: detailed?.authProvider || "local",
        oauthProviderId: detailed?.oauthProviderId || "",
      });
    } catch {
      setForm({
        name: user?.name || "",
        email: user?.email || "",
        role: user?.role || "agent",
        departments: Array.isArray(user?.departments)
          ? user.departments.join(", ")
          : "",
        password: "",
        authProvider: user?.authProvider || "local",
        oauthProviderId: user?.oauthProviderId || "",
      });
    }
  };

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (mode === "create") {
        const departments = String(form.departments || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
        await dispatch(
          createAdminUser({
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
            role: form.role,
            departments,
          }),
        ).unwrap();
        closeModal();
        return;
      }

      const departments = String(form.departments || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const updates = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        departments,
      };
      if (form.password) updates.password = form.password;
      await dispatch(updateAdminUser({ id: editingId, updates })).unwrap();
      closeModal();
    } catch (_error) {
      console.log("Error occurred in UsersPage", _error);
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this user permanently?")) return;
    try {
      await dispatch(deleteAdminUser(id)).unwrap();
    } catch (_error) {
      console.log("Error occurred in UsersPage", _error);
    }
  };

  const handleChat = () => {
    navigate("/app/inbox");
  };

  return (
    <div className="theme-page animate-in fade-in duration-700">
      <div className="mb-6 flex justify-end">
        <button
          onClick={openCreate}
          className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-primary/10 transition-all active:scale-95"
        >
          <UserPlus size={18} />
          <span>Add User</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Users"
          value={stats.total}
          icon={Users}
          color="emerald"
        />
        <StatsCard
          title="Admins"
          value={stats.owners + stats.admins}
          icon={ShieldCheck}
          color="emerald"
        />
        <StatsCard
          title="Agents"
          value={stats.agents}
          icon={Activity}
          color="emerald"
        />
        <StatsCard
          title="Active Now"
          value={stats.activeAgents}
          icon={Zap}
          color="emerald"
        />
      </div>

      <div className="width-auto">
        <UsersTable
          users={filteredUsers}
          roleFilter={roleFilter}
          setRoleFilter={setRoleFilter}
          ROLE_OPTIONS={tableRoleOptions}
          openEdit={openEdit}
          handleDelete={handleDelete}
          handleChat={handleChat}
          listLoading={listLoading}
          listError={listError}
          actionError={actionError}
        />
      </div>

      {isModalOpen && (
        <UserModal
          mode={mode}
          form={form}
          handleChange={handleChange}
          handleSubmit={handleSubmit}
          closeModal={closeModal}
          actionLoading={actionLoading}
          roleOptions={roleOptions}
        />
      )}
    </div>
  );
};

export default UsersPage;
