"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
// import baselineData from "../src/data/seksyen7_grid_baseline.json";
import { GridCell, Intervention, INTERVENTIONS } from "../types";
import Header from "../src/components/Header";
import InterventionToolbar from "../src/components/InterventionToolbar";
import PlanLabMap from "../src/components/PlanLabMap";
import CellDetailsPanel from "../src/components/CellDetailsPanel";
import ScoreSummary from "../src/components/ScoreSummary";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";

import {
  Sparkles,
  Info,
  HelpCircle,
  GraduationCap,
  ArrowUpRight,
  TrendingUp,
  Save,
  FolderOpen,
  X,
  LogOut,
} from "lucide-react";

const cloneCells = (source: GridCell[]): GridCell[] =>
  source.map((cell) => ({
    ...cell,
    interventionId: undefined,
  }));

export default function App() {
  // Load baseline JSON dataset on startup
  const [cells, setCells] = useState<GridCell[]>([]);
  const [isLoadingGrid, setIsLoadingGrid] = useState(true);
  const baselineRef = useRef<GridCell[]>([]);
  const [mapStyle, setMapStyle] = useState("mapbox://styles/mapbox/light-v11");
  const [hasNewModifications, setHasNewModifications] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveModalName, setSaveModalName] = useState("");
  const [saveModalDesc, setSaveModalDesc] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<any[]>([]);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(false);
  const [currentScenarioId, setCurrentScenarioId] = useState<string | null>(null);
  const [currentScenarioName, setCurrentScenarioName] = useState<string>("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [user] = useAuthState(auth);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  useEffect(() => {
    const fetchGrid = async () => {
      try {
        const res = await fetch("/api/grid");
        const data = await res.json();
        if (data.cells) {
          setCells(data.cells);
          baselineRef.current = data.cells; // save baseline
        }
      } catch (err) {
        console.error("Failed to load grid:", err);
      } finally {
        setIsLoadingGrid(false);
      }
    };
    fetchGrid();
  }, []);

  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [selectedInterventionId, setSelectedInterventionId] = useState<string | null>(null);
  const [hoveredIntervention, setHoveredIntervention] = useState<Intervention | null>(null);

  // Find the selected cell from state
  const selectedCell = useMemo(() => {
    if (!selectedCellId) return null;
    return cells.find((c) => c.grid_id === selectedCellId) || null;
  }, [cells, selectedCellId]);

  // Find selected active intervention brush
  const activeIntervention = useMemo(() => {
    if (!selectedInterventionId) return null;
    return INTERVENTIONS.find((i) => i.id === selectedInterventionId) || null;
  }, [selectedInterventionId]);

  // Handle cell click (Applying paint brush or inspecting)
  const handleSelectCell = (clickedCell: GridCell) => {
    if (selectedInterventionId) {
      setHasNewModifications(true);
      setCells((prev) =>
        prev.map((c) => {
          if (c.grid_id === clickedCell.grid_id) {
            // If already has this intervention, toggle it off, otherwise apply
            const newInterventionId =
              c.interventionId === selectedInterventionId ? undefined : selectedInterventionId;
            return {
              ...c,
              interventionId: newInterventionId,
            };
          }
          return c;
        })
      );
      // Set as currently active highlighted cell
      setSelectedCellId(clickedCell.grid_id);
    } else {
      // Just inspect
      setSelectedCellId(clickedCell.grid_id);
    }
  };

  // Handle deleting an intervention on a cell
  const handleClearIntervention = (gridId: string) => {
    setCells((prev) =>
      prev.map((c) => {
        if (c.grid_id === gridId) {
          const copy = { ...c };
          delete copy.interventionId;
          return copy;
        }
        return c;
      })
    );
    setHasNewModifications(true);
  };

  // Reset simulator back to unaltered state
  const handleReset = () => {
    setCells(baselineRef.current.map((cell) => ({ ...cell })));
    setSelectedCellId(null);
    setSelectedInterventionId(null);
    setAiPlanningAdvices([]);
    setHasNewModifications(false);
  };

  // Apply Quick presets for demonstration value
  const handleApplyPreset = (presetName: string) => {
    // Start clean first
    const cleanCells = baselineRef.current.map((cell) => ({ ...cell }));

    if (presetName === "green_city") {
      // Apply street trees to all secondary roads & highways
      setCells(
        cleanCells.map((c) => {
          if (c.land_use === "Road") {
            return { ...c, interventionId: "street_trees" };
          }
          // Intersperse Pocket Parks
          if (
            (c.grid_id === "A2" ||
              c.grid_id === "B8" ||
              c.grid_id === "F3" ||
              c.grid_id === "J4" ||
              c.grid_id === "H6") &&
            c.land_use === "Green"
          ) {
            return { ...c, interventionId: "pocket_park" };
          }
          return c;
        })
      );
    } else if (presetName === "transit_oriented") {
      setCells(
        cleanCells.map((c) => {
          // Place Transit stations near Road lines
          if (
            c.grid_id === "A7" ||
            c.grid_id === "C9" ||
            c.grid_id === "H1" ||
            c.grid_id === "H3" ||
            c.grid_id === "I5"
          ) {
            return { ...c, interventionId: "bus_stop" };
          }
          // Connect surrounding zones with Walkways
          if (
            c.grid_id === "A10" ||
            c.grid_id === "B3" ||
            c.grid_id === "D4" ||
            c.grid_id === "F8" ||
            c.grid_id === "I6"
          ) {
            return { ...c, interventionId: "pedestrian_walkway" };
          }
          if (c.grid_id === "H2" || c.grid_id === "J6") {
            return { ...c, interventionId: "covered_walkway" };
          }
          // Densify housing adjacent to transit
          if (
            c.grid_id === "B10" ||
            c.grid_id === "C10" ||
            c.grid_id === "G8" ||
            c.grid_id === "G9"
          ) {
            return { ...c, interventionId: "convert_mixed_use" };
          }
          return c;
        })
      );
    }

    // Highlight a key center cell that altered
    setSelectedCellId("A7");
  };

  // Check if grid has any active modifications
  const hasModifications = useMemo(() => {
    return cells.some((c) => !!c.interventionId);
  }, [cells]);

  const activeInterventionsCount = useMemo(() => {
    return cells.filter((c) => !!c.interventionId).length;
  }, [cells]);

  // Compute overall KPI stats for the local AI Sandbox advisor
  const averages = useMemo(() => {
    let totGreen = 0,
      totWalk = 0,
      totHeat = 0,
      totNoise = 0,
      totTrans = 0,
      totAccess = 0;
    cells.forEach((cell) => {
      let g = cell.green_space_index;
      let w = cell.walkability_score;
      let h = cell.heat_risk_score;
      let n = cell.noise_score;
      let t = cell.public_transport_score;
      let a = cell.accessibility_score;

      if (cell.interventionId) {
        const intv = INTERVENTIONS.find((i) => i.id === cell.interventionId);
        if (intv?.impact) {
          g = Math.max(0, Math.min(100, g + (intv.impact.green_space_index || 0)));
          w = Math.max(0, Math.min(100, w + (intv.impact.walkability_score || 0)));
          h = Math.max(0, Math.min(100, h + (intv.impact.heat_risk_score || 0)));
          n = Math.max(0, Math.min(100, n + (intv.impact.noise_score || 0)));
          t = Math.max(0, Math.min(100, t + (intv.impact.public_transport_score || 0)));
          a = Math.max(0, Math.min(100, a + (intv.impact.accessibility_score || 0)));
        }
      }
      totGreen += g;
      totWalk += w;
      totHeat += h;
      totNoise += n;
      totTrans += t;
      totAccess += a;
    });

    return {
      green: totGreen / 100,
      walk: totWalk / 100,
      heat: totHeat / 100,
      noise: totNoise / 100,
      transit: totTrans / 100,
      access: totAccess / 100,
    };
  }, [cells]);

  // Generate dynamic rule-based AI Planner advices based on grid scores
  const [aiPlanningAdvices, setAiPlanningAdvices] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchAdvice = async () => {
    setAiLoading(true);
    try {
      const activeInterventionNames = cells
        .filter((c: any) => c.interventionId)
        .map((c: any) => c.interventionId);

      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cells, interventions: activeInterventionNames }),
      });

      const data = await res.json();
      if (data.suggestions) setAiPlanningAdvices(data.suggestions);
    } catch (err) {
      console.error("Gemini fetch error:", err);
    } finally {
      setAiLoading(false);
    }
  };

  // pdf
  const handleDownloadPDF = async () => {
    const scenarioName = prompt("Enter a name for this PDF report:") || "Scenario";
    const { generateScenarioPDF } = await import("../src/lib/generatePDF");
    await generateScenarioPDF({
      scenarioName,
      cells,
      aiAdvices: aiPlanningAdvices,
      mapElementId: "planlab-map",
      mapStyle,
    });
  };

  // Save current scenario to DB
  const handleSaveScenario = () => {
    setSaveModalName("");
    setSaveModalDesc("");
    setShowSaveModal(true);
  };

  const handleConfirmSave = async () => {
    if (!saveModalName.trim()) {
      showToast("Please enter a scenario name!", "error"); // ← add toast
      return;
    }
    setIsSaving(true);

    const cellStates: { [gridId: string]: string } = {};
    cells.forEach((c) => {
      if (c.interventionId) cellStates[c.grid_id] = c.interventionId;
    });

    const summary = aiPlanningAdvices
      .map((a) => `${a.type || "success"}|${a.title}|${a.description || a.text}`)
      .join("\n\n");

    try {
      const res = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveModalName,
          description: saveModalDesc,
          cellStates,
          summary,
          userId: user?.uid,
        }),
      });
      const data = await res.json();
      if (data.scenario) {
        setShowSaveModal(false);
        showToast(`✅ "${data.scenario.name}" Saved Successfully!`); // ← add toast
        handleReset();
      }
    } catch (err) {
      console.error("Save error:", err);
      showToast("Failed to save scenario. Please try again.", "error"); // ← add toast
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadScenario = async () => {
    setIsLoadingScenarios(true);
    setShowLoadModal(true);
    try {
      const res = await fetch(`/api/scenarios?userId=${user?.uid}`);
      const data = await res.json();
      setSavedScenarios(data.scenarios || []);
    } catch (err) {
      console.error("Load error:", err);
      showToast("Failed to load scenarios. Please try again.", "error");
    } finally {
      setIsLoadingScenarios(false);
    }
  };

  const handleSelectScenario = (chosen: any) => {
    const cellStates = chosen.cell_states;
    setCells(
      baselineRef.current.map((cell) => ({
        ...cell,
        interventionId: cellStates[cell.grid_id] || undefined,
      }))
    );
    setSelectedCellId(null);
    setHasNewModifications(false);
    setCurrentScenarioId(chosen.id);
    setCurrentScenarioName(chosen.name);

    if (chosen.summary && chosen.summary.trim() !== "") {
      const savedAdvices = chosen.summary.split("\n\n").map((block: string) => {
        const parts = block.split("|");
        return {
          type: parts[0] || "success",
          title: parts[1] || "",
          description: parts[2] || "",
        };
      });
      setAiPlanningAdvices(savedAdvices);
    } else {
      setAiPlanningAdvices([]);
    }

    setShowLoadModal(false);
    showToast(`📂 Loaded: "${chosen.name} successfully!"`);
  };

  const handleUpdateScenario = async () => {
    if (!currentScenarioId) return;
    setIsSaving(true);

    const cellStates: { [gridId: string]: string } = {};
    cells.forEach((c) => {
      if (c.interventionId) cellStates[c.grid_id] = c.interventionId;
    });

    const summary = aiPlanningAdvices
      .map((a) => `${a.type || "success"}|${a.title}|${a.description || a.text}`)
      .join("\n\n");

    try {
      const res = await fetch(`/api/scenarios/${currentScenarioId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cellStates, summary }),
      });
      const data = await res.json();
      if (data.scenario) {
        setCurrentScenarioId(null);
        setCurrentScenarioName("");
        showToast(`✅ "${data.scenario.name}" Updated Successfully!`);
        handleReset();
      }
    } catch (err) {
      console.error("Update error:", err);
      showToast("Failed to update scenario. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // notification
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  return (
    <div className="min-h-screen bg-[#F6F8FB] text-slate-800 font-sans flex flex-col justify-between w-full">
      {/* Header Panel */}
      <Header
        onReset={handleReset}
        onApplyPreset={handleApplyPreset}
        hasModifications={hasModifications}
        activeInterventionsCount={activeInterventionsCount}
        onSaveScenario={handleSaveScenario}
        onLoadScenario={handleLoadScenario}
        currentScenarioId={currentScenarioId}
        currentScenarioName={currentScenarioName}
        hasNewModifications={hasNewModifications}
        onUpdateScenario={handleUpdateScenario}
        onSignOut={() => setShowSignOutModal(true)}
      />

      {/* Main Sandbox Interactive Area */}
      <main className="flex-1 px-4 py-6 w-full flex flex-col lg:flex-row gap-5 items-stretch overflow-hidden">
        {/* LEFT COMPONENT: Intervention tools sidebar */}
        <div
          className={`transition-all duration-300 ease-in-out shrink-0 flex flex-col h-[600px] lg:h-auto ${isSidebarExpanded ? "lg:w-[320px]" : "lg:w-[64px]"} w-full`}
        >
          <InterventionToolbar
            selectedId={selectedInterventionId}
            onSelect={setSelectedInterventionId}
            hoveredIntervention={hoveredIntervention}
            setHoveredIntervention={setHoveredIntervention}
            isExpanded={isSidebarExpanded}
            onToggleExpand={() => setIsSidebarExpanded(!isSidebarExpanded)}
          />
        </div>

        {/* CENTER COMPONENT: Visual Map Overlay Grid */}
        <div className="flex-1 flex flex-col space-y-4 min-w-0">
          <div id="planlab-map">
            <PlanLabMap
              cells={cells}
              selectedCell={selectedCell}
              onSelectCell={handleSelectCell}
              activeIntervention={activeIntervention}
              isSidebarExpanded={isSidebarExpanded}
              mapStyle={mapStyle}
              onMapStyleChange={setMapStyle}
            />
          </div>

          {/* Interactive GIS Scenario Advisor Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-blue-500" />
                <h4 className="font-display font-bold text-xs tracking-wide uppercase text-slate-800">
                  PlanLab AI Local Simulation Advisory
                </h4>
              </div>

              <div className="flex items-center gap-2">
                {(hasNewModifications || (hasModifications && aiPlanningAdvices.length === 0)) && (
                  <button
                    onClick={fetchAdvice}
                    disabled={aiLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border bg-blue-600 text-white border-blue-600 hover:bg-blue-700 cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3" />
                    {aiLoading ? "Generating..." : "Generate Advisory"}
                  </button>
                )}

                {aiPlanningAdvices.length > 0 && (
                  <button
                    onClick={handleDownloadPDF}
                    title="Download scenario report as PDF"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 cursor-pointer"
                  >
                    <TrendingUp className="h-3 w-3" />
                    Download PDF
                  </button>
                )}
              </div>
            </div>

            {aiLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border bg-slate-50 border-slate-200 animate-pulse h-20"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {aiPlanningAdvices.map((advice, idx) => {
                  // support both old (status/text) and new (type/description) formats
                  const status = advice.type || advice.status;
                  const body = advice.description || advice.text;
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border text-xs flex gap-2.5 ${
                        status === "alert" || status === "critical"
                          ? "bg-rose-50 border-rose-200 text-rose-850"
                          : status === "warning"
                            ? "bg-amber-50 border-amber-200 text-amber-850"
                            : "bg-emerald-50 border-emerald-200 text-emerald-850"
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {(status === "alert" || status === "critical") && (
                          <Info className="h-4 w-4 text-rose-600" />
                        )}
                        {status === "warning" && <HelpCircle className="h-4 w-4 text-amber-600" />}
                        {status === "success" && <Sparkles className="h-4 w-4 text-emerald-600" />}
                      </div>
                      <div>
                        <h5 className="font-bold mb-0.5 text-slate-900">{advice.title}</h5>
                        <p className="text-[11px] text-slate-600 leading-normal">{body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Save Scenario Modal */}
        {showSaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md mx-4 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Save className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-base">Save Scenario</h2>
                  <p className="text-xs text-slate-500">
                    {cells.filter((c) => c.interventionId).length} interventions will be saved
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                    Scenario Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Green City Plan, Transit Hub v2"
                    value={saveModalName}
                    onChange={(e) => setSaveModalName(e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 text-sm outline-none text-slate-800 placeholder-slate-400 ${
                      saveModalName.trim() === "" &&
                      isSaving && (
                        <p className="text-xs text-rose-500 mt-1">Scenario name is required.</p>
                      )
                    }
                        ? "border-rose-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                        : "border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    }`}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                    Description <span className="text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    placeholder="Brief notes about this scenario..."
                    value={saveModalDesc}
                    onChange={(e) => setSaveModalDesc(e.target.value)}
                    rows={3}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-slate-800 placeholder-slate-400 resize-none"
                  />
                </div>

                {aiPlanningAdvices.length > 0 && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <p className="text-xs text-emerald-700 font-medium">
                      AI advisory will be saved with this scenario
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 mt-6">
                {/* Save as New — only enabled when name is typed */}
                <button
                  onClick={handleConfirmSave}
                  disabled={!saveModalName.trim() || isSaving}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    saveModalName.trim() && !isSaving
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save as New"}
                </button>
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Load Scenario Modal */}
        {showLoadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md mx-4 p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <FolderOpen className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-800 text-base">Load Scenario</h2>
                    <p className="text-xs text-slate-500">Select a saved scenario to restore</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLoadModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {isLoadingScenarios ? (
                <div className="py-8 text-center text-slate-400 text-sm">Loading scenarios...</div>
              ) : savedScenarios.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  No saved scenarios found.
                </div>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto">
                  {savedScenarios.map((scenario) => (
                    <button
                      key={scenario.id}
                      onClick={() => handleSelectScenario(scenario)}
                      className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm text-slate-800 group-hover:text-blue-700">
                            {scenario.name}
                          </p>
                          {scenario.description && (
                            <p className="text-xs text-slate-500 mt-0.5">{scenario.description}</p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">
                            {scenario.updated_at ? "Updated: " : "Created: "}
                            {(() => {
                              const date = new Date(scenario.updated_at || scenario.created_at);
                              const myt = new Date(date.getTime() + 8 * 60 * 60 * 1000);
                              return myt.toLocaleString("en-MY", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              });
                            })()}
                          </p>
                        </div>
                        <div className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono shrink-0">
                          {Object.keys(scenario.cell_states || {}).length} cells
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowLoadModal(false)}
                className="w-full mt-4 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Sign Out Modal */}
        {showSignOutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm mx-4 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-rose-50 rounded-lg">
                  <LogOut className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-base">Sign Out</h2>
                  <p className="text-xs text-slate-500">Are you sure you want to leave?</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-5">
                <p className="text-xs text-amber-700 font-medium">
                  ⚠️ Make sure you have saved your current scenario before signing out. Unsaved
                  changes will be lost.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowSignOutModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    signOut(auth);
                    setShowSignOutModal(false);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-all"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all animate-fade-in ${
              toast.type === "success"
                ? "bg-white border-emerald-200 text-emerald-800"
                : "bg-white border-rose-200 text-rose-800"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                toast.type === "success" ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
            {toast.message}
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* RIGHT COMPONENT: Cell Specs & Score Comparisons */}
        <div className="lg:w-[320px] shrink-0 h-full flex flex-col min-h-[500px] lg:min-h-0 w-full">
          <CellDetailsPanel cell={selectedCell} onClearIntervention={handleClearIntervention} />
        </div>
      </main>

      {/* BOTTOM COMPONENT: Score Summary Average cards */}
      <footer className="w-full px-4 pb-6 mx-auto shrink-0">
        <ScoreSummary cells={cells} />

        {/* Footnote status metadata */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 bg-white border border-slate-200 px-4 py-3 rounded-xl shadow-sm">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium text-slate-600">
              PlanLab AI Student Prototype Sandbox • Seksyen 7, Shah Alam Pilot Grid
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 sm:mt-0 font-mono text-slate-400 text-[10px]">
            <span>Grid Origin: A1 (Top-Left) to J10 (Bottom-Right)</span>
            <span>•</span>
            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-100">
              Connected • Cloud SQL
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
