import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { sdk } from "../_core/sdk";
import { getUserByOpenId, upsertUser } from "../db";
import { ENV } from "../_core/env";
import { TRPCError } from "@trpc/server";
import { hashPassword, isValidLoginIdOrEmail, isValidPassword, verifyPassword } from "../_core/password";
import { COOKIE_NAME } from "@shared/const";
import { getDb } from "../db";
import { deliveries } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";

function buildCookie(name: string, value: string, maxAgeSeconds: number) {
  const isProd = (ENV.nodeEnv || process.env.NODE_ENV) === "production";
  // Render roda em HTTPS no domínio final; Secure em produção é OK.
  const secure = isProd;
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=/`,
    `Max-Age=${maxAgeSeconds}`,
    `SameSite=Lax`,
    `HttpOnly`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function clearCookie(name: string) {
  // Expira imediatamente
  return `${name}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`;
}

export const authRouter = router({
  /**
   * Login local (SEM dependências externas): usuário + senha.
   * - openId agora pode ser qualquer identificador (letras/números e separadores como ';').
   * - Para bases antigas: se o usuário não tem passwordHash, o 1º login define a senha.
   */
  login: publicProcedure
    .input(
      z.object({
        loginId: z.string().min(3),
        password: z.string().min(4),
        name: z.string().optional(),
        email: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // ✅ IMPORTANTE: o servidor deve usar o MESMO cookie name do middleware de auth (sdk.ts)
      // O sdk lê COOKIE_NAME (@shared/const). Se o login escrever outro nome, a sessão nunca será reconhecida.
      const cookieName = ENV.sessionCookieName || COOKIE_NAME;
      const openId = input.loginId.trim().toLowerCase();

      if (!isValidLoginIdOrEmail(openId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Usuário inválido. Use um login (letras/números e ; . _ -) ou um e-mail válido",
        });
      }
      if (!isValidPassword(input.password)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Senha inválida. Use apenas letras, números e caracteres ; . _ -",
        });
      }

      // upsert no banco (role/tenant será resolvido no server/db.ts)
      // ✅ Busca usuário existente para validar/definir senha
      const existing = await getUserByOpenId(openId);
      const now = new Date();

      if (existing?.passwordHash) {
        const ok = verifyPassword(input.password, existing.passwordHash);
        if (!ok) throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha incorretos" });
      }

      // Se não existir ou não tiver senha definida, define a senha no 1º login.
      const passwordHash = existing?.passwordHash ? undefined : hashPassword(input.password);

      // upsert no banco (role/tenant será resolvido no server/db.ts)
      await upsertUser({
        openId,
        name: input.name ?? existing?.name ?? null,
        email: input.email ?? existing?.email ?? null,
        loginMethod: "local",
        passwordHash,
        lastSignedIn: now,
      } as any);

      const token = await sdk.createSessionToken(openId);
      const header = buildCookie(cookieName, token, 60 * 60 * 24 * 30);
      ctx.res.setHeader("Set-Cookie", header);

      return { success: true };
    }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    const cookieName = ENV.sessionCookieName || COOKIE_NAME;
    ctx.res.setHeader("Set-Cookie", clearCookie(cookieName));
    return { success: true };
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    // Para ADMIN, útil saber se existe inbox (mensagens recebidas do OWNER)
    let hasInbox: boolean | undefined = undefined;
    if (ctx.user?.role === "admin") {
      const db = await getDb();
      if (db) {
        const res = await db
          .select({ c: sql<number>`count(*)` })
          .from(deliveries)
          .where(eq(deliveries.userId, ctx.user.id))
          .limit(1);
        hasInbox = Number(res?.[0]?.c ?? 0) > 0;
      }
    }
    return { user: { ...ctx.user, hasInbox } };
  }),
});
