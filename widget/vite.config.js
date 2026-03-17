import { defineConfig } from "vite";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import { resolve } from "path";

export default defineConfig({
  plugins: [cssInjectedByJsPlugin()],
  resolve: {
    extensions: [".js", ".json"],
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.js"),
      name: "ChatFlexWidget",
      fileName: () => "chatflex-widget.js",
      formats: ["iife"],
    },
    outDir: "../server/public",
    emptyOutDir: false,
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});
