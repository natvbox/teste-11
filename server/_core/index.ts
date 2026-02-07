import "dotenv/config";
import express from "express";
import { createServer } from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { setupVite } from "./vite";
import { ENV } from "./env";

/* ============================
   ✅ FIX PARA __dirname EM ESM
============================ */
const __filename = fileURLToPath(import.meta.url );
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ✅ Render/Proxies: necessário para cookies Secure e IP real
  app.set("trust proxy", 1);

  // ✅ CORS precisa vir antes (cookies + credentials)
  app.use(
    cors({
      origin: (origin, callback) => {
        // Dev: libera (útil para Vite + localhost)
        if (!ENV.isProduction) return callback(null, true);

        // Prod: restringe por origem (se definido). Sem origin (ex.: curl) pode permitir.
        if (!origin) return callback(null, true);

        const allowed = (ENV.webOrigin || "").split(",").map(s => s.trim()).filter(Boolean);
        if (allowed.length === 0) return callback(null, true);
        return allowed.includes(origin) ? callback(null, true) : callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    })
  );

  app.use(cookieParser());

  // ✅ Headers básicos de segurança (sem depender de libs externas)
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    // Evita que assets sejam embutidos por outros sites
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    // CSP mínima (não quebra Vite; ainda assim protege em PROD)
    if (ENV.isProduction) {
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; img-src 'self' data: https:; media-src 'self' https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https:; frame-ancestors 'none'"
      );
    }
    next();
  });

  // 🚨 OBRIGATÓRIO: JSON parser ANTES do tRPC (inclui batch)
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));

  registerOAuthRoutes(app);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    console.log("🚧 DEV: usando Vite");
    await setupVite(app, server);
  } else {
    console.log("🚀 PROD: servindo frontend estático");

    // ✅ CAMINHO CORRETO PARA O BUILD DO VITE
    // Em produção, após o build, dist/index.js e dist/public/ estão no mesmo nível
    const frontendPath = path.resolve(__dirname, "./public");

    console.log("📁 Frontend path:", frontendPath);

    app.use(express.static(frontendPath));

    app.get("*", (_req, res) => {
      res.sendFile(path.join(frontendPath, "index.html"));
    });
  }

  const port = Number(process.env.PORT || 3000);

  server.listen(port, "0.0.0.0", () => {
    console.log("========================================");
    console.log("✅ Servidor rodando");
    console.log("🌐 Porta:", port);
    console.log("========================================");
  });
}

startServer().catch((err) => {
  console.error("❌ Erro fatal ao iniciar servidor:", err);
  process.exit(1);
});
