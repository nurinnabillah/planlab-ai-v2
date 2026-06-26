"use client";

import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Layers, MapPin, BarChart3, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/");
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Soft gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-slate-50 to-emerald-100" />

      {/* Blurred background blobs */}
      <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-blue-300 rounded-full opacity-30 blur-3xl" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] bg-emerald-300 rounded-full opacity-30 blur-3xl" />
      <div className="absolute top-[50%] left-[50%] w-[300px] h-[300px] bg-violet-200 rounded-full opacity-20 blur-3xl" />

      {/* Card */}
      <div className="relative w-full max-w-4xl flex flex-col lg:flex-row rounded-3xl overflow-hidden shadow-2xl border border-white/60">
        {/* Left panel — glass */}
        <div className="flex-1 bg-gradient-to-br from-blue-500/10 to-emerald-500/10 backdrop-blur-xl p-10 flex flex-col justify-between border-r border-white/40">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl shadow-sm text-white">
                <Layers className="h-6 w-6 stroke-[2.5]" />
              </div>
              <span className="font-bold text-xl text-slate-800">PlanLab AI</span>
            </div>

            <h1 className="text-3xl font-bold text-slate-800 leading-tight mb-4">
              Simulate Urban
              <br />
              Impact in Real-Time
            </h1>
            <p className="text-slate-600 text-sm leading-relaxed">
              An AI-powered urban planning sandbox for Seksyen 7, Shah Alam. Place interventions,
              analyse livability scores, and get Gemini-powered planning recommendations.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-3 mt-8">
            {[
              { icon: MapPin, text: "10×10 grid overlay on real Seksyen 7 map" },
              { icon: BarChart3, text: "Live livability score updates per intervention" },
              { icon: Sparkles, text: "Gemini 2.5 Flash AI planning advisory" },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="p-1.5 bg-white/60 rounded-lg border border-white/80">
                  <item.icon className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <span className="text-sm text-slate-600">{item.text}</span>
              </div>
            ))}
          </div>

          <p className="text-slate-400 text-xs mt-8">CitySage Sdn. Bhd.</p>
        </div>

        {/* Right panel — glass */}
        <div className="lg:w-[400px] bg-white/60 backdrop-blur-xl p-10 flex flex-col justify-center gap-6">
          <div>
            <h2 className="font-bold text-2xl text-slate-800 mb-1">Welcome back</h2>
            <p className="text-sm text-slate-500">Sign in to access your planning scenarios</p>
          </div>

          <div className="h-[1px] bg-slate-200/60" />

          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Continue with
            </p>
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border border-white/80 bg-white/80 hover:bg-white transition-all shadow-sm text-sm font-semibold text-slate-700 group backdrop-blur"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
              <span className="ml-auto text-slate-300 group-hover:text-blue-400 transition-colors">
                →
              </span>
            </button>
          </div>

          <div className="h-[1px] bg-slate-200/60" />

          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            By signing in you agree to use this platform for
            <br />
            urban planning simulation and research purposes only.
          </p>
        </div>
      </div>
    </div>
  );
}
