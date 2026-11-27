import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    include: ["src/tests/**/*.test.{js,jsx}"],
    setupFiles: "./src/tests/setup.js",
    clearMocks: true,
  },
});
