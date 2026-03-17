import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axios";
import { setAuthSession } from "../auth/authSlice";

const IMPERSONATION_ORIGIN_TOKEN_KEY = "chatflex_impersonation_origin_token";
const IMPERSONATION_ORIGIN_USER_KEY = "chatflex_impersonation_origin_user";

const defaultModelConfig = {
  model: "gpt-4o-mini",
  temperature: 0.3,
  maxTokens: 1024,
  systemPrompt: "",
};

const initialState = {
  widgetsCount: 0,
  loading: false,
  error: null,

  workspaces: [],
  workspaceMeta: {
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
  },
  workspaceLoading: false,
  workspaceActionLoading: false,
  workspaceError: null,

  globalModelConfig: defaultModelConfig,
  globalModelLoading: false,
  globalModelSaving: false,
  globalModelError: null,

  impersonationLoading: false,
  impersonationError: null,
};

const extractErrorMessage = (error, fallback) =>
  error.response?.data?.message || fallback;

export const fetchWidgetsCount = createAsyncThunk(
  "superAdmin/fetchWidgetsCount",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/tenant/settings");
      const settings = data?.data?.settings || {};
      const widgetApiKey = data?.data?.widgetApiKey;
      return settings?.widget || widgetApiKey ? 1 : 0;
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to fetch widget summary"),
      );
    }
  },
);

export const fetchSuperAdminWorkspaces = createAsyncThunk(
  "superAdmin/fetchSuperAdminWorkspaces",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/super-admin/workspaces", {
        params,
      });
      return {
        data: Array.isArray(data?.data) ? data.data : [],
        meta: data?.meta || {
          total: 0,
          page: 1,
          limit: 20,
          pages: 1,
        },
      };
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to fetch workspace monitoring"),
      );
    }
  },
);

export const scanWorkspaceAbuse = createAsyncThunk(
  "superAdmin/scanWorkspaceAbuse",
  async (workspaceId, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post(
        `/super-admin/workspaces/${workspaceId}/abuse-scan`,
      );
      return data?.data || null;
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to scan workspace abuse"),
      );
    }
  },
);

export const updateWorkspaceSuspension = createAsyncThunk(
  "superAdmin/updateWorkspaceSuspension",
  async ({ workspaceId, action, reason }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.patch(
        `/super-admin/workspaces/${workspaceId}/suspension`,
        { action, reason },
      );
      return {
        workspaceId,
        ...data?.data,
      };
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to update workspace suspension"),
      );
    }
  },
);

export const fetchGlobalModelConfig = createAsyncThunk(
  "superAdmin/fetchGlobalModelConfig",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/super-admin/global-model-config");
      return data?.data || defaultModelConfig;
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to fetch global model config"),
      );
    }
  },
);

export const updateGlobalModelConfig = createAsyncThunk(
  "superAdmin/updateGlobalModelConfig",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.put(
        "/super-admin/global-model-config",
        payload,
      );
      return data?.data || defaultModelConfig;
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to update global model config"),
      );
    }
  },
);

export const startWorkspaceImpersonation = createAsyncThunk(
  "superAdmin/startWorkspaceImpersonation",
  async ({ workspaceId, userId, reason }, { dispatch, rejectWithValue }) => {
    try {
      const existingOriginToken = sessionStorage.getItem(
        IMPERSONATION_ORIGIN_TOKEN_KEY,
      );
      const existingOriginUser = sessionStorage.getItem(
        IMPERSONATION_ORIGIN_USER_KEY,
      );

      if (!existingOriginToken || !existingOriginUser) {
        const currentToken = localStorage.getItem("accessToken") || "";
        const currentUser = localStorage.getItem("user") || "";
        if (currentToken && currentUser) {
          sessionStorage.setItem(IMPERSONATION_ORIGIN_TOKEN_KEY, currentToken);
          sessionStorage.setItem(IMPERSONATION_ORIGIN_USER_KEY, currentUser);
        }
      }

      const { data } = await axiosInstance.post("/super-admin/impersonate", {
        workspaceId,
        userId,
        reason,
      });

      const token = String(data?.data?.token || "").trim();
      const user = data?.data?.user || null;

      if (!token || !user) {
        throw new Error("Invalid impersonation response");
      }

      dispatch(setAuthSession({ token, user }));
      return data?.data;
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to start impersonation"),
      );
    }
  },
);

