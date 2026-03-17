import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axios";

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

export const googleOAuthLogin = createAsyncThunk(
  "auth/googleOAuthLogin",
  async (credential, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/oauth/google", {
        credential,
      });
      localStorage.setItem("accessToken", data.token);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      return data;
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || "Google login failed",
        invitationRequired: Boolean(err.response?.data?.invitationRequired),
      });
    }
  },
);

export const githubOAuthLogin = createAsyncThunk(
  "auth/githubOAuthLogin",
  async (accessToken, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/oauth/github", {
        accessToken,
      });
      localStorage.setItem("accessToken", data.token);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      return data;
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || "GitHub login failed",
        invitationRequired: Boolean(err.response?.data?.invitationRequired),
      });
    }
  },
);

export const githubOAuthCodeLogin = createAsyncThunk(
  "auth/githubOAuthCodeLogin",
  async (code, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/oauth/github/code", { code });
      localStorage.setItem("accessToken", data.token);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      return data;
    } catch (err) {
      return rejectWithValue({
        message: err.response?.data?.message || "GitHub login failed",
        invitationRequired: Boolean(err.response?.data?.invitationRequired),
      });
    }
  },
);

export const bindOAuthReducers = (builder) => {
  builder
    .addCase(googleOAuthLogin.pending, (state) => {
      state.loading = true;
      state.error = null;
      state.invitationRequired = false;
    })
    .addCase(googleOAuthLogin.fulfilled, (state, action) => {
      state.loading = false;
      state.user = normalizeSessionUser(action.payload.user);
      localStorage.setItem("user", JSON.stringify(state.user));
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.verificationRequired = false;
      state.invitationRequired = false;
    })
    .addCase(googleOAuthLogin.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload?.message || "Google login failed";
      state.invitationRequired = Boolean(action.payload?.invitationRequired);
    })
    .addCase(githubOAuthLogin.pending, (state) => {
      state.loading = true;
      state.error = null;
      state.invitationRequired = false;
    })
    .addCase(githubOAuthLogin.fulfilled, (state, action) => {
      state.loading = false;
      state.user = normalizeSessionUser(action.payload.user);
      localStorage.setItem("user", JSON.stringify(state.user));
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.verificationRequired = false;
      state.invitationRequired = false;
    })
    .addCase(githubOAuthLogin.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload?.message || "GitHub login failed";
      state.invitationRequired = Boolean(action.payload?.invitationRequired);
    })
    .addCase(githubOAuthCodeLogin.pending, (state) => {
      state.loading = true;
      state.error = null;
      state.invitationRequired = false;
    })
    .addCase(githubOAuthCodeLogin.fulfilled, (state, action) => {
      state.loading = false;
      state.user = normalizeSessionUser(action.payload.user);
      localStorage.setItem("user", JSON.stringify(state.user));
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.verificationRequired = false;
      state.invitationRequired = false;
    })
    .addCase(githubOAuthCodeLogin.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload?.message || "GitHub login failed";
      state.invitationRequired = Boolean(action.payload?.invitationRequired);
    });
};
