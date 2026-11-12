import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

// The app version shown in the footer: bump "version" in package.json
const { version } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
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
