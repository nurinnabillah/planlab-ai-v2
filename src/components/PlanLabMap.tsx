"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Map, { Source, Layer, Marker, LayerProps, MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { FeatureCollection, Polygon } from "geojson";
import { GridCell, Intervention, INTERVENTIONS } from "../../types";
import * as Icons from "lucide-react";

interface PlanLabMapProps {
  cells: GridCell[];
  selectedCell: GridCell | null;
  onSelectCell: (cell: GridCell) => void;
  activeIntervention: Intervention | null;
  isSidebarExpanded?: boolean;
}

type OverlayLayer = "landuse" | "heatrisk" | "walkability" | "greenspace" | "noise";

// Next.js syntax (new — fix this)
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function PlanLabMap({
  cells,
  selectedCell,
  onSelectCell,
  activeIntervention,
  isSidebarExpanded,
}: PlanLabMapProps) {
  const [activeLayer, setActiveLayer] = useState<OverlayLayer>("landuse");
  const [mapStyle, setMapStyle] = useState("mapbox://styles/mapbox/light-v11");
  const [hoverInfo, setHoverInfo] = useState<{ feature: any; x: number; y: number } | null>(null);
  const mapRef = useRef<MapRef>(null);

  useEffect(() => {
    // Give time for the CSS layout transition to finish
    const timeout = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [isSidebarExpanded]);

  // Get landuse styles for the legend
  const getLandUseStyle = (use: string) => {
    switch (use) {
      case "Residential":
        return { bg: "bg-amber-400/30", border: "border-amber-400", label: "Residential" };
      case "Commercial":
        return { bg: "bg-rose-400/30", border: "border-rose-400", label: "Commercial" };
      case "Green":
        return { bg: "bg-emerald-500/30", border: "border-emerald-500", label: "Greenery / Park" };
      case "Road":
        return { bg: "bg-slate-400/50", border: "border-slate-400", label: "Main Street" };
      case "Water":
        return { bg: "bg-sky-400/30", border: "border-sky-400", label: "Natural Waterways" };
      case "Public Facility":
        return { bg: "bg-violet-400/30", border: "border-violet-400", label: "Public Facility" };
      default:
        return { bg: "bg-zinc-200/50", border: "border-zinc-300", label: "Infill Space" };
    }
  };

  const getLandUseColorHex = (use: string) => {
    switch (use) {
      case "Residential":
        return "rgba(251, 191, 36, 0.4)";
      case "Commercial":
        return "rgba(251, 113, 133, 0.4)";
      case "Green":
        return "rgba(16, 185, 129, 0.4)";
      case "Road":
        return "rgba(148, 163, 184, 0.5)";
      case "Water":
        return "rgba(56, 189, 248, 0.4)";
      case "Public Facility":
        return "rgba(167, 139, 250, 0.4)";
      default:
        return "rgba(244, 244, 245, 0.4)";
    }
  };

  const getCellColorHex = (cell: GridCell, layer: string) => {
    if (layer === "landuse") return getLandUseColorHex(cell.land_use);

    if (layer === "heatrisk") {
      const heat = cell.heat_risk_score;
      if (heat >= 60) return "rgba(248, 113, 113, 0.5)";
      if (heat >= 45) return "rgba(251, 146, 60, 0.5)";
      if (heat >= 30) return "rgba(253, 224, 71, 0.5)";
      return "rgba(96, 165, 250, 0.5)";
    }

    if (layer === "walkability") {
      const walk = cell.walkability_score;
      if (walk >= 75) return "rgba(52, 211, 153, 0.5)";
      if (walk >= 60) return "rgba(45, 212, 191, 0.5)";
      if (walk >= 41) return "rgba(251, 191, 36, 0.5)";
      return "rgba(251, 113, 133, 0.5)";
    }

    if (layer === "greenspace") {
      const greenIdx = cell.green_space_index;
      if (greenIdx >= 85) return "rgba(22, 163, 74, 0.5)";
      if (greenIdx >= 70) return "rgba(16, 185, 129, 0.5)";
      if (greenIdx >= 50) return "rgba(245, 158, 11, 0.5)";
      return "rgba(180, 83, 9, 0.4)";
    }

    if (layer === "noise") {
      const noise = cell.noise_score;
      if (noise >= 65) return "rgba(192, 132, 252, 0.5)";
      if (noise >= 40) return "rgba(232, 121, 249, 0.5)";
      if (noise >= 21) return "rgba(203, 213, 225, 0.5)";
      return "rgba(45, 212, 191, 0.5)";
    }

    return "rgba(248, 250, 252, 0.4)";
  };

  // Convert cells to GeoJSON
  const geojsonData: FeatureCollection<Polygon> = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: cells.map((cell) => {
        const isSelected = selectedCell?.grid_id === cell.grid_id;
        const isHovered = hoverInfo?.feature?.properties?.grid_id === cell.grid_id;
        return {
          type: "Feature",
          id: cell.grid_id,
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [cell.west_lng, cell.north_lat],
                [cell.east_lng, cell.north_lat],
                [cell.east_lng, cell.south_lat],
                [cell.west_lng, cell.south_lat],
                [cell.west_lng, cell.north_lat],
              ],
            ],
          },
          properties: {
            ...cell,
            fillColor: getCellColorHex(cell, activeLayer),
            borderColor: isSelected ? "#3b82f6" : isHovered ? "#94a3b8" : "#e2e8f0",
            borderWidth: isSelected ? 3 : isHovered ? 2 : 1,
          },
        };
      }),
    };
  }, [cells, activeLayer, selectedCell, hoverInfo?.feature?.properties?.grid_id]);

  const fillLayerStyle: LayerProps = {
    id: "grid-fill",
    type: "fill",
    paint: {
      "fill-color": ["get", "fillColor"],
      "fill-opacity": 0.35,
    },
  };

  const lineLayerStyle: LayerProps = {
    id: "grid-line",
    type: "line",
    paint: {
      "line-color": ["get", "borderColor"],
      "line-width": ["get", "borderWidth"],
    },
  };

  const onHover = (event: any) => {
    const feature = event.features && event.features[0];
    if (feature) {
      setHoverInfo({ feature, x: event.point.x, y: event.point.y });
    } else {
      setHoverInfo(null);
    }
  };

  const onClick = (event: any) => {
    const feature = event.features && event.features[0];
    if (feature) {
      const cell = cells.find((c) => c.grid_id === feature.properties.grid_id);
      if (cell) onSelectCell(cell);
    }
  };

  return (
    <div className="flex flex-col  bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm p-4 w-full">
      {/* Top Controls: GIS Layer Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200 shrink-0">
        <div>
          <h3 className="font-display font-bold text-sm tracking-wide text-slate-800">
            Seksyen 7 Pilot Boundary (A1 - J10)
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Bounding Box: 3.0813°N 101.4881°E to 3.0733°N 101.4962°E
          </p>
        </div>

        {/* View mode layer switch */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-lg text-[11px]">
          <span className="text-[9px] uppercase font-mono font-bold text-slate-400 px-1.5 hidden md:inline font-bold">
            GIS VIEW:
          </span>
          <button
            onClick={() => setActiveLayer("landuse")}
            className={`px-2.5 py-1 rounded cursor-pointer font-semibold transition-all ${
              activeLayer === "landuse"
                ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Land Use
          </button>
          <button
            onClick={() => setActiveLayer("heatrisk")}
            className={`px-2.5 py-1 rounded cursor-pointer font-semibold transition-all ${
              activeLayer === "heatrisk"
                ? "bg-white text-red-650 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Heat Risk
          </button>
          <button
            onClick={() => setActiveLayer("greenspace")}
            className={`px-2.5 py-1 rounded cursor-pointer font-semibold transition-all ${
              activeLayer === "greenspace"
                ? "bg-white text-emerald-700 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            GSI (Green)
          </button>
          <button
            onClick={() => setActiveLayer("walkability")}
            className={`px-2.5 py-1 rounded cursor-pointer font-semibold transition-all ${
              activeLayer === "walkability"
                ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Walkability
          </button>
          <button
            onClick={() => setActiveLayer("noise")}
            className={`px-2.5 py-1 rounded cursor-pointer font-semibold transition-all ${
              activeLayer === "noise"
                ? "bg-white text-violet-700 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Noise
          </button>
        </div>
      </div>

      {/* Main Geographical Grid Layout Frame */}
      <div className="relative w-full h-[75vh] min-h-[500px] rounded-lg overflow-hidden border border-slate-200 shadow-inner mt-4 mb-4 shrink-0 transition-all duration-300">
        <Map
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={{
            longitude: 101.4921565,
            latitude: 3.0773015,
            zoom: 15.5,
          }}
          mapStyle={mapStyle}
          interactiveLayerIds={["grid-fill"]}
          onMouseMove={onHover}
          onMouseLeave={() => setHoverInfo(null)}
          onClick={onClick}
          minZoom={12}
          maxZoom={18}
        >
          <Source id="grid-data" type="geojson" data={geojsonData}>
            <Layer {...fillLayerStyle} />
            <Layer {...lineLayerStyle} />
          </Source>

          {/* Render Markers for Interventions */}
          {cells.map((cell) => {
            if (!cell.interventionId) return null;
            const intervention = INTERVENTIONS.find((i) => i.id === cell.interventionId);
            if (!intervention) return null;
            const IconComp = (Icons as any)[intervention.icon] || Icons.CircleDot;
            return (
              <Marker
                key={`marker-${cell.grid_id}`}
                longitude={cell.center_lng}
                latitude={cell.center_lat}
                anchor="center"
              >
                <div className="p-1 rounded-full bg-white border border-blue-500 text-blue-600 shadow-md scale-90 md:scale-100 animate-fade-in pointer-events-none">
                  <IconComp className="h-3 w-3 stroke-[2.5]" />
                </div>
              </Marker>
            );
          })}

          <div
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              zIndex: 10,
              background: "white",
              borderRadius: "8px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              overflow: "hidden",
              display: "flex",
            }}
          >
            <button
              onClick={() => setMapStyle("mapbox://styles/mapbox/light-v11")}
              style={{
                padding: "7px 12px",
                fontSize: 11,
                border: "none",
                cursor: "pointer",
                background: mapStyle.includes("light") ? "#2563eb" : "#f5f5f5",
                color: mapStyle.includes("light") ? "white" : "#333",
                fontWeight: mapStyle.includes("light") ? 600 : 400,
              }}
            >
              🗺️
            </button>
            <button
              onClick={() => setMapStyle("mapbox://styles/mapbox/satellite-streets-v12")}
              style={{
                padding: "7px 12px",
                fontSize: 11,
                border: "none",
                cursor: "pointer",
                background: mapStyle.includes("satellite") ? "#2563eb" : "#f5f5f5",
                color: mapStyle.includes("satellite") ? "white" : "#333",
                fontWeight: mapStyle.includes("satellite") ? 600 : 400,
              }}
            >
              🛰️
            </button>
          </div>
        </Map>

        {/* Hover Tooltip */}
        {hoverInfo && hoverInfo.feature && (
          <div
            className="absolute z-10 bg-white/95 backdrop-blur shadow-lg border border-slate-200 px-3 py-2 rounded pointer-events-none text-xs"
            style={{ left: hoverInfo.x + 10, top: hoverInfo.y + 10 }}
          >
            <div className="font-bold text-slate-800 mb-0.5">
              Cell {hoverInfo.feature.properties.grid_id}
            </div>
            <div className="text-slate-600">{hoverInfo.feature.properties.land_use}</div>
          </div>
        )}
      </div>

      {/* Landscape Land-use Map Legend */}
      {/* Dynamic Legend */}
      <div className="border-t border-slate-100 pt-3 bg-slate-50 rounded-lg px-3 py-3">
        {activeLayer === "landuse" && (
          <>
            <h4 className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 mb-2">
              Land-Use Legend
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {["Residential", "Commercial", "Green", "Road", "Water", "Public Facility"].map(
                (use) => {
                  const style = getLandUseStyle(use);
                  return (
                    <div key={use} className="flex items-center gap-1.5">
                      <span
                        className={`inline-block w-3.5 h-3.5 rounded border ${style.bg} ${style.border}`}
                      ></span>
                      <span className="text-[11px] text-slate-600 font-semibold whitespace-nowrap truncate">
                        {style.label}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          </>
        )}

        {activeLayer === "heatrisk" && (
          <>
            <h4 className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 mb-2">
              Heat Risk — Lower is Better 🌡️
            </h4>
            <div className="grid w-full grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              {[
                { color: "bg-red-400", label: "High Risk (60+)" },
                { color: "bg-orange-400", label: "Medium (45–60)" },
                { color: "bg-yellow-300", label: "Low (30–45)" },
                { color: "bg-blue-400", label: "Very Low (<30)" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span
                    className={`inline-block w-3.5 h-3.5 rounded ${item.color} opacity-70`}
                  ></span>
                  <span className="text-[11px] text-slate-600 font-semibold">{item.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {activeLayer === "greenspace" && (
          <>
            <h4 className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 mb-2">
              Green Space Index — Higher is Better 🌳
            </h4>
            <div className="grid w-full grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              {[
                { color: "bg-green-700", label: "Excellent (85+)" },
                { color: "bg-emerald-400", label: "Good (70–85)" },
                { color: "bg-amber-400", label: "Fair (50–70)" },
                { color: "bg-orange-800", label: "Poor (<50)" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span
                    className={`inline-block w-3.5 h-3.5 rounded ${item.color} opacity-70`}
                  ></span>
                  <span className="text-[11px] text-slate-600 font-semibold">{item.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {activeLayer === "walkability" && (
          <>
            <h4 className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 mb-2">
              Walkability Score — Higher is Better 🚶
            </h4>
            <div className="grid w-full grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              {[
                { color: "bg-emerald-400", label: "Excellent (75+)" },
                { color: "bg-teal-400", label: "Good (60–75)" },
                { color: "bg-yellow-400", label: "Fair (41–60)" },
                { color: "bg-rose-400", label: "Poor (<41)" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span
                    className={`inline-block w-3.5 h-3.5 rounded ${item.color} opacity-70`}
                  ></span>
                  <span className="text-[11px] text-slate-600 font-semibold">{item.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {activeLayer === "noise" && (
          <>
            <h4 className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 mb-2">
              Noise Level — Lower is Better 🔇
            </h4>
            <div className="grid w-full grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              {[
                { color: "bg-purple-400", label: "Very Loud (65+)" },
                { color: "bg-fuchsia-400", label: "Moderate (40–65)" },
                { color: "bg-slate-300", label: "Quiet (21–40)" },
                { color: "bg-teal-400", label: "Very Quiet (<21)" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span
                    className={`inline-block w-3.5 h-3.5 rounded ${item.color} opacity-70`}
                  ></span>
                  <span className="text-[11px] text-slate-600 font-semibold">{item.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
