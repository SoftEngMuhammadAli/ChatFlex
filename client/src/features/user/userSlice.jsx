import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axios";

// Initial state
const initialState = {
  user: null,
  draft: {
    name: "",
    email: "",
    password: "",
  },
  loading: false,
  saving: false,
  error: null,
  successMessage: null,
};

const extractErrorMessage = (error, fallback) =>
  error.response?.data?.message || fallback;

// Async thunk to fetch user by ID
export const getUserById = createAsyncThunk(
  "user/getUserById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/users/${id}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to fetch user"),
      );
    }
  },
);

export const fetchCurrentUserProfile = createAsyncThunk(
  "user/fetchCurrentUserProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/users/me");
      return response.data?.data || null;
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to fetch profile"),
      );
    }
  },
);

export const updateCurrentUserProfile = createAsyncThunk(
  "user/updateCurrentUserProfile",
  async (updates, { rejectWithValue }) => {
    try {
      const payload = {
        name: updates?.name?.trim(),
      };
      if (updates?.password) payload.password = updates.password;

      const response = await axiosInstance.put("/users/me", payload);
      return response.data?.data || null;
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to update profile"),
      );
    }
  },
);

export const uploadCurrentUserAvatar = createAsyncThunk(
  "user/uploadCurrentUserAvatar",
  async (file, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axiosInstance.post("/users/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data?.data || null;
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to upload profile picture"),
      );
    }
  },
);

export const deleteCurrentUserAvatar = createAsyncThunk(
  "user/deleteCurrentUserAvatar",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete("/users/me/avatar");
      return response.data?.data || null;
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to remove profile picture"),
      );
    }
  },
);

// User slice
const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    clearUser: (state) => {
      state.user = null;
      state.draft = {
        name: "",
        email: "",
        password: "",
      };
      state.loading = false;
      state.saving = false;
      state.error = null;
      state.successMessage = null;
    },
    setUserDraftField: (state, action) => {
      const { field, value } = action.payload || {};
      if (!field) return;
      state.draft[field] = value;
    },
    resetUserDraft: (state) => {
      state.draft = {
        name: state.user?.name || "",
        email: state.user?.email || "",
        password: "",
      };
    },
    clearUserMessages: (state) => {
      state.error = null;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getUserById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(getUserById.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.draft = {
          name: action.payload?.name || "",
          email: action.payload?.email || "",
          password: "",
        };
      })
      .addCase(getUserById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchCurrentUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.draft = {
          name: action.payload?.name || "",
          email: action.payload?.email || "",
          password: "",
        };
      })
      .addCase(fetchCurrentUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateCurrentUserProfile.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(updateCurrentUserProfile.fulfilled, (state, action) => {
        state.saving = false;
        state.user = action.payload;
        state.draft = {
          name: action.payload?.name || "",
          email: action.payload?.email || "",
          password: "",
        };
        state.successMessage = "Profile updated successfully";
      })
      .addCase(updateCurrentUserProfile.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(uploadCurrentUserAvatar.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(uploadCurrentUserAvatar.fulfilled, (state, action) => {
        state.saving = false;
        state.user = action.payload;
        state.draft = {
          name: action.payload?.name || "",
          email: action.payload?.email || "",
          password: "",
        };
        state.successMessage = "Profile picture updated successfully";
      })
      .addCase(uploadCurrentUserAvatar.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(deleteCurrentUserAvatar.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(deleteCurrentUserAvatar.fulfilled, (state, action) => {
        state.saving = false;
        state.user = action.payload;
        state.draft = {
          name: action.payload?.name || "",
          email: action.payload?.email || "",
          password: "",
        };
        state.successMessage = "Profile picture removed successfully";
      })
      .addCase(deleteCurrentUserAvatar.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      });
  },
});

// Export actions and reducer
export const {
  clearUser,
  setUserDraftField,
  resetUserDraft,
  clearUserMessages,
} = userSlice.actions;
export const selectCurrentUserProfile = (state) => state.user.user;
export const selectCurrentUserDraft = (state) => state.user.draft;
export const selectCurrentUserLoading = (state) => state.user.loading;
export const selectCurrentUserSaving = (state) => state.user.saving;
export const selectCurrentUserError = (state) => state.user.error;
export const selectCurrentUserSuccess = (state) => state.user.successMessage;

export default userSlice.reducer;
