import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { KeyRound, User as UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login, user } = useAuth();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // Se já está logado, manda para a rota padrão (ajuste se seu app usa outra)
  if (user) {
    // tente navegar depois do render
    setTimeout(() => navigate("/"), 0);
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalLoginId = loginId.trim();

    if (!finalLoginId) {
      toast.error("Informe seu usuário ou e-mail");
      return;
    }
    if (!password.trim()) {
      toast.error("Informe sua senha");
      return;
    }

    // regra simples alinhada com seu texto
    if (finalLoginId.length < 4 || finalLoginId.length > 128) {
      toast.error("Usuário ou e-mail deve ter entre 4 e 128 caracteres");
      return;
    }
    if (password.length < 4 || password.length > 128) {
      toast.error("Senha deve ter entre 4 e 128 caracteres");
      return;
    }

    try {
      await login({
        loginId: finalLoginId,
        password,
        name: name.trim() || undefined,
      });

      toast.success("Login realizado");
      navigate("/");
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
            Use seu usuário e senha (4 a 128 caracteres). Nome é opcional.
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
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome (opcional)</Label>
            <Input
              id="name"
              type="text"
              placeholder="Seu nome (opcional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>

          <Button type="submit" className="w-full">
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}