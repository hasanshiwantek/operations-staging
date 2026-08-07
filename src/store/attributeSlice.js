import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../Axios/axiosInstance";

// ==========================
// GET All Attributes
// ==========================

export const fetchAttributes = createAsyncThunk(
  "attributes/fetchAttributes",
  async (roleId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/order-options/detailed?role_id=${roleId}`
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch attributes"
      );
    }
  }
);

// ==========================
// GET Single Attribute
// ==========================

export const fetchAttributeDetails = createAsyncThunk(
  "attributes/fetchAttributeDetails",
  async ({ id, roleId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/attributes/${id}?role_id=${roleId}`
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to fetch attribute details"
      );
    }
  }
);
export const createAttribute = createAsyncThunk(
  "attributes/createAttribute",
  async ({ roleId, attribute_name }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `/attributes?role_id=${roleId}`,
        {
          role_id: roleId,
          attribute_name,
        }
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to create attribute"
      );
    }
  }
);

export const deleteAttribute = createAsyncThunk(
  "attributes/deleteAttribute",
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(`/attributes/${id}`);

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete attribute"
      );
    }
  }
);
export const createAttributeValue = createAsyncThunk(
  "attributes/createAttributeValue",
  async (
    { attribute_id, attribute_value, role_id },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.post(
        "/attribute-values",
        {
          attribute_id,
          attribute_value,
          role_id,
        }
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to create attribute value"
      );
    }
  }
);
export const updateAttributeValue = createAsyncThunk(
  "attributes/updateAttributeValue",
  async ({ id, attribute_value }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(
        `/attribute-values/${id}`,
        {
          attribute_value,
        }
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to update value"
      );
    }
  }
);
export const deleteAttributeValue = createAsyncThunk(
  "attributes/deleteAttributeValue",
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(
        `/attribute-values/${id}`
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to delete value"
      );
    }
  }
);
export const updateAttribute = createAsyncThunk(
  "attributes/updateAttribute",
  async ({ id, attribute_name }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(
        `/attributes/${id}`,
        {
          attribute_name,
        }
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to update attribute"
      );
    }
  }
);

const initialState = {
  attributes: [],
  attributeDetail: null,

  loading: false,
  detailLoading: false,
 createLoading: false,
  createValueLoading: false,
   deleteLoading: false,
     updateValueLoading: false,
     deleteValueLoading: false,
     updateAttributeLoading: false,

  error: null,
};

const attributeSlice = createSlice({
  name: "attributes",
  initialState,
  reducers: {},

  extraReducers: (builder) => {
    builder

      // ==========================
      // Fetch All
      // ==========================

      .addCase(fetchAttributes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchAttributes.fulfilled, (state, action) => {
        state.loading = false;
        state.attributes = action.payload.data;
      })

      .addCase(fetchAttributes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ==========================
      // Fetch Detail
      // ==========================

      .addCase(fetchAttributeDetails.pending, (state) => {
        state.detailLoading = true;
        state.error = null;
      })

      .addCase(fetchAttributeDetails.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.attributeDetail = action.payload.data;
      })

      .addCase(fetchAttributeDetails.rejected, (state, action) => {
        state.detailLoading = false;
        state.error = action.payload;
      })
      // ==========================
// Create Attribute
// ==========================

.addCase(createAttribute.pending, (state) => {
  state.createLoading = true;
  state.error = null;
})

.addCase(createAttribute.fulfilled, (state) => {
  state.createLoading = false;
})

.addCase(createAttribute.rejected, (state, action) => {
  state.createLoading = false;
  state.error = action.payload;
})

.addCase(deleteAttribute.pending, (state) => {
  state.deleteLoading = true;
})

.addCase(deleteAttribute.fulfilled, (state) => {
  state.deleteLoading = false;
})

.addCase(deleteAttribute.rejected, (state, action) => {
  state.deleteLoading = false;
  state.error = action.payload;
})

.addCase(createAttributeValue.pending, (state) => {
    state.createValueLoading = true;
    state.error = null;
})

.addCase(createAttributeValue.fulfilled, (state) => {
    state.createValueLoading = false;
})

.addCase(createAttributeValue.rejected, (state, action) => {
    state.createValueLoading = false;
    state.error = action.payload;
})

.addCase(updateAttributeValue.pending, (state) => {
    state.updateValueLoading = true;
    state.error = null;
})

.addCase(updateAttributeValue.fulfilled, (state) => {
    state.updateValueLoading = false;
})

.addCase(updateAttributeValue.rejected, (state, action) => {
    state.updateValueLoading = false;
    state.error = action.payload;
})

.addCase(deleteAttributeValue.pending, (state) => {
    state.deleteValueLoading = true;
    state.error = null;
})

.addCase(deleteAttributeValue.fulfilled, (state) => {
    state.deleteValueLoading = false;
})

.addCase(deleteAttributeValue.rejected, (state, action) => {
    state.deleteValueLoading = false;
    state.error = action.payload;
})

.addCase(updateAttribute.pending, (state) => {
  state.updateAttributeLoading = true;
  state.error = null;
})

.addCase(updateAttribute.fulfilled, (state) => {
  state.updateAttributeLoading = false;
})

.addCase(updateAttribute.rejected, (state, action) => {
  state.updateAttributeLoading = false;
  state.error = action.payload;
})
  },
});

export default attributeSlice.reducer;