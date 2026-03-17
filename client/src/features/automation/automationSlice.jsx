import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axios";

const initialState = {
  rules: [],
  cannedResponses: [],
  workflowTasks: [],
  rulesLoading: false,
  cannedLoading: false,
  tasksLoading: false,
  actionLoading: false,
  processLoading: false,
  error: null,
  successMessage: null,
  testResult: null,
};

const extractError = (error, fallback) =>
  error?.response?.data?.message || fallback;

export const fetchAutomationRules = createAsyncThunk(
  "automation/fetchAutomationRules",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/automation/rules", { params });
      return Array.isArray(data?.data) ? data.data : [];
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to load automation rules"));
    }
  },
);

export const createAutomationRule = createAsyncThunk(
  "automation/createAutomationRule",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/automation/rules", payload);
      return data?.data || null;
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to create automation rule"));
    }
  },
);

export const updateAutomationRule = createAsyncThunk(
  "automation/updateAutomationRule",
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.patch(`/automation/rules/${id}`, updates);
      return data?.data || null;
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to update automation rule"));
    }
  },
);

export const deleteAutomationRule = createAsyncThunk(
  "automation/deleteAutomationRule",
  async (id, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/automation/rules/${id}`);
      return String(id || "");
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to delete automation rule"));
    }
  },
);

export const testAutomationRules = createAsyncThunk(
  "automation/testAutomationRules",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/automation/rules/test", payload);
      return data?.data || {};
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to test automation rules"));
    }
  },
);

export const fetchCannedResponses = createAsyncThunk(
  "automation/fetchCannedResponses",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/automation/canned-responses", {
        params,
      });
      return Array.isArray(data?.data) ? data.data : [];
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to load canned responses"));
    }
  },
);

export const createCannedResponse = createAsyncThunk(
  "automation/createCannedResponse",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post(
        "/automation/canned-responses",
        payload,
      );
      return data?.data || null;
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to create canned response"));
    }
  },
);

export const updateCannedResponse = createAsyncThunk(
  "automation/updateCannedResponse",
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.patch(
        `/automation/canned-responses/${id}`,
        updates,
      );
      return data?.data || null;
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to update canned response"));
    }
  },
);

export const deleteCannedResponse = createAsyncThunk(
  "automation/deleteCannedResponse",
  async (id, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/automation/canned-responses/${id}`);
      return String(id || "");
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to delete canned response"));
    }
  },
);

export const fetchWorkflowTasks = createAsyncThunk(
  "automation/fetchWorkflowTasks",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/automation/workflows/tasks", {
        params,
      });
      return Array.isArray(data?.data) ? data.data : [];
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to load workflow tasks"));
    }
  },
);

export const createWorkflowTask = createAsyncThunk(
  "automation/createWorkflowTask",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/automation/workflows/tasks", payload);
      return data?.data || null;
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to create workflow task"));
    }
  },
);