export const stopWorkspaceImpersonation = createAsyncThunk(
  "superAdmin/stopWorkspaceImpersonation",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      await axiosInstance.post("/super-admin/impersonation/stop");

      const originToken = String(
        sessionStorage.getItem(IMPERSONATION_ORIGIN_TOKEN_KEY) || "",
      ).trim();
      const originUserRaw = String(
        sessionStorage.getItem(IMPERSONATION_ORIGIN_USER_KEY) || "",
      ).trim();

      if (!originToken || !originUserRaw) {
        throw new Error("Original session not found");
      }

      const originUser = JSON.parse(originUserRaw);
      dispatch(setAuthSession({ token: originToken, user: originUser }));

      sessionStorage.removeItem(IMPERSONATION_ORIGIN_TOKEN_KEY);
      sessionStorage.removeItem(IMPERSONATION_ORIGIN_USER_KEY);

      return { token: originToken, user: originUser };
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to stop impersonation"),
      );
    }
  },
);

const updateWorkspaceListItem = (state, workspaceId, patch) => {
  state.workspaces = state.workspaces.map((item) => {
    if (String(item.workspaceId || "") !== String(workspaceId || "")) {
      return item;
    }

    return {
      ...item,
      ...patch,
      suspension: {
        ...(item.suspension || {}),
        ...(patch?.suspension || {}),
      },
      abuseMonitoring: {
        ...(item.abuseMonitoring || {}),
        ...(patch?.abuseMonitoring || {}),
      },
    };
  });
};

