import { useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Landmark, Lock, UserRound } from "lucide-react";
import { loginSession } from "../lib/auth";

type Props = {
  className?: string;
  cardClassName?: string;
  variant?: "card" | "bare";
  onLoginSuccess?: (nextPath: string) => void;
};

export default function LoginForm({
  className = "",
  cardClassName = "",
  variant = "card",
  onLoginSuccess,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userId, setUserId] = useState("doslr.demo");
  const [password, setPassword] = useState("password");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loginSession(userId || "demo.user");
    const next = (location.state as { from?: string } | null)?.from ?? "/app";
    if (onLoginSuccess) {
      onLoginSuccess(next);
      return;
    }
    navigate(next, { replace: true });
  }

  const header = (
    <div className="mb-6 flex items-center gap-3">
      <div className="rounded-2xl bg-[#1A1A1A] p-2.5 text-white">
        <Landmark className="h-6 w-6" />
      </div>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">DoSLR WebGIS</h1>
        <p className="text-xs text-slate-500">Department of Survey &amp; Land Records</p>
      </div>
    </div>
  );

  const form = (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-slate-600">User ID</span>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white/95 px-3 shadow-sm backdrop-blur-[2px]">
          <UserRound className="h-4 w-4 text-slate-400" />
          <input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            className="h-11 w-full bg-transparent text-sm outline-none"
            placeholder="enter any user id"
          />
        </div>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-slate-600">Password</span>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white/95 px-3 shadow-sm backdrop-blur-[2px]">
          <Lock className="h-4 w-4 text-slate-400" />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 w-full bg-transparent text-sm outline-none"
            placeholder="any password works"
          />
        </div>
      </label>

      <button
        type="submit"
        className="mt-1 w-full rounded-full bg-[#1A1A1A] py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-black"
      >
        Enter Workbench
      </button>
    </form>
  );

  if (variant === "bare") {
    return <div className={className}>{form}</div>;
  }

  return (
    <div className={className}>
      <div
        className={`rounded-3xl border border-white/70 bg-white/75 p-8 shadow-[0_18px_45px_rgba(17,24,39,0.12)] backdrop-blur-md ${cardClassName}`}
      >
        {header}
        {form}
      </div>
    </div>
  );
}
