 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/server/_core/password.ts b/server/_core/password.ts
index a89f2782ee0a00adfe0944dd75d366d6c4891fb4..7bd80be2b44ce8ac151ecc91eb0f885b6ac4511b 100644
--- a/server/_core/password.ts
+++ b/server/_core/password.ts
@@ -21,27 +21,27 @@ export function verifyPassword(password: string, stored: string): boolean {
   const actual = crypto.scryptSync(password, salt, expected.length, { N: 16384, r: 8, p: 1 });
   return crypto.timingSafeEqual(Buffer.from(actual), expected);
 }
 
 export function isValidLoginId(value: string): boolean {
   const v = value.trim();
   if (v.length < 3 || v.length > 64) return false;
   // permite letras, números e separadores comuns, incluindo ';' como no exemplo do usuário
   return /^[A-Za-z0-9;._-]+$/.test(v);
 }
 
 
 export function isValidLoginIdOrEmail(value: string): boolean {
   const v = value.trim().toLowerCase();
   if (v.length < 3 || v.length > 128) return false;
   if (v.includes("@")) {
     // validação simples de e-mail (sem espaços, um @ e um domínio com ponto)
     return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
   }
   return isValidLoginId(v);
 }
 
 export function isValidPassword(value: string): boolean {
   const v = value.trim();
   if (v.length < 4 || v.length > 128) return false;
-  return /^[A-Za-z0-9;._-]+$/.test(v);
+  return true;
 }
 
EOF
)
