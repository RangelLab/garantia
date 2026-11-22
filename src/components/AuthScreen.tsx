import React, { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, FileCheck2, Lock, Moon, ShieldCheck, Sun } from "lucide-react";
import { api, friendlyError, isApiConfigured, saveTokens } from "../lib/api";
import type { AppTheme, User } from "../types";
import { BrandMark } from "./BrandMark";

export type AuthMode = "login" | "signup" | "reset" | "confirm-email";

interface AuthScreenProps {
  initialMode: AuthMode;
  theme: AppTheme;
  onToggleTheme: () => void;
  onAuthenticated: (user: User) => void;
  initialNotice?: string | null;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  initialMode,
  theme,
  onToggleTheme,
  onAuthenticated,
  initialNotice,
}) => {
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get("token");
  const isEmailChange = params.get("change") === "1";

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(
    initialNotice ? { text: initialNotice, isError: false } : null
  );
  const [emailConfirmedText, setEmailConfirmedText] = useState(
    "Validando o link enviado ao seu endereço…"
  );
  const [emailConfirmError, setEmailConfirmError] = useState(false);

  useEffect(() => {
    if (mode !== "confirm-email") return;
    if (!urlToken) {
      setEmailConfirmError(true);
      setEmailConfirmedText("Link de confirmação ausente ou inválido.");
      return;
    }
    const action = isEmailChange ? "confirm_email_change" : "confirm_email";
    api<{ message?: string }>(action, { token: urlToken }, false)
      .then((res) => {
        setEmailConfirmError(false);
        setEmailConfirmedText(res.message || "E-mail confirmado com sucesso.");
      })
      .catch((err) => {
        setEmailConfirmError(true);
        setEmailConfirmedText(friendlyError(err, "Link inválido ou expirado."));
      });
  }, [mode, urlToken, isEmailChange]);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage(null);
    setPassword("");
    const targetPath =
      nextMode === "signup"
        ? "/criar-conta.html"
        : nextMode === "reset"
          ? "/redefinir-senha.html"
          : "/";
    if (window.location.pathname !== targetPath) {
      window.history.replaceState({}, "", targetPath);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!isApiConfigured()) {
      setMessage({ text: "A configuração da API do Garantia não foi carregada.", isError: true });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const data = await api<{
        access_token: string;
        refresh_token: string;
        user: User;
      }>("signin", { email: email.trim(), password }, false);
      saveTokens(data);
      onAuthenticated(data.user);
    } catch (err) {
      setMessage({ text: friendlyError(err, "E-mail ou senha incorretos."), isError: true });
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await api<{ message?: string }>(
        "signup",
        { full_name: name.trim(), email: email.trim(), password },
        false
      );
      setMessage({
        text: res.message || "Conta criada! Verifique seu e-mail para confirmar o cadastro.",
        isError: false,
      });
      setName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      setMessage({ text: friendlyError(err, "Não foi possível criar a conta."), isError: true });
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (urlToken) {
        await api("reset_password", { token: urlToken, password }, false);
        setMessage({
          text: "Senha atualizada. Você já pode entrar no Garantia.",
          isError: false,
        });
        setPassword("");
      } else {
        await api("request_password_reset", { email: email.trim() }, false);
        setMessage({
          text: "Se houver uma conta elegível, enviaremos as instruções para o e-mail informado.",
          isError: false,
        });
      }
    } catch (err) {
      setMessage({
        text: friendlyError(err, "Não foi possível concluir a solicitação."),
        isError: true,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0B0D10] text-neutral-900 dark:text-neutral-100 flex flex-col">
      <header className="w-full max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            switchMode("login");
          }}
          className="inline-flex items-center gap-2.5 text-base font-bold tracking-tight whitespace-nowrap shrink-0"
        >
          <BrandMark className="h-8 w-8" />
          <span className="font-display">Garantia</span>
        </a>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#12151A] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/[0.06]"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-5 sm:px-8 py-8 lg:py-12 grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
        <div className="hidden lg:block lg:col-span-6 space-y-8">
          <div className="space-y-4">
            <p className="text-xs font-medium tracking-wide text-emerald-700 dark:text-emerald-400">
              Garantia By BoRan Studio
            </p>
            <h1 className="font-display text-4xl xl:text-5xl font-bold tracking-tight text-neutral-900 dark:text-white leading-[1.1] [text-wrap:balance]">
              Suas garantias e notas fiscais, organizadas com precisão.
            </h1>
            <p className="text-base text-neutral-600 dark:text-neutral-400 max-w-lg leading-relaxed">
              Acompanhe prazos de cobertura, visualize comprovantes direto no app, controle valores
              por categoria e receba alertas antes do vencimento.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-2 max-w-md border-t border-neutral-200 dark:border-white/10">
            <div className="flex items-start gap-3.5 pt-4">
              <FileCheck2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Visualizador integrado de comprovantes
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                  Abra PDFs e fotos com zoom direto na tela, sem depender de novas abas.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3.5">
              <CalendarDays className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Calendário mensal e alertas de vencimento
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                  Veja rapidamente quais garantias vencem nos próximos 7 e 30 dias.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3.5">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Conta independente e sincronizada
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                  Seus dados e arquivos ficam protegidos e acessíveis em qualquer dispositivo.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 flex justify-center lg:justify-end">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#12151A] p-6 sm:p-8 shadow-sm dark:shadow-none">
            {mode === "confirm-email" ? (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    Segurança da conta
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">
                    Confirmando e-mail
                  </h2>
                </div>
                <p
                  className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${
                    emailConfirmError
                      ? "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300"
                      : "border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] text-neutral-700 dark:text-neutral-200"
                  }`}
                >
                  {emailConfirmedText}
                </p>
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
                >
                  Ir para o login
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    Conta independente Garantia
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                    {mode === "login"
                      ? "Entrar na sua conta"
                      : mode === "signup"
                        ? "Criar nova conta"
                        : urlToken
                          ? "Definir nova senha"
                          : "Recuperar acesso"}
                  </h2>
                  <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                    {mode === "login"
                      ? "Acesse seus produtos e comprovantes sincronizados."
                      : mode === "signup"
                        ? "Exclusiva para o Garantia By BoRan Studio."
                        : urlToken
                          ? "Escolha uma senha com pelo menos 10 caracteres."
                          : "Informe seu e-mail para receber as instruções."}
                  </p>
                </div>

                {mode === "login" && (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label
                        htmlFor="login-email"
                        className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
                      >
                        E-mail
                      </label>
                      <input
                        id="login-email"
                        type="email"
                        autoComplete="username"
                        required
                        maxLength={254}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="voce@exemplo.com"
                        className="w-full min-h-[44px] rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#0B0D10] px-3.5 text-base sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="login-password"
                          className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
                        >
                          Senha
                        </label>
                        <button
                          type="button"
                          onClick={() => switchMode("reset")}
                          className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                        >
                          Esqueci minha senha
                        </button>
                      </div>
                      <input
                        id="login-password"
                        type="password"
                        autoComplete="current-password"
                        required
                        maxLength={128}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Sua senha"
                        className="w-full min-h-[44px] rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#0B0D10] px-3.5 text-base sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    {message && (
                      <p
                        role="alert"
                        className={`rounded-lg px-3.5 py-2.5 text-xs leading-relaxed ${
                          message.isError
                            ? "bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                        }`}
                      >
                        {message.text}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60"
                    >
                      {busy ? "Entrando…" : "Entrar"}
                      {!busy && <ArrowRight className="h-4 w-4" />}
                    </button>
                  </form>
                )}

                {mode === "signup" && (
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                      <label
                        htmlFor="signup-name"
                        className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
                      >
                        Nome
                      </label>
                      <input
                        id="signup-name"
                        type="text"
                        required
                        maxLength={100}
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Seu nome"
                        className="w-full min-h-[44px] rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#0B0D10] px-3.5 text-base sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="signup-email"
                        className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
                      >
                        E-mail
                      </label>
                      <input
                        id="signup-email"
                        type="email"
                        required
                        maxLength={254}
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="voce@exemplo.com"
                        className="w-full min-h-[44px] rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#0B0D10] px-3.5 text-base sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="signup-password"
                        className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
                      >
                        Senha
                      </label>
                      <input
                        id="signup-password"
                        type="password"
                        required
                        minLength={10}
                        maxLength={128}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo de 10 caracteres"
                        className="w-full min-h-[44px] rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#0B0D10] px-3.5 text-base sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    {message && (
                      <p
                        role="status"
                        className={`rounded-lg px-3.5 py-2.5 text-xs leading-relaxed ${
                          message.isError
                            ? "bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                        }`}
                      >
                        {message.text}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60"
                    >
                      {busy ? "Criando conta…" : "Criar conta"}
                    </button>
                  </form>
                )}

                {mode === "reset" && (
                  <form onSubmit={handleReset} className="space-y-4">
                    {!urlToken ? (
                      <div>
                        <label
                          htmlFor="reset-email"
                          className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
                        >
                          E-mail
                        </label>
                        <input
                          id="reset-email"
                          type="email"
                          required
                          maxLength={254}
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="voce@exemplo.com"
                          className="w-full min-h-[44px] rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#0B0D10] px-3.5 text-base sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    ) : (
                      <div>
                        <label
                          htmlFor="reset-password"
                          className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
                        >
                          Nova senha
                        </label>
                        <input
                          id="reset-password"
                          type="password"
                          required
                          minLength={10}
                          maxLength={128}
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Mínimo de 10 caracteres"
                          className="w-full min-h-[44px] rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#0B0D10] px-3.5 text-base sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    )}

                    {message && (
                      <p
                        role="status"
                        className={`rounded-lg px-3.5 py-2.5 text-xs leading-relaxed ${
                          message.isError
                            ? "bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                        }`}
                      >
                        {message.text}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60"
                    >
                      {busy
                        ? "Enviando…"
                        : urlToken
                          ? "Salvar nova senha"
                          : "Enviar instruções"}
                    </button>
                  </form>
                )}

                <div className="mt-6 pt-5 border-t border-neutral-200 dark:border-white/10 flex flex-col gap-3 text-center">
                  {mode === "login" ? (
                    <button
                      type="button"
                      onClick={() => switchMode("signup")}
                      className="text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-emerald-600 dark:hover:text-emerald-400"
                    >
                      Não tem conta? <span className="text-emerald-600 dark:text-emerald-400">Criar conta Garantia</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Voltar ao login
                    </button>
                  )}

                  <p className="inline-flex items-center justify-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                    <Lock className="h-3.5 w-3.5" />
                    Seus dados ficam protegidos na sua conta.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
