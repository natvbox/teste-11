import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { sdk } from "../_core/sdk";
import { getUserByOpenId, upsertUser, getDb } from "../db";
import { ENV } from "../_core/env";
import { TRPCError } from "@trpc/server";
import {
  hashPassword,
  isValidLoginIdOrEmail,
  isValidPassword,
  verifyPassword,
} from "../_core/password";
import { COOKIE_NAME } from "@shared/const";
import { deliveries } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";

function buildCookie(name: string, value: string, maxAgeSeconds: number) {
  const isProd = (ENV.nodeEnv || process.env.NODE_ENV) === "production";
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
  return `${name}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`;
}

export const authRouter = router({
  /**
   * Login local (SEM dependências externas): usuário + senha.
   * - loginId pode ser um login (sem @) ou e-mail
   * - Se o usuário não tem senha definida, o 1º login define a senha
   *
   * ⚠️ IMPORTANTE:
   * A coluna no banco é: password_hash
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
      const cookieName = ENV.sessionCookieName || COOKIE_NAME;
      const openId = input.loginId.trim().toLowerCase();

      if (!isValidLoginIdOrEmail(openId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Usuário inválido. Use um login (letras/números e ; . _ -) ou um e-mail válido",
        });
      }

      if (!isValidPassword(input.password)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Senha inválida. Use apenas letras, números e caracteres ; . _ -",
        });
      }

      const existing: any = await getUserByOpenId(openId);
      const now = new Date();

      // ✅ senha no banco (snake_case)
      const storedHash: string | undefined =
        existing?.password_hash ?? existing?.passwordHash ?? undefined;

      if (storedHash) {
        const ok = verifyPassword(input.password, storedHash);
        if (!ok) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Usuário ou senha incorretos",
          });
        }
      }

      // Se não existir hash, define no 1º login
      const newHash = storedHash ? undefined : hashPassword(input.password);

      await upsertUser({
        openId,
        name: input.name ?? existing?.name ?? null,
        email: input.email ?? existing?.email ?? null,
        loginMethod: "local",
        password_hash: newHash,
        lastSignedIn: now,
      } as any);

      const token = await sdk.createSessionToken(openId);
      ctx.res.setHeader("Set-Cookie", buildCookie(cookieName, token, 60 * 60 * 24 * 30));

      return { success: true };
    }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    const cookieName = ENV.sessionCookieName || COOKIE_NAME;
    ctx.res.setHeader("Set-Cookie", clearCookie(cookieName));
    return { success: true };
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
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
