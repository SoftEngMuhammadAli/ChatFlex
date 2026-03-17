import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axios";

const initialState = {
  items: [],
  loading: false,
  actionLoading: false,
  formSubmissionsByWidgetId: {},
  formSubmissionsMetaByWidgetId: {},
  formSubmissionsLoadingByWidgetId: {},
  formSubmissionsErrorByWidgetId: {},
  error: null,
  successMessage: null,
};

const extractErrorMessage = (error, fallback) =>
  error.response?.data?.message || fallback;

export const fetchSuperAdminWidgets = createAsyncThunk(
  "superAdminWidgets/fetchSuperAdminWidgets",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/widget-templates");
      return Array.isArray(data?.data) ? data.data : [];
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to load widgets"),
      );
    }
  },
);

export const createSuperAdminWidget = createAsyncThunk(
  "superAdminWidgets/createSuperAdminWidget",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/widget-templates", payload);
      return data?.data;
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to add widget"),
      );
    }
  },
);

export const updateSuperAdminWidget = createAsyncThunk(
  "superAdminWidgets/updateSuperAdminWidget",
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.put(
        `/widget-templates/${id}`,
        updates,
      );
      return data?.data;
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to update widget"),
      );
    }
  },
);

export const generateSuperAdminWidgetScript = createAsyncThunk(
  "superAdminWidgets/generateSuperAdminWidgetScript",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get(
        `/widget-templates/${id}/script`,
      );
      return data?.data?.script || "";
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to generate widget script"),
      );
    }
  },
);

export const deleteSuperAdminWidget = createAsyncThunk(
  "superAdminWidgets/deleteSuperAdminWidget",
  async (id, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/widget-templates/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to delete widget"),
      );
    }
  },
);

export const uploadWidgetLogo = createAsyncThunk(
  "superAdminWidgets/uploadWidgetLogo",
  async ({ id, file }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await axiosInstance.post(
        `/widget-templates/${id}/logo`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      return { id, logoUrl: data?.data?.logoUrl };
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to upload logo"),
      );
    }
  },
);

export const fetchWidgetFormSubmissions = createAsyncThunk(
  "superAdminWidgets/fetchWidgetFormSubmissions",
  async ({ id, params = {} }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get(
        `/widget-templates/${id}/form-submissions`,
        { params },
      );
      return {
        id,
        items: Array.isArray(data?.data) ? data.data : [],
        meta: data?.meta || {},
      };
    } catch (error) {
      return rejectWithValue({
        id,
        message: extractErrorMessage(
          error,
          "Failed to load widget form submissions",
        ),
      });
    }
  },
);

const superAdminWidgetsSlice = createSlice({
  name: "superAdminWidgets",
  initialState,
  reducers: {
    clearSuperAdminWidgetsMessages: (state) => {
      state.error = null;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSuperAdminWidgets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSuperAdminWidgets.fulfilled, (state, action) => {
        state.loading = false;
        state.items = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchSuperAdminWidgets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createSuperAdminWidget.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(createSuperAdminWidget.fulfilled, (state, action) => {
        state.actionLoading = false;
        if (action.payload) {
          state.items = [action.payload, ...state.items];
        }
        state.successMessage = "Widget created successfully";
      })
      .addCase(createSuperAdminWidget.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      .addCase(updateSuperAdminWidget.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(updateSuperAdminWidget.fulfilled, (state, action) => {
        state.actionLoading = false;
        const updated = action.payload;
        if (updated) {
          const updatedId = String(updated._id || updated.id);
          state.items = state.items.map((item) =>
            String(item._id || item.id) === updatedId ? updated : item,
          );
        }
        state.successMessage = "Widget updated successfully";
      })
      .addCase(updateSuperAdminWidget.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      .addCase(deleteSuperAdminWidget.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(deleteSuperAdminWidget.fulfilled, (state, action) => {
        state.actionLoading = false;
        const deletedId = String(action.payload);
        state.items = state.items.filter(
          (item) => String(item._id || item.id) !== deletedId,
        );
        state.successMessage = "Widget deleted successfully";
      })
      .addCase(deleteSuperAdminWidget.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      .addCase(uploadWidgetLogo.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(uploadWidgetLogo.fulfilled, (state, action) => {
        state.actionLoading = false;
        const { id, logoUrl } = action.payload;
        state.items = state.items.map((item) =>
          String(item._id || item.id) === String(id)
            ? { ...item, logoUrl }
            : item,
        );
        state.successMessage = "Logo uploaded successfully";
      })
      .addCase(uploadWidgetLogo.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchWidgetFormSubmissions.pending, (state, action) => {
        const widgetId = String(action.meta.arg?.id || "");
        if (!widgetId) return;
        state.formSubmissionsLoadingByWidgetId[widgetId] = true;
        state.formSubmissionsErrorByWidgetId[widgetId] = null;
      })
      .addCase(fetchWidgetFormSubmissions.fulfilled, (state, action) => {
        const widgetId = String(action.payload?.id || "");
        if (!widgetId) return;
        state.formSubmissionsByWidgetId[widgetId] = Array.isArray(
          action.payload?.items,
        )
          ? action.payload.items
          : [];
        state.formSubmissionsMetaByWidgetId[widgetId] =
          action.payload?.meta || {};
        state.formSubmissionsLoadingByWidgetId[widgetId] = false;
        state.formSubmissionsErrorByWidgetId[widgetId] = null;
      })
      .addCase(fetchWidgetFormSubmissions.rejected, (state, action) => {
        const widgetId = String(action.payload?.id || action.meta.arg?.id || "");
        if (!widgetId) return;
        state.formSubmissionsLoadingByWidgetId[widgetId] = false;
        state.formSubmissionsErrorByWidgetId[widgetId] =
          action.payload?.message || "Failed to load widget form submissions";
      });
  },
});

export const { clearSuperAdminWidgetsMessages } =
  superAdminWidgetsSlice.actions;

export const selectSuperAdminWidgets = (state) => state.superAdminWidgets.items;
export const selectSuperAdminWidgetsLoading = (state) =>
  state.superAdminWidgets.loading;
export const selectSuperAdminWidgetsActionLoading = (state) =>
  state.superAdminWidgets.actionLoading;
export const selectSuperAdminWidgetsError = (state) =>
  state.superAdminWidgets.error;
export const selectSuperAdminWidgetsSuccess = (state) =>
  state.superAdminWidgets.successMessage;
export const selectWidgetFormSubmissionsById = (state, widgetId) =>
  state.superAdminWidgets.formSubmissionsByWidgetId[String(widgetId || "")] ||
  [];
export const selectWidgetFormSubmissionsMetaById = (state, widgetId) =>
  state.superAdminWidgets.formSubmissionsMetaByWidgetId[
    String(widgetId || "")
  ] || {};
export const selectWidgetFormSubmissionsLoadingById = (state, widgetId) =>
  Boolean(
    state.superAdminWidgets.formSubmissionsLoadingByWidgetId[
      String(widgetId || "")
    ],
  );
export const selectWidgetFormSubmissionsErrorById = (state, widgetId) =>
  state.superAdminWidgets.formSubmissionsErrorByWidgetId[
    String(widgetId || "")
  ] || null;

export default superAdminWidgetsSlice.reducer;
