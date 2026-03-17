import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axios";

const resolveInvitationStatus = (member = {}) => {
  if (member.invitationStatus === "pending" || member.invitationPending) {
    return "pending";
  }
  if (member.invitationStatus === "approved" || member.invitationApproved) {
    return "approved";
  }
  return member.emailVerified === false ? "pending" : "approved";
};

const withNormalizedPresence = (member, state) => {
  const memberId = String(member._id || member.id || "");
  return {
    ...member,
    _id: memberId,
    invitationStatus: resolveInvitationStatus(member),
    status:
      state.presenceByUserId[memberId] ||
      (state.onlineUsers.includes(memberId)
        ? "active"
        : member.status === "online"
          ? "active"
          : member.status === "offline"
            ? "inactive"
            : member.status || "inactive"),
  };
};

const upsertMember = (members, nextMember) => {
  const nextMemberId = String(nextMember?._id || nextMember?.id || "");
  if (!nextMemberId) return members;

  const existingIndex = members.findIndex(
    (member) => String(member._id || member.id || "") === nextMemberId,
  );

  if (existingIndex === -1) {
    return [nextMember, ...members];
  }

  const cloned = [...members];
  cloned[existingIndex] = {
    ...cloned[existingIndex],
    ...nextMember,
  };
  return cloned;
};

const initialState = {
  members: [],
  // Array of user IDs who are currently online
  onlineUsers: [],
  presenceByUserId: {},
  loading: false,
  error: null,
  inviteLoading: false,
  inviteError: null,
  inviteSuccess: null,
  memberActionLoadingById: {},
  memberActionError: null,
  memberActionSuccess: null,
};

// Fetch all team members for the workspace
export const fetchTeamMembers = createAsyncThunk(
  "team/fetchTeamMembers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/tenant/team");
      const payload = response.data?.data || response.data || [];
      return Array.isArray(payload) ? payload : [];
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch team members",
      );
    }
  },
);

export const inviteTeamMember = createAsyncThunk(
  "team/inviteTeamMember",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/tenant/team/invite", payload);
      return response.data?.data || null;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to send invitation",
      );
    }
  },
);

export const updateTeamMember = createAsyncThunk(
  "team/updateTeamMember",
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/tenant/team/${id}`, updates);
      return response.data?.data || null;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to update team member",
      );
    }
  },
);

export const deleteTeamMember = createAsyncThunk(
  "team/deleteTeamMember",
  async (id, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/tenant/team/${id}`);
      return String(id);
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to delete team member",
      );
    }
  },
);

export const resendTeamInvitation = createAsyncThunk(
  "team/resendTeamInvitation",
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `/tenant/team/${id}/resend-invite`,
      );
      return response.data?.data || null;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to resend invitation email",
      );
    }
  },
);