export const processWorkflowTasksNow = createAsyncThunk(
  "automation/processWorkflowTasksNow",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/automation/workflows/process-now");
      return data?.data || {};
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to process workflow queue"));
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

const automationSlice = createSlice({
  name: "automation",
  initialState,
  reducers: {
    clearAutomationMessages: (state) => {
      state.error = null;
      state.successMessage = null;
      state.testResult = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAutomationRules.pending, (state) => {
        state.rulesLoading = true;
        state.error = null;
      })
      .addCase(fetchAutomationRules.fulfilled, (state, action) => {
        state.rulesLoading = false;
        state.rules = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchAutomationRules.rejected, (state, action) => {
        state.rulesLoading = false;
        state.error = action.payload;
      })
      .addCase(createAutomationRule.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(createAutomationRule.fulfilled, (state, action) => {
        state.actionLoading = false;
        if (action.payload) {
          state.rules = upsertById(state.rules, action.payload);
        }
        state.successMessage = "Automation rule created";
      })
      .addCase(createAutomationRule.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      .addCase(updateAutomationRule.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(updateAutomationRule.fulfilled, (state, action) => {
        state.actionLoading = false;
        if (action.payload) {
          state.rules = upsertById(state.rules, action.payload);
        }
        state.successMessage = "Automation rule updated";
      })
      .addCase(updateAutomationRule.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      .addCase(deleteAutomationRule.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(deleteAutomationRule.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.rules = state.rules.filter(
          (rule) => String(rule?._id || rule?.id || "") !== String(action.payload),
        );
        state.successMessage = "Automation rule deleted";
      })
      .addCase(deleteAutomationRule.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      .addCase(testAutomationRules.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
        state.testResult = null;
      })
      .addCase(testAutomationRules.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.testResult = action.payload || {};
        state.successMessage = "Automation rule test completed";
      })
      .addCase(testAutomationRules.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchCannedResponses.pending, (state) => {
        state.cannedLoading = true;
        state.error = null;
      })
      .addCase(fetchCannedResponses.fulfilled, (state, action) => {
        state.cannedLoading = false;
        state.cannedResponses = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchCannedResponses.rejected, (state, action) => {
        state.cannedLoading = false;
        state.error = action.payload;
      })
      .addCase(createCannedResponse.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(createCannedResponse.fulfilled, (state, action) => {
        state.actionLoading = false;
        if (action.payload) {
          state.cannedResponses = upsertById(state.cannedResponses, action.payload);
        }
        state.successMessage = "Canned response created";
      })
      .addCase(createCannedResponse.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      .addCase(updateCannedResponse.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(updateCannedResponse.fulfilled, (state, action) => {
        state.actionLoading = false;
        if (action.payload) {
          state.cannedResponses = upsertById(state.cannedResponses, action.payload);
        }
        state.successMessage = "Canned response updated";
      })
      .addCase(updateCannedResponse.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      .addCase(deleteCannedResponse.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(deleteCannedResponse.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.cannedResponses = state.cannedResponses.filter(
          (item) => String(item?._id || item?.id || "") !== String(action.payload),
        );
        state.successMessage = "Canned response deleted";
      })
      .addCase(deleteCannedResponse.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchWorkflowTasks.pending, (state) => {
        state.tasksLoading = true;
        state.error = null;
      })
      .addCase(fetchWorkflowTasks.fulfilled, (state, action) => {
        state.tasksLoading = false;
        state.workflowTasks = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchWorkflowTasks.rejected, (state, action) => {
        state.tasksLoading = false;
        state.error = action.payload;
      })
      .addCase(createWorkflowTask.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(createWorkflowTask.fulfilled, (state, action) => {
        state.actionLoading = false;
        if (action.payload) {
          state.workflowTasks = upsertById(state.workflowTasks, action.payload);
        }
        state.successMessage = "Workflow task created";
      })
      .addCase(createWorkflowTask.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      .addCase(processWorkflowTasksNow.pending, (state) => {
        state.processLoading = true;
        state.error = null;
      })
      .addCase(processWorkflowTasksNow.fulfilled, (state, action) => {
        state.processLoading = false;
        state.successMessage = `Processed ${Number(action.payload?.processed || 0)} workflow tasks`;
      })
      .addCase(processWorkflowTasksNow.rejected, (state, action) => {
        state.processLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearAutomationMessages } = automationSlice.actions;

export const selectAutomationRules = (state) => state.automation.rules;
export const selectAutomationCannedResponses = (state) =>
  state.automation.cannedResponses;
export const selectAutomationWorkflowTasks = (state) =>
  state.automation.workflowTasks;
export const selectAutomationRulesLoading = (state) => state.automation.rulesLoading;
export const selectAutomationCannedLoading = (state) =>
  state.automation.cannedLoading;
export const selectAutomationTasksLoading = (state) => state.automation.tasksLoading;
export const selectAutomationActionLoading = (state) =>
  state.automation.actionLoading;
export const selectAutomationProcessLoading = (state) =>
  state.automation.processLoading;
export const selectAutomationError = (state) => state.automation.error;
export const selectAutomationSuccess = (state) => state.automation.successMessage;
export const selectAutomationTestResult = (state) => state.automation.testResult;

export default automationSlice.reducer;
