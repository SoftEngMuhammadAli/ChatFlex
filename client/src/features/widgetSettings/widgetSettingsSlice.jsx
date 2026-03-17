import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axios";

const initialState = {
  data: null,
  loading: false,
  saving: false,
  error: null,
  successMessage: null,
};

const extractErrorMessage = (error, fallback) =>
  error.response?.data?.message || fallback;

export const fetchTenantWidgetSettings = createAsyncThunk(
  "widgetSettings/fetchTenantWidgetSettings",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/tenant/settings");
      return data?.data || {};
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to load widget settings."),
      );
    }
  },
);

export const saveTenantWidgetSettings = createAsyncThunk(
  "widgetSettings/saveTenantWidgetSettings",
  async (payload, { rejectWithValue }) => {
    try {
      await axiosInstance.put("/tenant/settings", payload);
      return "Settings saved successfully!";
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to save changes."),
      );
    }
  },
);

const widgetSettingsSlice = createSlice({
  name: "widgetSettings",
  initialState,
  reducers: {
    clearWidgetSettingsMessages: (state) => {
      state.error = null;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTenantWidgetSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTenantWidgetSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload || null;
      })
      .addCase(fetchTenantWidgetSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(saveTenantWidgetSettings.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(saveTenantWidgetSettings.fulfilled, (state, action) => {
        state.saving = false;
        state.successMessage = action.payload;
      })
      .addCase(saveTenantWidgetSettings.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      });
  },
});

export const { clearWidgetSettingsMessages } = widgetSettingsSlice.actions;

export const selectWidgetSettingsData = (state) => state.widgetSettings.data;
export const selectWidgetSettingsLoading = (state) =>
  state.widgetSettings.loading;
export const selectWidgetSettingsSaving = (state) =>
  state.widgetSettings.saving;
export const selectWidgetSettingsError = (state) => state.widgetSettings.error;
export const selectWidgetSettingsSuccessMessage = (state) =>
  state.widgetSettings.successMessage;

export default widgetSettingsSlice.reducer;
