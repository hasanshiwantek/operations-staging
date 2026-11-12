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
  build: {
    rollupOptions: {
      output: {
        // The PDF.js worker ships as .mjs, which the production nginx serves as
        // application/octet-stream; browsers refuse to run a module worker
        // with that type, so Generate JPG failed. Emit it as .js instead.
        assetFileNames: (asset) =>
          /\.mjs$/i.test(asset.names?.[0] ?? asset.name ?? "")
            ? "assets/[name]-[hash].js"
            : "assets/[name]-[hash][extname]",
      },
    },
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
