// Variáveis de ambiente do servidor
export const ENV = {
  appId: process.env.VITE_APP_ID ?? "notifique-me",
  nodeEnv: process.env.NODE_ENV ?? "development",
  // Nome do cookie de sessão (mantém compatibilidade com versões antigas)
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? "",
  // ✅ Em produção, JWT_SECRET é obrigatório. Em dev, mantemos fallback.
  cookieSecret:
    process.env.JWT_SECRET ??
    (process.env.NODE_ENV === "production" ? "" : "default-secret-for-development"),
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // ✅ Origem permitida para CORS em produção (ex.: https://seuapp.com)
  webOrigin: process.env.WEB_ORIGIN ?? "",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  port: parseInt(process.env.PORT || "3000", 10),
  host: process.env.HOST || "0.0.0.0",
};

// Log de configuração (apenas em desenvolvimento)
if (!ENV.isProduction) {
  console.log("[ENV] Configuração carregada:");
  console.log("  - appId:", ENV.appId);
  console.log("  - ownerOpenId:", ENV.ownerOpenId || "(não definido)");
  console.log("  - databaseUrl:", ENV.databaseUrl ? "(definido)" : "(não definido)");
  console.log("  - isProduction:", ENV.isProduction);
}

// Validações críticas
if (!ENV.databaseUrl) {
  console.warn("[ENV] ⚠️ DATABASE_URL não está definido. O banco de dados não funcionará.");
}

if (ENV.isProduction && !ENV.cookieSecret) {
  throw new Error("[ENV] ❌ JWT_SECRET é obrigatório em produção (Render/PROD). Defina JWT_SECRET no ambiente.");
}

if (ENV.isProduction && !ENV.webOrigin) {
  console.warn(
    "[ENV] ⚠️ WEB_ORIGIN não está definido. Recomenda-se definir WEB_ORIGIN para restringir CORS em produção."
  );
}

if (!ENV.ownerOpenId) {
  console.warn("[ENV] ⚠️ OWNER_OPEN_ID não está definido. Nenhum usuário será owner.");
}
