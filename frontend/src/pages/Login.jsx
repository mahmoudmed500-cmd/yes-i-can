import { useState } from "react";

import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const { t, lang, toggleLang, isArabic } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || t("loginFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDemo() {
    setError("");
    setBusy(true);
    try {
      await login("admin", "admin123");
    } catch (err) {
      setError(err.message || t("loginFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-700 to-brand-900 px-4 ${isArabic ? "font-arabic" : ""}`}>
      <div className="w-full max-w-sm">
        <button onClick={toggleLang}
          className="absolute top-4 right-4 rounded-lg bg-white/20 px-3 py-1.5 text-sm font-medium text-white backdrop-blur hover:bg-white/30">
          {lang === "en" ? "العربية" : "English"}
        </button>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl font-black text-brand-700 shadow-lg">
            YIC
          </div>
          <h1 className="text-2xl font-bold text-white">{t("loginTitle")}</h1>
          <p className="text-sm text-brand-100">{t("loginSubtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t("username")}</label>
            <input
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t("password")}</label>
            <input
              className="input-field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? t("signingIn") : t("signIn")}
          </button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400">{t("or")}</span>
            </div>
          </div>
          <button type="button" disabled={busy} onClick={handleDemo}
            className="w-full rounded-lg border-2 border-brand-600 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 disabled:opacity-50">
            {t("tryDemo")}
          </button>
        </form>
      </div>
    </div>
  );
}
