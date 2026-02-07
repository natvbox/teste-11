import { initTRPC, TRPCError } from "@trpc/server";
import type { inferAsyncReturnType } from "@trpc/server";
import superjson from "superjson";

import { createContext } from "./context";

export type TrpcContext = inferAsyncReturnType<typeof createContext>;

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const middleware = t.middleware;

/**
 * Procedimento público (sem auth)
 */
export const publicProcedure = t.procedure;

/**
 * Middleware de autenticação
 */
const isAuthed = middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Não autenticado" });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/**
 * Procedimento protegido (qualquer usuário logado)
 */
export const protectedProcedure = publicProcedure.use(isAuthed);

/**
 * Middleware: somente ADMIN (owner tem área separada)
 */
const isAdmin = middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Não autenticado" });
  }

  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Apenas admin" });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/**
 * Procedimento somente admin
 */
export const adminOnlyProcedure = publicProcedure.use(isAdmin);

/**
 * Middleware: somente OWNER
 */
const isOwner = middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Não autenticado" });
  }

  if (ctx.user.role !== "owner") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Apenas owner" });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/**
 * Procedimento somente owner
 */
export const ownerOnlyProcedure = publicProcedure.use(isOwner);

/**
 * ✅ Aliases para compatibilidade com imports antigos (tenant.ts / superadmin.ts)
 */
export const adminProcedure = adminOnlyProcedure;
export const ownerProcedure = ownerOnlyProcedure;
