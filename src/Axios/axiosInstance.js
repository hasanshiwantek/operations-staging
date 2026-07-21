// lib/axiosInstance.ts
import axios from "axios";
import { toast } from "react-toastify";

const axiosInstance = axios.create({
 baseURL: "https://optest.advertsedge.com/api",
//  baseURL: "https://operations.advertsedge.com/api",
});

axiosInstance.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
      const data = localStorage.getItem("persist:auth"); 
      const token = data ? JSON.parse(data)?.token : null;
      const tokenparsed = token ? JSON.parse(token) : null;
    if (tokenparsed) {
      config.headers.Authorization = `Bearer ${tokenparsed}`;
    }
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => {
    if (response.data?.message) {
      toast.success(response.data.message, {
        style: {
          fontSize: "12px",
          fontWeight: "bold",
        },
      });
    }
    return response;
  },
  (error) => {
    if (error.response?.data?.message) {
      toast.error(error.response.data.message, {
        style: {
          fontSize: "12px",
          fontWeight: "bold",
        },
      });
    }

    const errors = error.response?.data.errors;
    if (errors && typeof errors === "object") {
      Object.values(errors).forEach((fieldErrors) => {
        if (Array.isArray(fieldErrors)) {
          fieldErrors.forEach((err) =>
            toast.error(err, {
              style: {
                fontSize: "12px",
                fontWeight: "bold",
              },
            })
          );
        }
      });
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
