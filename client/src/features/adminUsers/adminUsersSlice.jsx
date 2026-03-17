import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axios";

const initialState = {
  users: [],
  selectedUser: null,
  listLoading: false,
  actionLoading: false,
  error: null,
  actionError: null,
};

const extractErrorMessage = (error, fallback) =>
  error.response?.data?.message || fallback;

export const fetchAllUsers = createAsyncThunk(
  "adminUsers/fetchAllUsers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/users");
      return response.data?.data || [];
    } catch (error) {
      if (error.response?.status === 404) {
        return [];
      }

      return rejectWithValue(
        extractErrorMessage(error, "Failed to fetch users"),
      );
    }
  },
);

export const fetchAdminUserById = createAsyncThunk(
  "adminUsers/fetchAdminUserById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/users/${id}`);
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to fetch user"),
      );
    }
  },
);

export const createAdminUser = createAsyncThunk(
  "adminUsers/createAdminUser",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/users", payload);
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to create user"),
      );
    }
  },
);

export const updateAdminUser = createAsyncThunk(
  "adminUsers/updateAdminUser",
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/users/${id}`, updates);
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to update user"),
      );
    }
  },
);

export const deleteAdminUser = createAsyncThunk(
  "adminUsers/deleteAdminUser",
  async (id, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/users/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to delete user"),
      );
    }
  },
);

const adminUsersSlice = createSlice({
  name: "adminUsers",
  initialState,
  reducers: {
    clearAdminUserErrors: (state) => {
      state.error = null;
      state.actionError = null;
    },
    clearSelectedAdminUser: (state) => {
      state.selectedUser = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllUsers.pending, (state) => {
        state.listLoading = true;
        state.error = null;
      })
      .addCase(fetchAllUsers.fulfilled, (state, action) => {
        state.listLoading = false;
        state.users = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchAllUsers.rejected, (state, action) => {
        state.listLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchAdminUserById.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(fetchAdminUserById.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.selectedUser = action.payload;
      })
      .addCase(fetchAdminUserById.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload;
      })
      .addCase(createAdminUser.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(createAdminUser.fulfilled, (state, action) => {
        state.actionLoading = false;
        if (action.payload) {
          state.users = [action.payload, ...state.users];
        }
      })
      .addCase(createAdminUser.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload;
      })
      .addCase(updateAdminUser.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(updateAdminUser.fulfilled, (state, action) => {
        state.actionLoading = false;
        const updated = action.payload;
        if (!updated) return;

        const updatedId = String(updated._id || updated.id);
        state.users = state.users.map((user) => {
          const userId = String(user._id || user.id);
          return userId === updatedId ? updated : user;
        });

        if (state.selectedUser) {
          const selectedId = String(
            state.selectedUser._id || state.selectedUser.id,
          );
          if (selectedId === updatedId) {
            state.selectedUser = updated;
          }
        }
      })
      .addCase(updateAdminUser.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload;
      })
      .addCase(deleteAdminUser.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(deleteAdminUser.fulfilled, (state, action) => {
        state.actionLoading = false;
        const deletedId = String(action.payload);

        state.users = state.users.filter((user) => {
          const userId = String(user._id || user.id);
          return userId !== deletedId;
        });

        if (state.selectedUser) {
          const selectedId = String(
            state.selectedUser._id || state.selectedUser.id,
          );
          if (selectedId === deletedId) {
            state.selectedUser = null;
          }
        }
      })
      .addCase(deleteAdminUser.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload;
      });
  },
});

export const { clearAdminUserErrors, clearSelectedAdminUser } =
  adminUsersSlice.actions;

export const selectAdminUsers = (state) => state.adminUsers.users;
export const selectAdminUsersListLoading = (state) =>
  state.adminUsers.listLoading;
export const selectAdminUsersActionLoading = (state) =>
  state.adminUsers.actionLoading;
export const selectAdminUsersError = (state) => state.adminUsers.error;
export const selectAdminUsersActionError = (state) =>
  state.adminUsers.actionError;
export const selectAdminSelectedUser = (state) => state.adminUsers.selectedUser;

export default adminUsersSlice.reducer;
