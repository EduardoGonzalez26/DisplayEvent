import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Id de build: en <meta name="app-build"> y en /version.json (estático). La
// invitación lo compara para actualizarse sola tras un despliegue.
function buildVersion() {
  const id = `${Date.now().toString(36)}`;
  return {
    name: "build-version",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace("</head>", `    <meta name="app-build" content="${id}" />\n  </head>`);
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ build: id }) });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), buildVersion()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});