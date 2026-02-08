 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/server/routers/auth.ts b/server/routers/auth.ts
index 1cd51dd47f369517c65129b48ac3d02be783bd25..ece5870d832b422897aea91f58d7eded10421a42 100644
--- a/server/routers/auth.ts
+++ b/server/routers/auth.ts
@@ -43,51 +43,51 @@ export const authRouter = router({
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
-          message: "Senha inválida. Use apenas letras, números e caracteres ; . _ -",
+          message: "Senha inválida. Use entre 4 e 128 caracteres.",
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
 
EOF
)
