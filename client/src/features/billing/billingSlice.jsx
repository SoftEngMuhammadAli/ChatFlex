import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axios";

const initialState = {
  billing: null,
  pricingPlans: [],
  loadingStatus: false,
  loadingPricing: false,
  actionLoading: false,
  checkoutSessionId: "",
  error: null,
};

const extractErrorMessage = (error, fallback) =>
  error.response?.data?.message || fallback;

/* ============================= */
/* FETCH BILLING STATUS */
/* ============================= */
export const fetchBillingStatus = createAsyncThunk(
  "billing/fetchStatus",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/billing/billing");

      // backend returns { success, data }
      return data?.data || null;
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to fetch billing status"),
      );
    }
  },
);

/* ============================= */
/* FETCH PRICING PLANS */
/* ============================= */
export const fetchPricingPlans = createAsyncThunk(
  "billing/fetchPricingPlans",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/billing/pricing");

      // backend returns { success, count, data: [] }
      return Array.isArray(data?.data) ? data.data : [];
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to fetch pricing plans"),
      );
    }
  },
);

/* ============================= */
/* CREATE STRIPE CHECKOUT SESSION */
/* ============================= */
export const createStripeCheckoutSession = createAsyncThunk(
  "billing/createStripeCheckoutSession",
  async ({ planId, paymentMethodType }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/billing/checkout/session", {
        planId,
        paymentMethodType,
      });
      return data?.data || null;
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to create checkout session"),
      );
    }
  },
);

/* ============================= */
/* VERIFY STRIPE CHECKOUT SESSION */
/* ============================= */
export const verifyStripeCheckoutSession = createAsyncThunk(
  "billing/verifyStripeCheckoutSession",
  async (sessionId, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get(
        `/billing/checkout/session/${sessionId}/verify`,
      );
      return data?.data || null;
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to verify checkout session"),
      );
    }
  },
);

/* ============================= */
/* START FREE TRIAL             */
/* ============================= */
export const startBillingTrial = createAsyncThunk(
  "billing/startBillingTrial",
  async (planId, { rejectWithValue }) => {
    try {
      const payload = planId ? { planId } : {};
      const { data } = await axiosInstance.post(
        "/billing/billing/trial/start",
        payload,
      );
      return data?.data || null;
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, "Failed to start free trial"),
      );
    }
  },
);

const billingSlice = createSlice({
  name: "billing",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      /* BILLING */
      .addCase(fetchBillingStatus.pending, (state) => {
        state.loadingStatus = true;
        state.error = null;
      })
      .addCase(fetchBillingStatus.fulfilled, (state, action) => {
        state.loadingStatus = false;
        state.billing = action.payload;
      })
      .addCase(fetchBillingStatus.rejected, (state, action) => {
        state.loadingStatus = false;
        state.billing = null;
        state.error = action.payload;
      })

      /* PRICING */
      .addCase(fetchPricingPlans.pending, (state) => {
        state.loadingPricing = true;
        state.error = null;
      })
      .addCase(fetchPricingPlans.fulfilled, (state, action) => {
        state.loadingPricing = false;
        state.pricingPlans = action.payload;
      })
      .addCase(fetchPricingPlans.rejected, (state, action) => {
        state.loadingPricing = false;
        state.pricingPlans = [];
        state.error = action.payload;
      })

      /* STRIPE CREATE CHECKOUT */
      .addCase(createStripeCheckoutSession.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(createStripeCheckoutSession.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.checkoutSessionId = action.payload?.sessionId || "";
      })
      .addCase(createStripeCheckoutSession.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      /* STRIPE VERIFY CHECKOUT */
      .addCase(verifyStripeCheckoutSession.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(verifyStripeCheckoutSession.fulfilled, (state, action) => {
        state.actionLoading = false;
        if (action.payload?.billing) {
          state.billing = action.payload.billing;
        }
      })
      .addCase(verifyStripeCheckoutSession.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      /* START TRIAL */
      .addCase(startBillingTrial.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(startBillingTrial.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.billing = action.payload || state.billing;
      })
      .addCase(startBillingTrial.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      });
  },
});

/* ============================= */
/* SELECTORS */
/* ============================= */

export const selectBilling = (state) => state.billing.billing;
export const selectBillingPlans = (state) => state.billing.pricingPlans;
export const selectBillingLoading = (state) =>
  state.billing.loadingStatus ||
  state.billing.loadingPricing ||
  state.billing.actionLoading;
export const selectBillingError = (state) => state.billing.error;

export default billingSlice.reducer;
