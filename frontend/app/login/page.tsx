"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Form, Input, Label, TextField } from "@heroui/react";
import { ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setPending(false);
    if (error) {
      setError(
        error.status === 429
          ? "Demasiados intentos. Espera un minuto y vuelve a probar."
          : "Correo o contraseña incorrectos.",
      );
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-[320px]">
        <span className="flex size-12 items-center justify-center rounded-lg bg-(--n-gray-bg) text-(--foreground)">
          <ShieldCheck size={26} strokeWidth={1.5} aria-hidden />
        </span>
        <h1 className="mt-5 text-[26px] leading-tight font-bold tracking-[-0.02em]">Security Monitor</h1>
        <p className="mt-1 text-[15px] text-(--muted)">Inicia sesión con tu cuenta de Zenlor Labs.</p>

        <Form className="mt-7 flex flex-col gap-3.5" onSubmit={onSubmit}>
          <TextField name="email" type="email" isRequired autoComplete="username" className="flex flex-col gap-1.5">
            <Label className="text-[13px] text-(--muted)">Correo</Label>
            <Input placeholder="tu@zenlorlabs.com" className="h-9 rounded-md text-sm" />
          </TextField>
          <TextField name="password" type="password" isRequired autoComplete="current-password" className="flex flex-col gap-1.5">
            <Label className="text-[13px] text-(--muted)">Contraseña</Label>
            <Input className="h-9 rounded-md text-sm" />
          </TextField>

          {error && (
            <p role="alert" className="rounded-md px-3 py-2 text-[13px]" style={{ background: "var(--n-red-bg)", color: "var(--n-red-fg)" }}>
              {error}
            </p>
          )}

          <Button type="submit" isPending={pending} className="mt-1 h-9 w-full rounded-md text-sm font-medium">
            {pending ? "Entrando…" : "Continuar"}
          </Button>
        </Form>
      </div>
    </main>
  );
}
