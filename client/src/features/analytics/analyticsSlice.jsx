import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axios";

const initialState = {
  summary: null,
  points: [],
  days: 14,
  csvExportLoading: false,
  loadingSummary: false,
  loadingSeries: false,
  error: null,
};

const extractErrorMessage = (error, fallback) =>
  error.response?.data?.message || fallback;

export const fetchAnalyticsSummary = createAsyncThunk(
  "analytics/fetchSummary",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/analytics/summary", { params });
      return data?.data || null;
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to fetch analytics summary"),
      );
    }
  },
);

export const fetchAnalyticsTimeSeries = createAsyncThunk(
  "analytics/fetchTimeSeries",
  async (params = {}, { rejectWithValue }) => {
    try {
      const requestParams =
        typeof params === "number" ? { days: params } : params || {};
      const { data } = await axiosInstance.get("/analytics/timeseries", {
        params: requestParams,
      });
      return {
        days: Number(data?.data?.days || requestParams.days || 14),
        points: Array.isArray(data?.data?.points) ? data.data.points : [],
      };
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to fetch analytics timeseries"),
      );
    }
  },
);

export const exportAnalyticsCsv = createAsyncThunk(
  "analytics/exportAnalyticsCsv",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/analytics/export/csv", {
        params,
        responseType: "text",
      });
      return String(data || "");
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to export analytics CSV"),
      );
    }
  },
);

const analyticsSlice = createSlice({
  name: "analytics",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAnalyticsSummary.pending, (state) => {
        state.loadingSummary = true;
        state.error = null;
      })
      .addCase(fetchAnalyticsSummary.fulfilled, (state, action) => {
        state.loadingSummary = false;
        state.summary = action.payload;
      })
      .addCase(fetchAnalyticsSummary.rejected, (state, action) => {
        state.loadingSummary = false;
        state.error = action.payload;
      })
      .addCase(fetchAnalyticsTimeSeries.pending, (state) => {
        state.loadingSeries = true;
        state.error = null;
      })
      .addCase(fetchAnalyticsTimeSeries.fulfilled, (state, action) => {
        state.loadingSeries = false;
        state.days = action.payload.days;
        state.points = action.payload.points;
      })
      .addCase(fetchAnalyticsTimeSeries.rejected, (state, action) => {
        state.loadingSeries = false;
        state.error = action.payload;
      })
      .addCase(exportAnalyticsCsv.pending, (state) => {
        state.csvExportLoading = true;
        state.error = null;
      })
      .addCase(exportAnalyticsCsv.fulfilled, (state) => {
        state.csvExportLoading = false;
      })
      .addCase(exportAnalyticsCsv.rejected, (state, action) => {
        state.csvExportLoading = false;
        state.error = action.payload;
      });
  },
});

export const selectAnalyticsSummary = (state) => state.analytics.summary;
export const selectAnalyticsPoints = (state) => state.analytics.points;
export const selectAnalyticsDays = (state) => state.analytics.days;
export const selectAnalyticsCsvExportLoading = (state) =>
  state.analytics.csvExportLoading;
export const selectAnalyticsLoading = (state) =>
  state.analytics.loadingSummary || state.analytics.loadingSeries;
export const selectAnalyticsError = (state) => state.analytics.error;

export default analyticsSlice.reducer;
