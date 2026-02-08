 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/client/src/pages/Login.tsx b/client/src/pages/Login.tsx
index cac5b837f301849df0671625928e890a3561cf75..9b3f084aeab5b4ccab55becfe29b00528a21a83d 100644
--- a/client/src/pages/Login.tsx
+++ b/client/src/pages/Login.tsx
@@ -32,51 +32,51 @@ export default function Login() {
       return;
     }
     if (!password.trim()) {
       toast.error("Informe sua senha");
       return;
     }
 
     try {
       await login({
         loginId: finalLoginId,
         password,
         name: name.trim() || undefined,
       });
       toast.success("Login realizado");
     } catch (err: any) {
       toast.error(err?.message || "Erro ao entrar");
     }
   };
 
   return (
     <div className="min-h-screen flex items-center justify-center p-6 bg-background">
       <div className="w-full max-w-md border border-border rounded-2xl p-6 sm:p-8 bg-card shadow-sm">
         <div className="mb-6">
           <h1 className="text-2xl font-semibold">Entrar</h1>
           <p className="text-sm text-muted-foreground mt-1">
-            Use seu usuário e senha (podem conter letras, números e ';'). Nome é opcional.
+            Use seu usuário e senha (4 a 128 caracteres). Nome é opcional.
           </p>
         </div>
 
         <form onSubmit={onSubmit} className="space-y-4">
           <div className="space-y-2">
             <Label htmlFor="loginId" className="flex items-center gap-2">
               <UserIcon className="w-4 h-4" /> Usuário ou e-mail
             </Label>
             <Input
               id="loginId"
               type="text"
               placeholder="Digite seu usuário ou e-mail"
               value={loginId}
               onChange={(e) => setLoginId(e.target.value)}
               autoComplete="username"
             />
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="password" className="flex items-center gap-2">
               <KeyRound className="w-4 h-4" /> Senha
             </Label>
             <Input
               id="password"
               type="password"
 
EOF
)
