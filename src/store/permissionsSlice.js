import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../Axios/axiosInstance';

const initialState = {
    permissions: [],
    permissionsLoading: false,
    error: null,
    userPermissions: []
};

// GET /admin/permissions
export const getPermissions = createAsyncThunk(
    'permissions/getPermissions',
    async (_, { getState, rejectWithValue }) => {
        try {
            const response = await axiosInstance.get('/admin/permissions');

            // Response shape:
            // { success: true, permissions: [ { id, name, slug, children: [...] } ] }
            return response.data;
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message ||
                error.message ||
                'Failed to fetch permissions'
            );
        }
    }
);
export const getPermissionsByStoreId = createAsyncThunk(
    'permissions/get-role-by-store-id',
    async ({ rejectWithValue }) => {
        try {
            const response = await axiosInstance.get('/auth/get-role-by-store-id');
            return response?.data;
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message ||
                error.message ||
                'Failed to fetch permissions'
            );
        }
    }
);

const permissionsSlice = createSlice({
    name: 'permissions',
    initialState,
    reducers: {
        clearPermissions: (state) => {
            state.permissions = [];
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getPermissions.pending, (state) => {
                state.permissionsLoading = true;
                state.error = null;
            })
            .addCase(getPermissions.fulfilled, (state, action) => {
                state.permissionsLoading = false;
                state.permissions = action.payload?.permissions || [];
                state.error = null;
            })
            .addCase(getPermissions.rejected, (state, action) => {
                state.permissionsLoading = false;
                state.permissions = [];
                state.error = action.payload;
            })

        // Permissions By Store
        builder
            .addCase(getPermissionsByStoreId.pending, (state) => {
                state.permissionsLoading = true;
                state.error = null;
            })
            .addCase(getPermissionsByStoreId.fulfilled, (state, action) => {
                state.permissionsLoading = false;
                state.userPermissions = action.payload?.permissions || [];
                state.error = null;
            })
            .addCase(getPermissionsByStoreId.rejected, (state, action) => {
                state.permissionsLoading = false;
                state.userPermissions = [];
                state.error = action.payload;
            });
    },
});

export const { clearPermissions } = permissionsSlice.actions;
export default permissionsSlice.reducer;