const teamSlice = createSlice({
  name: "team",
  initialState,
  reducers: {
    setPresenceSnapshotLocal: (state, action) => {
      const snapshot = Array.isArray(action.payload) ? action.payload : [];
      const nextPresence = {};
      const nextOnlineUsers = [];

      snapshot.forEach((entry) => {
        const userId = String(entry.userId || "");
        if (!userId) return;
        const status = entry.status || "inactive";
        nextPresence[userId] = status;
        if (status === "active") {
          nextOnlineUsers.push(userId);
        }
      });

      state.presenceByUserId = nextPresence;
      state.onlineUsers = nextOnlineUsers;
      state.members = state.members.map((member) => {
        const memberId = String(member._id || member.id);
        return {
          ...member,
          status: nextPresence[memberId] || member.status || "inactive",
        };
      });
    },
    setOnlineUsersLocal: (state, action) => {
      const normalizedOnlineUsers = Array.isArray(action.payload)
        ? action.payload.map((id) => String(id))
        : [];

      state.onlineUsers = normalizedOnlineUsers;

      state.members = state.members.map((member) => {
        const memberId = String(member._id || member.id);
        return {
          ...member,
          status: normalizedOnlineUsers.includes(memberId)
            ? "active"
            : member.status === "busy"
              ? "busy"
              : "inactive",
        };
      });
    },
    updateMemberStatusLocal: (state, action) => {
      const { status } = action.payload;
      const userId = String(action.payload.userId);

      // Update onlineUsers list
      if (status === "active" || status === "online") {
        if (!state.onlineUsers.includes(userId)) {
          state.onlineUsers.push(userId);
        }
      } else if (status === "inactive" || status === "offline") {
        state.onlineUsers = state.onlineUsers.filter((id) => id !== userId);
      }

      state.presenceByUserId[userId] = status;

      // Update members list if it exists
      const member = state.members.find((m) => String(m._id) === userId);
      if (member) {
        member.status = status;
      }
    },
    clearInviteState: (state) => {
      state.inviteError = null;
      state.inviteSuccess = null;
    },
    clearMemberActionState: (state) => {
      state.memberActionError = null;
      state.memberActionSuccess = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeamMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeamMembers.fulfilled, (state, action) => {
        state.loading = false;

        state.members = action.payload.map((member) =>
          withNormalizedPresence(member, state),
        );
      })
      .addCase(fetchTeamMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(inviteTeamMember.pending, (state) => {
        state.inviteLoading = true;
        state.inviteError = null;
        state.inviteSuccess = null;
      })
      .addCase(inviteTeamMember.fulfilled, (state, action) => {
        state.inviteLoading = false;
        state.inviteError = null;
        state.inviteSuccess =
          "Invitation email sent. The teammate must accept the invite link to join.";

        if (action.payload) {
          const normalizedMember = withNormalizedPresence(
            action.payload,
            state,
          );
          state.members = upsertMember(state.members, normalizedMember);
        }
      })
      .addCase(inviteTeamMember.rejected, (state, action) => {
        state.inviteLoading = false;
        state.inviteSuccess = null;
        state.inviteError = action.payload || "Failed to send invitation";
      })
      .addCase(updateTeamMember.pending, (state, action) => {
        const id = String(action.meta.arg?.id || "");
        if (id) {
          state.memberActionLoadingById[id] = true;
        }
        state.memberActionError = null;
        state.memberActionSuccess = null;
      })
      .addCase(updateTeamMember.fulfilled, (state, action) => {
        const id = String(action.meta.arg?.id || "");
        if (id) {
          state.memberActionLoadingById[id] = false;
        }

        if (action.payload) {
          const normalizedMember = withNormalizedPresence(
            action.payload,
            state,
          );
          state.members = upsertMember(state.members, normalizedMember);
        }
        state.memberActionError = null;
        state.memberActionSuccess = "Team member updated successfully.";
      })
      .addCase(updateTeamMember.rejected, (state, action) => {
        const id = String(action.meta.arg?.id || "");
        if (id) {
          state.memberActionLoadingById[id] = false;
        }
        state.memberActionSuccess = null;
        state.memberActionError =
          action.payload || "Failed to update team member";
      })
      .addCase(deleteTeamMember.pending, (state, action) => {
        const id = String(action.meta.arg || "");
        if (id) {
          state.memberActionLoadingById[id] = true;
        }
        state.memberActionError = null;
        state.memberActionSuccess = null;
      })
      .addCase(deleteTeamMember.fulfilled, (state, action) => {
        const deletedId = String(action.payload || "");
        if (deletedId) {
          state.memberActionLoadingById[deletedId] = false;
          state.members = state.members.filter(
            (member) => String(member._id || member.id || "") !== deletedId,
          );
        }

        state.memberActionError = null;
        state.memberActionSuccess = "Team member deleted successfully.";
      })
      .addCase(deleteTeamMember.rejected, (state, action) => {
        const id = String(action.meta.arg || "");
        if (id) {
          state.memberActionLoadingById[id] = false;
        }
        state.memberActionSuccess = null;
        state.memberActionError =
          action.payload || "Failed to delete team member";
      })
      .addCase(resendTeamInvitation.pending, (state, action) => {
        const id = String(action.meta.arg || "");
        if (id) {
          state.memberActionLoadingById[id] = true;
        }
        state.memberActionError = null;
        state.memberActionSuccess = null;
      })
      .addCase(resendTeamInvitation.fulfilled, (state, action) => {
        const id = String(action.meta.arg || "");
        if (id) {
          state.memberActionLoadingById[id] = false;
        }

        if (action.payload) {
          const normalizedMember = withNormalizedPresence(
            action.payload,
            state,
          );
          state.members = upsertMember(state.members, normalizedMember);
        }

        state.memberActionError = null;
        state.memberActionSuccess =
          "Invitation email resent. Waiting for teammate to accept the invite link.";
      })
      .addCase(resendTeamInvitation.rejected, (state, action) => {
        const id = String(action.meta.arg || "");
        if (id) {
          state.memberActionLoadingById[id] = false;
        }
        state.memberActionSuccess = null;
        state.memberActionError =
          action.payload || "Failed to resend invitation email";
      });
  },
});

export const {
  setOnlineUsersLocal,
  updateMemberStatusLocal,
  setPresenceSnapshotLocal,
  clearInviteState,
  clearMemberActionState,
} = teamSlice.actions;
export default teamSlice.reducer;