const superAdminSlice = createSlice({
  name: "superAdmin",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWidgetsCount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWidgetsCount.fulfilled, (state, action) => {
        state.loading = false;
        state.widgetsCount = Number(action.payload || 0);
      })
      .addCase(fetchWidgetsCount.rejected, (state, action) => {
        state.loading = false;
        state.widgetsCount = 0;
        state.error = action.payload;
      })

      .addCase(fetchSuperAdminWorkspaces.pending, (state) => {
        state.workspaceLoading = true;
        state.workspaceError = null;
      })
      .addCase(fetchSuperAdminWorkspaces.fulfilled, (state, action) => {
        state.workspaceLoading = false;
        state.workspaces = action.payload?.data || [];
        state.workspaceMeta = action.payload?.meta || state.workspaceMeta;
      })
      .addCase(fetchSuperAdminWorkspaces.rejected, (state, action) => {
        state.workspaceLoading = false;
        state.workspaceError = action.payload;
      })

      .addCase(scanWorkspaceAbuse.pending, (state) => {
        state.workspaceActionLoading = true;
        state.workspaceError = null;
      })
      .addCase(scanWorkspaceAbuse.fulfilled, (state, action) => {
        state.workspaceActionLoading = false;
        const payload = action.payload || {};
        updateWorkspaceListItem(state, payload.workspaceId, {
          abuseMonitoring: {
            score: Number(payload.score || 0),
            level: String(payload.level || "low"),
            flags: Array.isArray(payload.flags) ? payload.flags : [],
            lastScannedAt: payload.scannedAt || new Date().toISOString(),
          },
        });
      })
      .addCase(scanWorkspaceAbuse.rejected, (state, action) => {
        state.workspaceActionLoading = false;
        state.workspaceError = action.payload;
      })

      .addCase(updateWorkspaceSuspension.pending, (state) => {
        state.workspaceActionLoading = true;
        state.workspaceError = null;
      })
      .addCase(updateWorkspaceSuspension.fulfilled, (state, action) => {
        state.workspaceActionLoading = false;
        const payload = action.payload || {};
        const isSuspended = String(payload.status || "") === "suspended";

        updateWorkspaceListItem(state, payload.workspaceId, {
          status: isSuspended ? "suspended" : "active",
          suspension: {
            isSuspended,
            reason: isSuspended ? String(payload.reason || "") : "",
            suspendedAt: isSuspended ? new Date().toISOString() : null,
            unsuspendedAt: isSuspended ? null : new Date().toISOString(),
          },
        });
      })
      .addCase(updateWorkspaceSuspension.rejected, (state, action) => {
        state.workspaceActionLoading = false;
        state.workspaceError = action.payload;
      })

      .addCase(fetchGlobalModelConfig.pending, (state) => {
        state.globalModelLoading = true;
        state.globalModelError = null;
      })
      .addCase(fetchGlobalModelConfig.fulfilled, (state, action) => {
        state.globalModelLoading = false;
        state.globalModelConfig = {
          ...defaultModelConfig,
          ...(action.payload || {}),
        };
      })
      .addCase(fetchGlobalModelConfig.rejected, (state, action) => {
        state.globalModelLoading = false;
        state.globalModelError = action.payload;
      })

      .addCase(updateGlobalModelConfig.pending, (state) => {
        state.globalModelSaving = true;
        state.globalModelError = null;
      })
      .addCase(updateGlobalModelConfig.fulfilled, (state, action) => {
        state.globalModelSaving = false;
        state.globalModelConfig = {
          ...defaultModelConfig,
          ...(action.payload || {}),
        };
      })
      .addCase(updateGlobalModelConfig.rejected, (state, action) => {
        state.globalModelSaving = false;
        state.globalModelError = action.payload;
      })

      .addCase(startWorkspaceImpersonation.pending, (state) => {
        state.impersonationLoading = true;
        state.impersonationError = null;
      })
      .addCase(startWorkspaceImpersonation.fulfilled, (state) => {
        state.impersonationLoading = false;
      })
      .addCase(startWorkspaceImpersonation.rejected, (state, action) => {
        state.impersonationLoading = false;
        state.impersonationError = action.payload;
      })

      .addCase(stopWorkspaceImpersonation.pending, (state) => {
        state.impersonationLoading = true;
        state.impersonationError = null;
      })
      .addCase(stopWorkspaceImpersonation.fulfilled, (state) => {
        state.impersonationLoading = false;
      })
      .addCase(stopWorkspaceImpersonation.rejected, (state, action) => {
        state.impersonationLoading = false;
        state.impersonationError = action.payload;
      });
  },
});

export const selectWidgetsCount = (state) => state.superAdmin.widgetsCount;
export const selectSuperAdminLoading = (state) => state.superAdmin.loading;
export const selectSuperAdminError = (state) => state.superAdmin.error;

export const selectSuperAdminWorkspaces = (state) => state.superAdmin.workspaces;
export const selectSuperAdminWorkspaceMeta = (state) =>
  state.superAdmin.workspaceMeta;
export const selectSuperAdminWorkspaceLoading = (state) =>
  state.superAdmin.workspaceLoading;
export const selectSuperAdminWorkspaceActionLoading = (state) =>
  state.superAdmin.workspaceActionLoading;
export const selectSuperAdminWorkspaceError = (state) =>
  state.superAdmin.workspaceError;

export const selectGlobalModelConfig = (state) =>
  state.superAdmin.globalModelConfig;
export const selectGlobalModelLoading = (state) =>
  state.superAdmin.globalModelLoading;
export const selectGlobalModelSaving = (state) =>
  state.superAdmin.globalModelSaving;
export const selectGlobalModelError = (state) =>
  state.superAdmin.globalModelError;

export const selectImpersonationLoading = (state) =>
  state.superAdmin.impersonationLoading;
export const selectImpersonationError = (state) =>
  state.superAdmin.impersonationError;

export default superAdminSlice.reducer;
