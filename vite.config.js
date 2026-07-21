import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // proxy: {
    //   "/auth": {
    //     target: "https://operations.advertsedge.com/api",
    //     changeOrigin: true,
    //     secure: false,
    //   },
    //   "/orders": {
    //     target: "https://operations.advertsedge.com/api",
    //     changeOrigin: true,
    //     secure: false,
    //   },
    //   "/users/index": {
    //     target: "https://operations.advertsedge.com/api",
    //     changeOrigin: true,
    //     secure: false,
    //   },
    //   "/my-sheet-data": {
    //     target: "https://operations.advertsedge.com/api",
    //     changeOrigin: true,
    //     secure: false,
    //   },
    //   "/my-sheet-order?order_id=": {
    //     target: "https://operations.advertsedge.com/api",
    //     changeOrigin: true,
    //     secure: false,
    //   },
    //   "/my-sheet-data?sheet_id=": {
    //     target: "https://operations.advertsedge.com/api",
    //     changeOrigin: true,
    //     secure: false,
    //   },
    // },
  },
});
