import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axios";

const initialState = {
  items: [],
  loading: false,
  actionLoading: false,
  csvLoading: false,
  versionsLoadingByFaqId: {},
  versionsByFaqId: {},
  error: null,
  successMessage: null,
};

const extractError = (error, fallback) =>
  error?.response?.data?.message || fallback;

// ─── Thunks ──────────────────────────────────────────────────────────────────
export const fetchFaqs = createAsyncThunk(
  "faqs/fetchFaqs",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/faq");
      return Array.isArray(data?.data) ? data.data : [];
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to load FAQs"));
    }
  },
);

export const createFaq = createAsyncThunk(
  "faqs/createFaq",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/faq", payload);
      return data?.data;
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to create FAQ"));
    }
  },
);

export const updateFaq = createAsyncThunk(
  "faqs/updateFaq",
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.put(`/faq/${id}`, updates);
      return data?.data;
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to update FAQ"));
    }
  },
);

export const reorderFaqs = createAsyncThunk(
  "faqs/reorderFaqs",
  async (items, { rejectWithValue }) => {
    try {
      await axiosInstance.put("/faq/reorder", { items });
      return items;
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to reorder FAQs"));
    }
  },
);

export const deleteFaq = createAsyncThunk(
  "faqs/deleteFaq",
  async (id, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/faq/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to delete FAQ"));
    }
  },
);

export const exportFaqCsv = createAsyncThunk(
  "faqs/exportFaqCsv",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/faq/export/csv", {
        responseType: "text",
      });
      return String(data || "");
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to export FAQ CSV"));
    }
  },
);

export const importFaqCsv = createAsyncThunk(
  "faqs/importFaqCsv",
  async (csvText, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/faq/import/csv", {
        csv: String(csvText || ""),
      });
      return data?.data || {};
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to import FAQ CSV"));
    }
  },
);

export const fetchFaqVersions = createAsyncThunk(
  "faqs/fetchFaqVersions",
  async (faqId, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get(`/faq/${faqId}/versions`);
      return data?.data || {};
    } catch (error) {
      return rejectWithValue(extractError(error, "Failed to fetch FAQ versions"));
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────
const faqSlice = createSlice({
  name: "faqs",
  initialState,
  reducers: {
    clearFaqMessages: (state) => {
      state.error = null;
      state.successMessage = null;
    },
    setFaqsLocally: (state, action) => {
      state.items = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchFaqs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFaqs.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchFaqs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createFaq.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(createFaq.fulfilled, (state, action) => {
        state.actionLoading = false;
        if (action.payload) {
          state.items = [action.payload, ...state.items];
        }
        state.successMessage = "FAQ created successfully.";
      })
      .addCase(createFaq.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      // Update
      .addCase(updateFaq.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(updateFaq.fulfilled, (state, action) => {
        state.actionLoading = false;
        const updated = action.payload;
        if (updated) {
          state.items = state.items.map((item) =>
            String(item._id) === String(updated._id) ? updated : item,
          );
        }
        state.successMessage = "FAQ updated successfully.";
      })
      .addCase(updateFaq.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      // Delete
      .addCase(deleteFaq.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(deleteFaq.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.items = state.items.filter(
          (item) => String(item._id) !== String(action.payload),
        );
        state.successMessage = "FAQ deleted.";
      })
      .addCase(deleteFaq.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      // Reorder
      .addCase(reorderFaqs.pending, (state) => {
        state.error = null;
        state.successMessage = null;
      })
      .addCase(reorderFaqs.fulfilled, (state) => {
        state.successMessage = "FAQs reordered successfully.";
      })
      .addCase(reorderFaqs.rejected, (state, action) => {
        state.error = action.payload;
      })
      // Export CSV
      .addCase(exportFaqCsv.pending, (state) => {
        state.csvLoading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(exportFaqCsv.fulfilled, (state) => {
        state.csvLoading = false;
        state.successMessage = "FAQ CSV exported successfully.";
      })
      .addCase(exportFaqCsv.rejected, (state, action) => {
        state.csvLoading = false;
        state.error = action.payload;
      })
      // Import CSV
      .addCase(importFaqCsv.pending, (state) => {
        state.csvLoading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(importFaqCsv.fulfilled, (state, action) => {
        state.csvLoading = false;
        const created = Number(action.payload?.created || 0);
        const updated = Number(action.payload?.updated || 0);
        const skipped = Number(action.payload?.skipped || 0);
        state.successMessage = `CSV import complete: ${created} created, ${updated} updated, ${skipped} skipped.`;
      })
      .addCase(importFaqCsv.rejected, (state, action) => {
        state.csvLoading = false;
        state.error = action.payload;
      })
      // Version history
      .addCase(fetchFaqVersions.pending, (state, action) => {
        const faqId = String(action.meta.arg || "");
        if (!faqId) return;
        state.versionsLoadingByFaqId[faqId] = true;
        state.error = null;
      })
      .addCase(fetchFaqVersions.fulfilled, (state, action) => {
        const payload = action.payload || {};
        const faqId = String(payload.faqId || "");
        if (!faqId) return;
        state.versionsByFaqId[faqId] = Array.isArray(payload.versions)
          ? payload.versions
          : [];
        state.versionsLoadingByFaqId[faqId] = false;
      })
      .addCase(fetchFaqVersions.rejected, (state, action) => {
        const faqId = String(action.meta.arg || "");
        if (faqId) {
          state.versionsLoadingByFaqId[faqId] = false;
        }
        state.error = action.payload;
      });
  },
});

export const { clearFaqMessages, setFaqsLocally } = faqSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectFaqs = (state) => state.faqs.items;
export const selectFaqsLoading = (state) => state.faqs.loading;
export const selectFaqsActionLoading = (state) => state.faqs.actionLoading;
export const selectFaqCsvLoading = (state) => state.faqs.csvLoading;
export const selectFaqsError = (state) => state.faqs.error;
export const selectFaqsSuccess = (state) => state.faqs.successMessage;
export const selectFaqVersionsById = (state, faqId) =>
  state.faqs.versionsByFaqId[String(faqId || "")] || [];
export const selectFaqVersionsLoadingById = (state, faqId) =>
  Boolean(state.faqs.versionsLoadingByFaqId[String(faqId || "")]);

export default faqSlice.reducer;
