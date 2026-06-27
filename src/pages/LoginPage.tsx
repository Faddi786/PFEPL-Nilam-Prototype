import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Landmark } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LoginForm from "../components/LoginForm";
import LoginFogOverlay from "../components/LoginFogOverlay";

const HERO_IMAGE = "/images/login-hero.webp";

const START_FADE_S = 0.8;
const EXIT_FADE_S = 0.7;
const HERO_FADE_S = 2;
const FORM_FADE_S = 2;
const FORM_DELAY_S = HERO_FADE_S;

function DoslrBranding({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex h-[3.3rem] w-[3.3rem] shrink-0 items-center justify-center rounded-xl bg-[#1A1A1A] text-white">
        <Landmark className="h-[1.8rem] w-[1.8rem]" strokeWidth={1.75} />
      </div>
      <p className="text-[1.8rem] font-bold leading-none tracking-tight text-[#1A1A1A]">Nilam</p>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [startDismissed, setStartDismissed] = useState(false);
  const [introActive, setIntroActive] = useState(false);
  const [exiting, setExiting] = useState(false);
  const exitTimerRef = useRef<number | null>(null);

  const dismissStart = useCallback(() => {
    setStartDismissed((prev) => (prev ? prev : true));
  }, []);

  const handleLoginSuccess = useCallback(
    (nextPath: string) => {
      setExiting(true);
      exitTimerRef.current = window.setTimeout(() => {
        navigate(nextPath, { replace: true, state: { entrance: true } });
      }, EXIT_FADE_S * 1000);
    },
    [navigate],
  );

  useEffect(() => {
    return () => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!startDismissed) return;
    const timer = window.setTimeout(() => setIntroActive(true), START_FADE_S * 1000);
    return () => window.clearTimeout(timer);
  }, [startDismissed]);

  useEffect(() => {
    if (startDismissed) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key !== " ") return;
      event.preventDefault();
      dismissStart();
    };

    window.addEventListener("click", dismissStart);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", dismissStart);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [startDismissed, dismissStart]);

  return (
    <motion.div
      className="relative min-h-screen overflow-hidden bg-white text-[#1A1A1A]"
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: EXIT_FADE_S, ease: "easeInOut" }}
      style={{ pointerEvents: exiting ? "none" : "auto" }}
    >
      <motion.img
        src={HERO_IMAGE}
        alt=""
        aria-hidden
        decoding="async"
        fetchPriority="high"
        initial={{ opacity: 0 }}
        animate={introActive ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: HERO_FADE_S, ease: "easeOut" }}
        className="absolute inset-0 h-full w-full object-cover object-[40%_center] [image-rendering:auto] [transform:translateZ(0)]"
      />

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white via-white/88 to-white/20 lg:hidden"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 lg:block"
        style={{
          background:
            "linear-gradient(to left, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.94) 28%, rgba(255,255,255,0.72) 58%, rgba(255,255,255,0.2) 88%, transparent 100%)",
        }}
      />

      <LoginFogOverlay />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 bg-white"
        initial={{ opacity: 1 }}
        animate={introActive ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: HERO_FADE_S, ease: "easeOut" }}
      />

      <div className="relative z-30 grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <div className="hidden min-h-screen lg:block" aria-hidden />

        <motion.div
          className="flex min-h-screen flex-col justify-start px-6 pt-[calc(2rem+7vh)] pb-12 sm:px-10 sm:pt-[calc(2.5rem+7vh)] lg:items-end lg:px-12 lg:pt-[calc(2.5rem+7vh)] lg:pb-16 xl:px-16"
          initial={{ opacity: 0 }}
          animate={introActive ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: FORM_DELAY_S, duration: FORM_FADE_S, ease: "easeOut" }}
        >
          <div className="w-full max-w-md lg:max-w-sm xl:max-w-md">
            <div className="mb-8 lg:mb-10">
              <DoslrBranding className="mb-6" />
              <h2 className="text-xl font-semibold leading-snug tracking-tight text-[#1A1A1A] sm:text-[1.625rem]">
                National Integrated Land Administration & Management
                <br />
                for Puducherry UT
              </h2>
            </div>

            <LoginForm className="w-full" variant="bare" onLoginSuccess={handleLoginSuccess} />
          </div>
        </motion.div>
      </div>

      {!introActive && (
        <motion.div
          aria-hidden={startDismissed}
          className="fixed inset-0 z-50 flex cursor-default items-center justify-center bg-white"
          initial={{ opacity: 1 }}
          animate={startDismissed ? { opacity: 0 } : { opacity: 1 }}
          transition={{ duration: START_FADE_S, ease: "easeOut" }}
          style={{ pointerEvents: startDismissed ? "none" : "auto" }}
        >
          <span className="select-none rounded-full border border-slate-300/90 bg-white px-14 py-3.5 text-sm font-medium tracking-[0.2em] text-slate-600 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8),0_1px_2px_rgba(15,23,42,0.04)]">
            Initialize Platform
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
