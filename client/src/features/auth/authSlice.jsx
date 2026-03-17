import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axios";
import { bindOAuthReducers } from "./oAuthSlice";

const normalizeSessionUser = (user) => {
  if (!user || typeof user !== "object") return null;
  const normalizedId = String(user.id || user._id || "").trim();
  return {
    ...user,
    ...(normalizedId ? { id: normalizedId } : {}),
    ...(normalizedId && !user._id ? { _id: normalizedId } : {}),
    profilePictureUrl: String(user.profilePictureUrl || "").trim(),
  };
};

const initialState = {
  user: normalizeSessionUser(JSON.parse(localStorage.getItem("user")) || null),
  token:
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    null,
  isAuthenticated: !!(
    localStorage.getItem("accessToken") || localStorage.getItem("token")
  ),
  loading: false,
  error: null,
  successMessage: null,
  verificationRequired: false,
  invitationRequired: false,
  pendingVerificationEmail: "",
};

export const login = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/auth/login", credentials);
      localStorage.setItem("accessToken", data.token);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      return data;
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || "Login failed",
        verificationRequired: Boolean(err.response?.data?.verificationRequired),
        invitationRequired: Boolean(err.response?.data?.invitationRequired),
      });
    }
  },
);

export const register = createAsyncThunk(
  "auth/register",
  async (userData, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/auth/register", userData);
      return data;
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || "Registration failed",
        invitationRequired: Boolean(err.response?.data?.invitationRequired),
      });
    }
  },
);

export const verifyEmail = createAsyncThunk(
  "auth/verifyEmail",
  async (token, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/auth/verify-email", {
        token,
      });
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Email verification failed",
      );
    }
  },
);

export const resendVerification = createAsyncThunk(
  "auth/resendVerification",
  async (email, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/auth/resend-verification", {
        email,
      });
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to resend verification email",
      );
    }
  },
);

export const forgotPassword = createAsyncThunk(
  "auth/forgotPassword",
  async (email, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/auth/forgot-password", {
        email,
      });
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to request password reset",
      );
    }
  },
);

export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async ({ token, newPassword }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/auth/reset-password", {
        token,
        newPassword,
      });
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to reset password",
      );
    }
  },
);

export const refreshToken = createAsyncThunk(
  "auth/refreshToken",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/auth/refresh-token");
      localStorage.setItem("accessToken", data.token);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Refresh failed");
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      state.successMessage = null;
      state.verificationRequired = false;
      state.invitationRequired = false;
      state.pendingVerificationEmail = "";
    },
    clearError: (state) => {
      state.error = null;
    },
    clearSuccessMessage: (state) => {
      state.successMessage = null;
    },
    setSessionUser: (state, action) => {
      state.user = normalizeSessionUser(action.payload || null);
      localStorage.setItem("user", JSON.stringify(state.user));
    },
    setAuthSession: (state, action) => {
      const nextToken = String(action.payload?.token || "").trim();
      const nextUser = normalizeSessionUser(action.payload?.user || null);

      state.token = nextToken || null;
      state.user = nextUser;
      state.isAuthenticated = Boolean(nextToken && nextUser);
      state.loading = false;
      state.error = null;
      state.successMessage = null;
      state.verificationRequired = false;
      state.invitationRequired = false;
      state.pendingVerificationEmail = "";

      if (nextToken) {
        localStorage.setItem("accessToken", nextToken);
        localStorage.setItem("token", nextToken);
      } else {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("token");
      }

      if (nextUser) {
        localStorage.setItem("user", JSON.stringify(nextUser));
      } else {
        localStorage.removeItem("user");
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
        state.invitationRequired = false;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = normalizeSessionUser(action.payload.user);
        localStorage.setItem("user", JSON.stringify(state.user));
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.verificationRequired = false;
        state.invitationRequired = false;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        const payload = action.payload || {};
        state.error = payload.message || "Login failed";
        state.verificationRequired = Boolean(payload.verificationRequired);
        state.invitationRequired = Boolean(payload.invitationRequired);
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.verificationRequired = Boolean(
          action.payload.verificationRequired,
        );
        state.invitationRequired = Boolean(action.payload.invitationRequired);
        state.pendingVerificationEmail = action.payload?.user?.email || "";
        state.successMessage = action.payload.message || null;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || action.payload;
        state.invitationRequired = Boolean(action.payload?.invitationRequired);
      })
      .addCase(verifyEmail.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(verifyEmail.fulfilled, (state, action) => {
        state.loading = false;
        state.verificationRequired = false;
        state.successMessage = action.payload.message || "Email verified";
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(resendVerification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resendVerification.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage =
          action.payload.message || "Verification email sent";
        state.invitationRequired = Boolean(action.payload?.invitationRequired);
      })
      .addCase(resendVerification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage =
          action.payload.message || "Password reset link sent";
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage =
          action.payload.message || "Password reset complete";
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    bindOAuthReducers(builder);
  },
});

export const {
  logout,
  clearError,
  clearSuccessMessage,
  setSessionUser,
  setAuthSession,
} = authSlice.actions;
export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectAuthSuccess = (state) => state.auth.successMessage;
export const selectVerificationRequired = (state) =>
  state.auth.verificationRequired;
export const selectInvitationRequired = (state) =>
  state.auth.invitationRequired;
export const selectPendingVerificationEmail = (state) =>
  state.auth.pendingVerificationEmail;

export default authSlice.reducer;
