import { Link } from "react-router-dom";
import LoginForm from "../components/LoginForm";

export default function LoginClassicPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F7F7F5] px-4 py-8 text-[#1A1A1A]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(56,189,248,0.12),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(99,102,241,0.08),transparent_32%),linear-gradient(to_bottom,rgba(255,255,255,0.95),rgba(247,247,245,0.9))]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-[size:34px_34px]" />

      <div className="relative w-full max-w-md">
        <LoginForm className="w-full" cardClassName="w-full" />
        <p className="mt-4 text-center text-xs text-slate-500">
          <Link to="/login" className="font-medium text-slate-700 underline-offset-2 hover:underline">
            Back to main login
          </Link>
        </p>
      </div>
    </div>
  );
}
