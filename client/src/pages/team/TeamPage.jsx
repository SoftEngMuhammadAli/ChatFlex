import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Search, UserPlus, RefreshCcw } from "lucide-react";
import {
  fetchTeamMembers,
  inviteTeamMember,
  updateTeamMember,
  deleteTeamMember,
  resendTeamInvitation,
  clearInviteState,
  clearMemberActionState,
} from "../../features/team/teamSlice";

import CustomLoader from "../../components/ui/Loader";
import ErrorBox from "../../components/ui/ErrorBox";
import Pagination from "../../components/ui/Pagination";
import TeamMemberCard from "../../components/team/TeamMemberCard";
import InviteTeamMemberForm from "../../components/team/InviteTeamMemberForm";

const ITEMS_PER_PAGE = 10;
const ROLE_OPTIONS_BY_ACTOR = {
  "super-admin": ["owner", "admin", "agent", "viewer"],
  owner: ["admin", "agent", "viewer"],
  admin: ["agent", "viewer"],
};

const TeamPage = () => {
  const dispatch = useDispatch();

  const {
    members = [],
    loading,
    error,
    inviteLoading,
    inviteError,
    inviteSuccess,
    memberActionLoadingById = {},
    memberActionError,
    memberActionSuccess,
  } = useSelector((state) => state.team);
  const currentUser = useSelector((state) => state.auth.user);

  const currentUserId = currentUser?._id || currentUser?.id;
  const actorRole = String(currentUser?.role || "").toLowerCase();
  const allowedRoles = useMemo(
    () => ROLE_OPTIONS_BY_ACTOR[actorRole] || ["agent", "viewer"],
    [actorRole],
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    departments: "",
  });

  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    role: allowedRoles[0] || "agent",
    departments: "",
  });

  useEffect(() => {
    dispatch(fetchTeamMembers());
  }, [dispatch]);

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      dispatch(fetchTeamMembers());
    }, 20000);

    return () => clearInterval(refreshInterval);
  }, [dispatch]);

  useEffect(() => {
    if (
      !inviteSuccess &&
      !inviteError &&
      !memberActionSuccess &&
      !memberActionError
    )
      return;

    const timer = setTimeout(() => {
      dispatch(clearInviteState());
      dispatch(clearMemberActionState());
    }, 5000);

    return () => clearTimeout(timer);
  }, [
    dispatch,
    inviteSuccess,
    inviteError,
    memberActionSuccess,
    memberActionError,
  ]);

  useEffect(() => {
    return () => {
      dispatch(clearInviteState());
      dispatch(clearMemberActionState());
    };
  }, [dispatch]);

  const teammates = useMemo(() => {
    if (!Array.isArray(members)) return [];
    return members.filter((m) => String(m._id) !== String(currentUserId));
  }, [members, currentUserId]);

  const totalPages = Math.max(1, Math.ceil(teammates.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const editingMember = useMemo(() => {
    if (!editingMemberId) return null;
    return teammates.find(
      (member) => String(member._id) === String(editingMemberId),
    );
  }, [editingMemberId, teammates]);

  const paginatedMembers = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return teammates.slice(start, start + ITEMS_PER_PAGE);
  }, [teammates, safePage]);

  if (loading) return <CustomLoader />;
  if (error) return <ErrorBox error={error} />;

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    const safeRole = allowedRoles.includes(inviteForm.role)
      ? inviteForm.role
      : allowedRoles[0];

    const departments = String(inviteForm.departments || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      await dispatch(
        inviteTeamMember({
          ...inviteForm,
          role: safeRole,
          departments,
        }),
      ).unwrap();

      setInviteForm({
        name: "",
        email: "",
        role: allowedRoles[0] || "agent",
        departments: "",
      });
      setIsInviteOpen(false);
      dispatch(fetchTeamMembers());
    } catch {
      // handled by redux state
    }
  };

  const handleEditStart = (member) => {
    setEditingMemberId(member?._id || null);
    setEditForm({
      name: String(member?.name || ""),
      email: String(member?.email || ""),
      departments: Array.isArray(member?.departments)
        ? member.departments.join(", ")
        : "",
    });
  };

  const handleEditCancel = () => {
    setEditingMemberId(null);
    setEditForm({ name: "", email: "", departments: "" });
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editingMemberId) return;

    const updates = {
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      departments: String(editForm.departments || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    };

    try {
      await dispatch(
        updateTeamMember({ id: editingMemberId, updates }),
      ).unwrap();
      handleEditCancel();
      dispatch(fetchTeamMembers());
    } catch {
      // handled by redux state
    }
  };

  const handleDeleteMember = async (member) => {
    const memberId = String(member?._id || "");
    if (!memberId) return;

    const confirmed = window.confirm(
      `Delete ${member?.name || "this member"} from team? This action cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      await dispatch(deleteTeamMember(memberId)).unwrap();
      if (String(editingMemberId) === memberId) {
        handleEditCancel();
      }
      dispatch(fetchTeamMembers());
    } catch {
      // handled by redux state
    }
  };

  const handleResendInvite = async (member) => {
    const memberId = String(member?._id || "");
    if (!memberId) return;

    try {
      await dispatch(resendTeamInvitation(memberId)).unwrap();
      dispatch(fetchTeamMembers());
    } catch {
      // handled by redux state
    }
  };

  return (
    <div className="theme-page pb-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Team Members</h1>

        <div className="flex items-center gap-3">
          {/* Refresh */}
          <button
            onClick={() => dispatch(fetchTeamMembers())}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 bg-slate-900/60 text-slate-200 text-sm font-medium hover:bg-slate-800 hover:border-slate-600 transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            <RefreshCcw size={16} className="opacity-80" />
            Refresh
          </button>

          {/* Invite */}
          <button
            onClick={() => setIsInviteOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <UserPlus size={16} />
            Invite Member
          </button>
        </div>
      </div>

      {isInviteOpen && (
        <InviteTeamMemberForm
          inviteForm={inviteForm}
          setInviteForm={setInviteForm}
          inviteLoading={inviteLoading}
          handleInviteSubmit={handleInviteSubmit}
          allowedRoles={allowedRoles}
        />
      )}

      {inviteSuccess && (
        <div className="mt-4 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm">
          {inviteSuccess}
        </div>
      )}

      <ErrorBox error={inviteError} className="mt-4" />

      {memberActionSuccess && (
        <div className="mt-4 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm">
          {memberActionSuccess}
        </div>
      )}

      <ErrorBox error={memberActionError} className="mt-4" />

      {editingMember && (
        <form
          onSubmit={handleEditSubmit}
          className="mt-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        >
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Edit Team Member
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              value={editForm.name}
              onChange={(event) =>
                setEditForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Full name"
              required
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="email"
              value={editForm.email}
              onChange={(event) =>
                setEditForm((prev) => ({ ...prev, email: event.target.value }))
              }
              placeholder="Email address"
              required
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="text"
              value={editForm.departments}
              onChange={(event) =>
                setEditForm((prev) => ({
                  ...prev,
                  departments: event.target.value,
                }))
              }
              placeholder="Departments (sales,support)"
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={Boolean(memberActionLoadingById[editingMemberId])}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold"
              >
                {memberActionLoadingById[editingMemberId]
                  ? "Saving..."
                  : "Save"}
              </button>
              <button
                type="button"
                onClick={handleEditCancel}
                disabled={Boolean(memberActionLoadingById[editingMemberId])}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Members */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {paginatedMembers.length > 0 ? (
          paginatedMembers.map((member) => (
            <TeamMemberCard
              key={member._id}
              member={member}
              onEdit={handleEditStart}
              onDelete={handleDeleteMember}
              onResendInvite={handleResendInvite}
              isActionLoading={Boolean(memberActionLoadingById[member._id])}
            />
          ))
        ) : (
          <div className="col-span-full py-16 text-center">
            <Search size={26} className="mx-auto mb-4 text-slate-400" />
            <p className="text-slate-500">No teammates found.</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          className="mt-6"
        />
      )}
    </div>
  );
};

export default TeamPage;

