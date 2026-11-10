"use client";

import { FormEvent, useEffect, useState } from "react";

type Mode = "otp" | "password" | "google";

export default function ClientLoginForm() {
  const [csrfToken, setCsrfToken] = useState("");
  const [mode, setMode] = useState<Mode>("otp");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [credential, setCredential] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [message, setMessage] = useState("Preparing secure sign-in…");

  useEffect(() => {
    fetch("/client/api/auth/bootstrap", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<{ csrfToken: string }>;
      })
      .then(({ csrfToken: token }) => {
        setCsrfToken(token);
        setMessage("");
      })
      .catch(() => setMessage("Client sign-in is currently unavailable."));
  }, []);

  async function post(path: string, body: Record<string, string>) {
    return fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify(body),
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!csrfToken) return;
    setMessage("Checking your details…");
    let response: Response;
    if (mode === "otp" && !otpRequested) {
      response = await post("/client/api/auth/otp/request", { email });
      setOtpRequested(true);
      setMessage(response.ok ? "If the address can sign in, a six-digit code has been sent." : "Sign-in could not be started.");
      return;
    }
    if (mode === "otp") response = await post("/client/api/auth/otp/verify", { email, code });
    else if (mode === "password") response = await post("/client/api/auth/password/login", { email, password });
    else response = await post("/client/api/auth/google", { credential });
    if (response.ok) window.location.assign("/client");
    else setMessage("Sign-in failed. Check the details and try again.");
  }

  return (
    <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-950">Client reports</h1>
      <p className="mt-2 text-sm text-slate-600">Use a verified email identity to open reports assigned to your account.</p>
      <div className="mt-6 grid grid-cols-3 gap-2" aria-label="Sign-in method">
        {(["otp", "password", "google"] as const).map((item) => (
          <button
            className={`rounded-lg px-3 py-2 text-sm ${mode === item ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}
            key={item}
            onClick={() => { setMode(item); setOtpRequested(false); setMessage(""); }}
            type="button"
          >
            {item === "otp" ? "Email code" : item === "password" ? "Password" : "Google"}
          </button>
        ))}
      </div>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        {mode !== "google" && (
          <label className="block text-sm font-medium text-slate-800">
            Email
            <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" autoComplete="email" maxLength={320} onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
          </label>
        )}
        {mode === "otp" && otpRequested && (
          <label className="block text-sm font-medium text-slate-800">
            Six-digit code
            <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" autoComplete="one-time-code" inputMode="numeric" maxLength={6} minLength={6} onChange={(event) => setCode(event.target.value)} pattern="[0-9]{6}" required value={code} />
          </label>
        )}
        {mode === "password" && (
          <label className="block text-sm font-medium text-slate-800">
            Password
            <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" autoComplete="current-password" maxLength={128} minLength={12} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
          </label>
        )}
        {mode === "google" && (
          <label className="block text-sm font-medium text-slate-800">
            Google identity credential
            <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" maxLength={8192} onChange={(event) => setCredential(event.target.value)} required value={credential} />
          </label>
        )}
        <button className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white disabled:opacity-50" disabled={!csrfToken} type="submit">
          {mode === "otp" && !otpRequested ? "Send code" : "Sign in"}
        </button>
      </form>
      <p aria-live="polite" className="mt-4 min-h-5 text-sm text-slate-600">{message}</p>
    </section>
  );
}

