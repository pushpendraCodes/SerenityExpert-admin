import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiGet, apiPost, getErrorMessage } from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  loading: boolean;
  otpSent: boolean;
  devOtp: string | null;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  hydrated: false,
  loading: false,
  otpSent: false,
  devOtp: null,
  error: null,
};

export const sendOtp = createAsyncThunk(
  "adminAuth/sendOtp",
  async (phone: string, { rejectWithValue }) => {
    try {
      const res = await apiPost<{ otp?: string }>("/auth/send-otp", { phone });
      return { phone, devOtp: res.data?.otp ?? null };
    } catch (e) {
      return rejectWithValue(getErrorMessage(e, "Failed to send OTP"));
    }
  }
);

export const verifyOtp = createAsyncThunk(
  "adminAuth/verifyOtp",
  async ({ phone, otp }: { phone: string; otp: string }, { rejectWithValue }) => {
    try {
      const res = await apiPost<{
        user: User;
        accessToken: string;
        refreshToken: string;
      }>("/auth/verify-otp", { phone, otp });
      const payload = res.data!;
      if (payload.user.role !== "admin") {
        return rejectWithValue("This account does not have admin access");
      }
      return payload;
    } catch (e) {
      return rejectWithValue(getErrorMessage(e, "Invalid OTP"));
    }
  }
);

export const fetchProfile = createAsyncThunk(
  "adminAuth/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiGet<User>("/users/me");
      return res.data!;
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  }
);

export const logout = createAsyncThunk("adminAuth/logout", async () => {
  try {
    await apiPost("/auth/logout");
  } catch {
    /* ignore */
  }
  disconnectSocket();
});

const authSlice = createSlice({
  name: "adminAuth",
  initialState,
  reducers: {
    hydrateAuth(state) {
      const accessToken = localStorage.getItem("adminAccessToken");
      const refreshToken = localStorage.getItem("adminRefreshToken");
      const userRaw = localStorage.getItem("adminUser");
      if (accessToken && userRaw) {
        state.accessToken = accessToken;
        state.refreshToken = refreshToken;
        state.user = JSON.parse(userRaw);
        state.isAuthenticated = true;
        connectSocket(accessToken);
      }
      state.hydrated = true;
    },
    clearError(state) {
      state.error = null;
    },
    resetOtp(state) {
      state.otpSent = false;
      state.devOtp = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.otpSent = true;
        state.devOtp = action.payload.devOtp;
      })
      .addCase(sendOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(verifyOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        localStorage.setItem("adminAccessToken", action.payload.accessToken);
        localStorage.setItem("adminRefreshToken", action.payload.refreshToken);
        localStorage.setItem("adminUser", JSON.stringify(action.payload.user));
        connectSocket(action.payload.accessToken);
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.user = action.payload;
        localStorage.setItem("adminUser", JSON.stringify(action.payload));
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.otpSent = false;
        state.devOtp = null;
        localStorage.removeItem("adminAccessToken");
        localStorage.removeItem("adminRefreshToken");
        localStorage.removeItem("adminUser");
      });
  },
});

export const { hydrateAuth, clearError, resetOtp } = authSlice.actions;
export default authSlice.reducer;
