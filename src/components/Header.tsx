"use client";

import React from "react";
import { Layers, RotateCcw, Save, FolderOpen, ChevronDown, RefreshCw, LogOut } from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";

interface HeaderProps {
  onReset: () => void;
  onApplyPreset: (presetName: string) => void;
  hasModifications: boolean;
  activeInterventionsCount: number;
  onSaveScenario: () => void;
  onLoadScenario: () => void;
  currentScenarioId?: string | null;
  currentScenarioName?: string;
  hasNewModifications?: boolean;
  onUpdateScenario?: () => void;
  onSignOut: () => void;
}

export default function Header({
  onReset,
  onApplyPreset,
  hasModifications,
  onSaveScenario,
  onLoadScenario,
  currentScenarioId,
  currentScenarioName,
  hasNewModifications,
  onUpdateScenario,
  onSignOut,
}: HeaderProps) {
  const [showSaveDropdown, setShowSaveDropdown] = React.useState(false);
  const [user] = useAuthState(auth);

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md px-6 py-3 sticky top-0 z-50 shadow-sm">
      <div className="flex items-center justify-between gap-4 max-w-[1700px] mx-auto w-full">
        {/* LEFT — Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-lg shadow-sm text-white">
            <Layers className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-slate-900">
                PlanLab <span className="text-blue-600">AI</span>
              </span>
              <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                MVP v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Seksyen 7 Shah Alam • Urban Impact Simulator
            </p>
          </div>
        </div>

        {/* CENTER — Plan Presets */}
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5 text-xs">
          <span className="text-[9px] uppercase font-mono text-slate-400 px-2.5 font-bold">
            Presets:
          </span>
          <button
            onClick={() => onApplyPreset("green_city")}
            className="px-2.5 py-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer font-semibold"
          >
            Eco-Avenue
          </button>
          <button
            onClick={() => onApplyPreset("transit_oriented")}
            className="px-2.5 py-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer font-semibold"
          >
            Transit Hub
          </button>
        </div>

        {/* RIGHT — Actions + User */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Save dropdown */}
          {(hasNewModifications || (!currentScenarioId && hasModifications)) && (
            <div className="relative">
              <button
                onClick={() => setShowSaveDropdown(!showSaveDropdown)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-sm transition-all"
              >
                <Save className="h-3.5 w-3.5" />
                Save
                <ChevronDown className="h-3 w-3" />
              </button>

              {showSaveDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSaveDropdown(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 w-48 overflow-hidden">
                    <button
                      onClick={() => {
                        onSaveScenario();
                        setShowSaveDropdown(false);
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Save className="h-3.5 w-3.5 text-blue-500" />
                      Save as New
                    </button>
                    {currentScenarioId && (
                      <button
                        onClick={() => {
                          onUpdateScenario?.();
                          setShowSaveDropdown(false);
                        }}
                        className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"
                      >
                        <RefreshCw className="h-3.5 w-3.5 text-amber-500" />
                        Update "{currentScenarioName}"
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Load */}
          <button
            onClick={onLoadScenario}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border cursor-pointer bg-white text-slate-700 border-slate-300 hover:bg-slate-50 transition-all shadow-sm"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Load
          </button>

          {/* Reset */}
          <button
            onClick={onReset}
            disabled={!hasModifications}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
              hasModifications
                ? "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-sm"
                : "bg-slate-100/50 text-slate-400 border-slate-200 cursor-not-allowed"
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>

          {/* Divider */}
          <div className="h-6 w-[1px] bg-slate-200 mx-1" />

          {/* User section */}
          {user && (
            <div className="flex items-center gap-2.5">
              <img
                src={user.photoURL || ""}
                alt={user.displayName || ""}
                className="h-8 w-8 rounded-full border-2 border-slate-200 transition-all"
                title={user.displayName || ""}
              />
              <div className="hidden lg:flex flex-col">
                <span className="text-[10px] text-slate-400 font-medium leading-none">
                  Signed in as
                </span>
                <span className="text-xs text-slate-700 font-semibold leading-tight">
                  {user.displayName?.split(" ")[0]} 👋
                </span>
              </div>
              <button
                onClick={onSignOut}
                title="Sign out"
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-500 border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
