import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset paths so the built site also works if opened directly
  // from disk (file://) or hosted from any subfolder, not just domain root.
  base: "./",
  server: {
    host: true, // expose on LAN so you can open it from your phone during dev
  },
});
