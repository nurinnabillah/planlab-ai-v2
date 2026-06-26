"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname(); // ← add this

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      if (!user && pathname !== "/login") {
        // ← only redirect if not already on login
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router, pathname]);

  if (loading && pathname !== "/login") {
    // ← don't show loading on login page
    return (
      <div className="min-h-screen bg-[#F6F8FB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading PlanLab AI...</p>
        </div>
      </div>
    );
  }

  if (!user && pathname !== "/login") return null; // ← allow login page to render

  return <>{children}</>;
}
