import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export async function ensureSchema(db: PostgresJsDatabase<any>) {
  // =====================================================
  // ✅ ENUMS e colunas críticas (para bases antigas)
  // =====================================================

  // role enum + coluna role (bases antigas podem não ter)
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE role AS ENUM ('user','admin','owner');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE IF EXISTS users
      ADD COLUMN IF NOT EXISTS role role NOT NULL DEFAULT 'user';
  `);

  // targetType enum precisa suportar admins/tenants (owner envia para admins/tenants)
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "targetType" AS ENUM ('all','users','groups','admins','tenants');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Em ambientes que já tinham o enum, garante valores adicionais
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "targetType" ADD VALUE IF NOT EXISTS 'admins';
      ALTER TYPE "targetType" ADD VALUE IF NOT EXISTS 'tenants';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Adiciona colunas sem quebrar dados
  await db.execute(sql`
    ALTER TABLE IF EXISTS users
      ADD COLUMN IF NOT EXISTS "createdByAdminId" integer;
  `);

  // ✅ Login com usuário + senha (hash). Não apaga dados.
  await db.execute(sql`
    ALTER TABLE IF EXISTS users
      ADD COLUMN IF NOT EXISTS "passwordHash" text;
  `);

  await db.execute(sql`
    ALTER TABLE IF EXISTS groups
      ADD COLUMN IF NOT EXISTS "createdByAdminId" integer;
  `);

  await db.execute(sql`
    ALTER TABLE IF EXISTS logs
      ADD COLUMN IF NOT EXISTS "createdByAdminId" integer;
  `);

  await db.execute(sql`
    ALTER TABLE IF EXISTS deliveries
      ADD COLUMN IF NOT EXISTS "feedback" text;
  `);

  await db.execute(sql`
    ALTER TABLE IF EXISTS deliveries
      ADD COLUMN IF NOT EXISTS "feedbackAt" timestamp;
  `);

  // Índices básicos (performance/isolamento)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_users_tenant_createdBy ON users("tenantId","createdByAdminId");`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_groups_tenant_createdBy ON groups("tenantId","createdByAdminId");`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_deliveries_user ON deliveries("userId","notificationId");`);
}
