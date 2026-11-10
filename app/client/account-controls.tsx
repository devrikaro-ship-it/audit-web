"use client";

import { FormEvent, useState } from "react";

function csrfCookie(): string {
  const entry = document.cookie.split("; ").find((item) => item.startsWith("client_csrf="));
  return entry ? decodeURIComponent(entry.slice("client_csrf=".length)) : "";
}

async function securePost(path: string, body: Record<string, string> = {}) {
  return fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json", "x-csrf-token": csrfCookie() },
    body: JSON.stringify(body),
  });
}

export default function AccountControls() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function enroll(event: FormEvent) {
    event.preventDefault();
    const response = await securePost("/client/api/auth/password/enroll", { password });
    setMessage(response.ok ? "Password saved and existing sessions revoked." : "Password could not be saved.");
    if (response.ok) setPassword("");
  }

  async function logout() {
    await securePost("/client/api/auth/logout");
    window.location.assign("/client/login");
  }

  return (
    <aside className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={enroll}>
        <label className="flex-1 text-sm font-medium text-slate-800">
          Set or replace password
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" maxLength={128} minLength={12} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
        </label>
        <button className="self-end rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white" type="submit">Save password</button>
      </form>
      <div className="mt-3 flex items-center justify-between gap-4">
        <p aria-live="polite" className="text-sm text-slate-600">{message}</p>
        <button className="text-sm font-medium text-red-700" onClick={logout} type="button">Sign out</button>
      </div>
    </aside>
  );
}

