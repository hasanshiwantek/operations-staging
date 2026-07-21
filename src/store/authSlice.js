import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../Axios/axiosInstance';
import { updateUser } from './usersSlice';

const initialState = {
  user: null,
  token: null,
    storeId: null, 
  isAuthenticated: false,
  signInLoading: false,
  loading: false,
  error: null,
};

// Login async thunk
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('auth/login', credentials);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Login failed'
      );
    }
  }
);

// Register async thunk
export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('auth/register', userData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Registration failed'
      );
    }
  }
);



const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
        // ✅ Store select (manual)
    setStoreId: (state, action) => {
      state.storeId = action.payload; // payload = storeId
    },

    // ✅ Store remove
    clearStore: (state) => {
      state.storeId = null;
    },
    // Manual logout (without API call)
    logoutManual: (state) => {
      state.user = null;
      state.token = null;
      state.storeId = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      localStorage.removeItem('persist:auth');
    },
  },
  extraReducers: (builder) => {
    // Login reducers
    builder
      .addCase(login.pending, (state) => {
        state.signInLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.signInLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.data || action.payload.data?.user;
        state.token = action.payload.token || action.payload.data?.token;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.signInLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = action.payload;
      })
      // Register reducers
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // When super admin (or any user) updates own profile, sync auth.user
      .addCase(updateUser.fulfilled, (state, action) => {
        const updated = action.payload?.data;
        if (updated && state.user?.id === updated.id) {
          state.user = { ...state.user, ...updated };
        }
      });
  },
});

export const {
  logoutManual,
  setStoreId,
  clearStore,
  clearError,
} = authSlice.actions;

export default authSlice.reducer;

