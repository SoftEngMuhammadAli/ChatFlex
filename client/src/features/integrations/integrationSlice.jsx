import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axios";

const initialState = {
  items: [],
  loading: false,
  actionLoading: false,
  error: null,
  successMessage: null,
  testResultById: {},
};

const extractError = (error, fallback) =>
  error?.response?.data?.message || fallback;

export const fetchIntegrations = createAsyncThunk(
  "integrations/fetchIntegrations",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/integrations", { params });
      return Array.isArray(data?.data) ? data.data : [];
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to load integrations"));
    }
  },
);

export const createIntegration = createAsyncThunk(
  "integrations/createIntegration",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/integrations", payload);
      return data?.data || null;
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to create integration"));
    }
  },
);

export const updateIntegration = createAsyncThunk(
  "integrations/updateIntegration",
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.patch(`/integrations/${id}`, updates);
      return data?.data || null;
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to update integration"));
    }
  },
);

export const deleteIntegration = createAsyncThunk(
  "integrations/deleteIntegration",
  async (id, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/integrations/${id}`);
      return String(id || "");
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to delete integration"));
    }
  },
);

export const testIntegration = createAsyncThunk(
  "integrations/testIntegration",
  async ({ id, event, payload }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post(`/integrations/${id}/test`, {
        event,
        payload,
      });
      return {
        id: String(id || ""),
        result: data?.data || {},
      };
    } catch (error) {
      return rejectWithValue({
        id: String(id || ""),
        message: extractError(error, "Failed to test integration"),
      });
    }
  },
);

const upsertById = (collection, item) => {
  const id = String(item?._id || item?.id || "");
  if (!id) return collection;
  const found = collection.some(
    (entry) => String(entry?._id || entry?.id || "") === id,
  );
  if (!found) return [item, ...collection];
  return collection.map((entry) =>
    String(entry?._id || entry?.id || "") === id ? item : entry,
  );
};

const integrationSlice = createSlice({
  name: "integrations",
  initialState,
  reducers: {
    clearIntegrationMessages: (state) => {
      state.error = null;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchIntegrations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIntegrations.fulfilled, (state, action) => {
        state.loading = false;
        state.items = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchIntegrations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createIntegration.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(createIntegration.fulfilled, (state, action) => {
        state.actionLoading = false;
        if (action.payload) {
          state.items = upsertById(state.items, action.payload);
        }
        state.successMessage = "Integration created";
      })
      .addCase(createIntegration.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      .addCase(updateIntegration.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(updateIntegration.fulfilled, (state, action) => {
        state.actionLoading = false;
        if (action.payload) {
          state.items = upsertById(state.items, action.payload);
        }
        state.successMessage = "Integration updated";
      })
      .addCase(updateIntegration.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      .addCase(deleteIntegration.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(deleteIntegration.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.items = state.items.filter(
          (item) => String(item?._id || item?.id || "") !== String(action.payload),
        );
        state.successMessage = "Integration deleted";
      })
      .addCase(deleteIntegration.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      .addCase(testIntegration.pending, (state, action) => {
        const id = String(action.meta.arg?.id || "");
        if (id) {
          state.testResultById[id] = { loading: true, result: null, error: null };
        }
        state.error = null;
      })
      .addCase(testIntegration.fulfilled, (state, action) => {
        const id = String(action.payload?.id || "");
        if (id) {
          state.testResultById[id] = {
            loading: false,
            result: action.payload?.result || {},
            error: null,
          };
        }
        state.successMessage = "Integration test completed";
      })
      .addCase(testIntegration.rejected, (state, action) => {
        const id = String(action.payload?.id || action.meta.arg?.id || "");
        const errorMessage = action.payload?.message || "Failed to test integration";
        if (id) {
          state.testResultById[id] = {
            loading: false,
            result: null,
            error: errorMessage,
          };
        }
        state.error = errorMessage;
      });
  },
});

export const { clearIntegrationMessages } = integrationSlice.actions;

export const selectIntegrations = (state) => state.integrations.items;
export const selectIntegrationsLoading = (state) => state.integrations.loading;
export const selectIntegrationsActionLoading = (state) =>
  state.integrations.actionLoading;
export const selectIntegrationsError = (state) => state.integrations.error;
export const selectIntegrationsSuccess = (state) =>
  state.integrations.successMessage;
export const selectIntegrationTestResultMap = (state) =>
  state.integrations.testResultById || {};
export const selectIntegrationTestResultById = (state, id) =>
  state.integrations.testResultById[String(id || "")] || {
    loading: false,
    result: null,
    error: null,
  };

export default integrationSlice.reducer;
