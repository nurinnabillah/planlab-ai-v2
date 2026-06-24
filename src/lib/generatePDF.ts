import jsPDF from "jspdf";
import { GridCell, INTERVENTIONS } from "../../types";

interface GeneratePDFProps {
  scenarioName: string;
  cells: GridCell[];
  aiAdvices: any[];
  mapElementId: string;
  mapStyle: string;
}

// ── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  green: [52, 168, 130] as [number, number, number],
  greenBand: [72, 180, 142] as [number, number, number],
  greenLight: [232, 248, 242] as [number, number, number],
  greenMid: [120, 210, 180] as [number, number, number],
  greenDark: [20, 90, 70] as [number, number, number],
  blue: [55, 138, 221] as [number, number, number],
  blueLight: [230, 241, 251] as [number, number, number],
  blueDark: [25, 80, 160] as [number, number, number],
  amber: [186, 117, 23] as [number, number, number],
  amberLight: [254, 243, 219] as [number, number, number],
  amberDark: [120, 70, 10] as [number, number, number],
  red: [200, 40, 40] as [number, number, number],
  redLight: [254, 226, 226] as [number, number, number],
  redDark: [130, 20, 20] as [number, number, number],
  slate900: [15, 23, 42] as [number, number, number],
  slate700: [51, 65, 85] as [number, number, number],
  slate600: [71, 85, 105] as [number, number, number],
  slate400: [148, 163, 184] as [number, number, number],
  slate200: [226, 232, 240] as [number, number, number],
  slate100: [241, 245, 249] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function setFill(pdf: jsPDF, c: [number, number, number]) {
  pdf.setFillColor(c[0], c[1], c[2]);
}
function setDraw(pdf: jsPDF, c: [number, number, number]) {
  pdf.setDrawColor(c[0], c[1], c[2]);
}
function setTxt(pdf: jsPDF, c: [number, number, number]) {
  pdf.setTextColor(c[0], c[1], c[2]);
}

function rr(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  style: "F" | "S" | "FD" = "F"
) {
  pdf.roundedRect(x, y, w, h, r, r, style);
}

function sectionHeading(pdf: jsPDF, label: string, y: number, margin: number, pageWidth: number) {
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  setTxt(pdf, C.slate400);
  pdf.text(label.toUpperCase(), margin, y);
  y += 2;
  setDraw(pdf, C.slate200);
  pdf.setLineWidth(0.25);
  pdf.line(margin, y, pageWidth - margin, y);
  return y + 5;
}

function scoreColor(label: string, value: number): [number, number, number] {
  const isRisk = /heat|noise|traffic/i.test(label);
  if (isRisk) return value < 35 ? C.green : value < 60 ? C.amber : C.red;
  return value >= 65 ? C.green : value >= 45 ? C.amber : C.red;
}

function scoreCard(
  pdf: jsPDF,
  cx: number,
  cy: number,
  cardW: number,
  cardH: number,
  label: string,
  val: number,
  base: number,
  higherIsBetter: boolean
) {
  setFill(pdf, C.white);
  setDraw(pdf, C.slate200);
  pdf.setLineWidth(0.25);
  rr(pdf, cx, cy, cardW, cardH, 2.5, "FD");

  const color = scoreColor(label, val);
  const delta = parseFloat((val - base).toFixed(1));
  const isPositive = higherIsBetter ? delta > 0 : delta < 0;
  const isNeutral = Math.abs(delta) < 0.05;
  const deltaColor: [number, number, number] = isNeutral
    ? C.slate400
    : isPositive
      ? C.green
      : C.red;
  const deltaStr = isNeutral
    ? "no change"
    : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} vs baseline`;

  pdf.setFontSize(6.5);
  pdf.setFont("helvetica", "normal");
  setTxt(pdf, C.slate400);
  pdf.text(label, cx + 4, cy + 5.5);

  const valStr = val.toFixed(1);
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  setTxt(pdf, color);
  pdf.text(valStr, cx + 4, cy + 12.5);

  pdf.setFontSize(13);
  const valW = pdf.getTextWidth(valStr);
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  setTxt(pdf, C.slate400);
  pdf.text("/ 100", cx + 4 + valW + 1.5, cy + 12.5);

  const barX = cx + 4,
    barY = cy + 15,
    barW = cardW - 8;
  setFill(pdf, C.slate200);
  rr(pdf, barX, barY, barW, 1.8, 0.9, "F");
  setFill(pdf, color);
  rr(pdf, barX, barY, Math.max(1, barW * (val / 100)), 1.8, 0.9, "F");

  pdf.setFontSize(6);
  pdf.setFont("helvetica", "normal");
  setTxt(pdf, deltaColor);
  pdf.text(deltaStr, cx + 4, cy + 19.5);
}

// ── Advisory card — coloured by severity ─────────────────────────────────────
// status: "alert" | "warning" | "success" | "info" | "critical"
function advisoryCard(
  pdf: jsPDF,
  margin: number,
  pageWidth: number,
  cw: number,
  y: number,
  title: string,
  body: string,
  status: string
): number {
  // Colour scheme by severity
  let bgColor: [number, number, number];
  let borderColor: [number, number, number];
  let accentColor: [number, number, number];
  let tagLabel: string;
  let tagBg: [number, number, number];
  let tagTxt: [number, number, number];
  let dotColor: [number, number, number];

  if (status === "alert" || status === "critical") {
    bgColor = C.redLight;
    borderColor = [240, 180, 180] as [number, number, number];
    accentColor = C.red;
    dotColor = C.red;
    tagLabel = "Alert";
    tagBg = C.red;
    tagTxt = C.white;
  } else if (status === "warning") {
    bgColor = C.amberLight;
    borderColor = [245, 210, 150] as [number, number, number];
    accentColor = C.amber;
    dotColor = C.amber;
    tagLabel = "Warning";
    tagBg = C.amber;
    tagTxt = C.white;
  } else {
    // success / info / default
    bgColor = C.greenLight;
    borderColor = C.greenMid;
    accentColor = C.green;
    dotColor = C.green;
    tagLabel = "Recommendation";
    tagBg = C.green;
    tagTxt = C.white;
  }

  // Measure body height first so the card won't overflow
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);

  const headerHeight = 15;
  const bodyTopPadding = 5;
  const bodyBottomPadding = 6;
  const lineHeight = 4.8;

  const bodyLines = pdf.splitTextToSize(body, cw - 18);
  const bodyH = Math.max(lineHeight, bodyLines.length * lineHeight);

  const cardH = headerHeight + bodyTopPadding + bodyH + bodyBottomPadding;

  if (y + cardH > 274) {
    pdf.addPage();
    y = 20;
  }

  // Card background + border
  setFill(pdf, bgColor);
  setDraw(pdf, borderColor);
  pdf.setLineWidth(0.4);
  rr(pdf, margin, y, cw, cardH, 3, "FD");

  // Left accent bar
  setFill(pdf, accentColor);
  pdf.rect(margin, y, 3, cardH, "F");
  // Re-draw rounded corners over the flat bar so it looks clean
  setFill(pdf, bgColor);
  setDraw(pdf, borderColor);
  pdf.setLineWidth(0.4);
  rr(pdf, margin, y, cw, cardH, 3, "S"); // stroke only to restore border

  // Dot icon
  setFill(pdf, dotColor);
  pdf.circle(margin + 9, y + 6, 2.2, "F");
  setFill(pdf, C.white);
  pdf.circle(margin + 9, y + 6, 1, "F"); // inner white dot for circle-i look

  // Title
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  setTxt(pdf, C.slate900);
  pdf.text(title, margin + 14, y + 7);

  // Tag pill — right side of header
  pdf.setFontSize(6.5);
  pdf.setFont("helvetica", "bold");
  const tagW = pdf.getTextWidth(tagLabel) + 8;
  setFill(pdf, tagBg);
  setDraw(pdf, tagBg);
  rr(pdf, pageWidth - margin - tagW - 2, y + 3, tagW, 5, 2.5, "F");
  setTxt(pdf, tagTxt);
  pdf.text(tagLabel, pageWidth - margin - tagW + 2, y + 7);

  // Divider line under header
  setDraw(pdf, borderColor);
  pdf.setLineWidth(0.3);
  const dividerY = y + headerHeight;

  pdf.line(margin + 3, dividerY, pageWidth - margin, dividerY);

  // Body text
  let bodyY = dividerY + bodyTopPadding;

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  setTxt(pdf, C.slate700);

  bodyLines.forEach((line: string) => {
    pdf.text(line, margin + 7, bodyY);
    bodyY += lineHeight;
  });

  return y + cardH + 7;
}

// ── Main export ──────────────────────────────────────────────────────────────
export const generateScenarioPDF = async ({
  scenarioName,
  cells,
  aiAdvices,
  mapStyle,
}: GeneratePDFProps) => {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = 210;
  const margin = 18;
  const cw = pageWidth - margin * 2;
  let y = 0;

  const activeCells = cells.filter((c) => c.interventionId);

  // ── 1. HEADER BAND ────────────────────────────────────────────────────────
  setFill(pdf, C.greenBand);
  pdf.rect(0, 0, pageWidth, 30, "F");

  pdf.setFontSize(6.5);
  pdf.setFont("helvetica", "normal");
  setTxt(pdf, [180, 230, 215] as [number, number, number]);
  pdf.text("URBAN IMPACT ASSESSMENT REPORT", margin, 8);

  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  setTxt(pdf, C.white);
  pdf.text("PlanLab AI", margin, 17);

  pdf.setFontSize(7.5);
  pdf.setFont("helvetica", "normal");
  setTxt(pdf, [220, 245, 237] as [number, number, number]);
  const dateStr = new Date().toLocaleDateString("en-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  pdf.text(`Seksyen 7, Shah Alam  ·  ${scenarioName}  ·  ${dateStr}`, margin, 24);

  // Pills right-aligned
  //   const pillBg: [number,number,number]  = [195, 235, 220];
  //   const pillTxt: [number,number,number] = C.greenDark;
  //   const pillItems = [`${activeCells.length} interventions`, "10 × 10 pilot grid", "CitySage Sdn. Bhd."];
  //   let pxRight = pageWidth - margin;
  //   [...pillItems].reverse().forEach((label) => {
  //     pdf.setFontSize(6.5);
  //     pdf.setFont("helvetica", "normal");
  //     const tw = pdf.getTextWidth(label);
  //     const pw = tw + 7;
  //     pxRight -= pw;
  //     setFill(pdf, pillBg);
  //     setDraw(pdf, pillBg);
  //     rr(pdf, pxRight, 20, pw, 5, 2.5, "F");
  //     setTxt(pdf, pillTxt);
  //     pdf.text(label, pxRight + 3.5, 23.8);
  //     pxRight -= 2.5;
  //   });

  y = 37;

  // ── 2. EXECUTIVE SUMMARY ──────────────────────────────────────────────────
  //   setFill(pdf, C.green);
  //   pdf.rect(margin, y, 2, 16, "F");
  //   setFill(pdf, C.greenLight);
  //   pdf.rect(margin + 2, y, cw - 2, 16, "F");

  //   pdf.setFontSize(6.5);
  //   pdf.setFont("helvetica", "bold");
  //   setTxt(pdf, C.greenDark);
  //   pdf.text("EXECUTIVE SUMMARY", margin + 5, y + 4.5);

  //   pdf.setFontSize(8);
  //   pdf.setFont("helvetica", "normal");
  //   setTxt(pdf, C.slate700);
  //   const execText =
  //     `${activeCells.length} intervention${activeCells.length !== 1 ? "s" : ""} placed across the Seksyen 7 pilot grid. ` +
  //     `Walkability and green space scores are strong. ` +
  //     `Public transport remains the most critical gap — targeted investment is recommended before the next planning cycle.`;
  //   const execLines = pdf.splitTextToSize(execText, cw - 10);
  //   pdf.text(execLines, margin + 5, y + 9.5);

  //   y += 22;

  // ── 3. MAP — auto-fit bounds to markers ──────────────────────────────────
  y = sectionHeading(pdf, "Grid map — Seksyen 7 pilot area", y, margin, pageWidth);

  try {
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    // Build marker string
    const markerParts = activeCells
      .slice(0, 10)
      .map((c, idx) => `pin-l-${idx + 1}+348A82(${c.center_lng},${c.center_lat})`);
    const markerStr = markerParts.join(",");

    const styleId = mapStyle.includes("satellite")
      ? "mapbox/satellite-streets-v12"
      : "mapbox/light-v11";

    // Use "auto" viewport — Mapbox will fit all markers in view automatically
    // padding=40 gives breathing room around the outermost pins
    // Larger image: 720x320 for better detail
    const staticMapUrl = markerStr
      ? `https://api.mapbox.com/styles/v1/${styleId}/static/${markerStr}/auto/720x320?padding=60&access_token=${mapboxToken}`
      : `https://api.mapbox.com/styles/v1/${styleId}/static/101.4921,3.0773,15,0/720x320?access_token=${mapboxToken}`;

    const resp = await fetch(staticMapUrl);
    const blob = await resp.blob();
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

    // Taller map in PDF: 80mm instead of previous ~60mm
    const mapH = (320 * cw) / 720;
    pdf.addImage(base64, "PNG", margin, y, cw, mapH);
    setDraw(pdf, C.slate200);
    pdf.setLineWidth(0.25);
    rr(pdf, margin, y, cw, mapH, 2, "S");
    y += mapH + 7;

    // Legend — 2 columns, smaller text
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    const legendRows = Math.ceil(activeCells.length / 2);
    activeCells.slice(0, 10).forEach((cell, idx) => {
      const intervention = INTERVENTIONS.find((i) => i.id === cell.interventionId);
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const lx = margin + col * (cw / 2);
      const ly = y + row * 4.5;
      setFill(pdf, C.green);
      pdf.circle(lx + 2, ly - 1, 1, "F");
      setTxt(pdf, C.slate600);
      pdf.text(
        `${idx + 1}  ${cell.grid_id} — ${intervention?.name || cell.interventionId}`,
        lx + 5,
        ly
      );
    });
    y += legendRows * 4.5 + 5;
  } catch {
    y += 5;
  }

  // ── 4. ACTIVE INTERVENTIONS ───────────────────────────────────────────────
  //   if (y > 225) { pdf.addPage(); y = 20; }
  //   y = sectionHeading(pdf, "Active interventions", y, margin, pageWidth);

  //   if (activeCells.length === 0) {
  //     pdf.setFontSize(8);
  //     pdf.setFont("helvetica", "italic");
  //     setTxt(pdf, C.slate400);
  //     pdf.text("No interventions placed.", margin + 2, y);
  //     y += 8;
  //   } else {
  //     let tagX = margin;
  //     activeCells.forEach((cell) => {
  //       const intervention = INTERVENTIONS.find(i => i.id === cell.interventionId);
  //       const label = `${cell.grid_id}  —  ${intervention?.name || cell.interventionId}`;
  //       pdf.setFontSize(7.5);
  //       pdf.setFont("helvetica", "normal");
  //       const tw = pdf.getTextWidth(label) + 13;
  //       if (tagX + tw > pageWidth - margin) { tagX = margin; y += 7.5; }
  //       setFill(pdf, C.greenLight);
  //       setDraw(pdf, C.greenMid);
  //       pdf.setLineWidth(0.25);
  //       rr(pdf, tagX, y - 4, tw, 6, 3, "FD");
  //       setFill(pdf, C.green);
  //       pdf.circle(tagX + 3.5, y - 1, 1, "F");
  //       setTxt(pdf, C.greenDark);
  //       pdf.text(label, tagX + 7, y);
  //       tagX += tw + 3;
  //     });
  //     y += 9;
  //   }

  // ── 5. SCORE CARDS ────────────────────────────────────────────────────────
  if (y > 210) {
    pdf.addPage();
    y = 20;
  }
  y = sectionHeading(
    pdf,
    "Average livability scores — all 100 cells with interventions",
    y,
    margin,
    pageWidth
  );

  let bG = 0,
    bW = 0,
    bH = 0,
    bN = 0,
    bT = 0,
    bA = 0;
  let iG = 0,
    iW = 0,
    iH = 0,
    iN = 0,
    iT = 0,
    iA = 0;

  cells.forEach((cell) => {
    bG += cell.green_space_index;
    bW += cell.walkability_score;
    bH += cell.heat_risk_score;
    bN += cell.noise_score;
    bT += cell.public_transport_score;
    bA += cell.accessibility_score;

    let g = cell.green_space_index,
      w = cell.walkability_score;
    let h = cell.heat_risk_score,
      n = cell.noise_score;
    let t = cell.public_transport_score,
      a = cell.accessibility_score;

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
    iG += g;
    iW += w;
    iH += h;
    iN += n;
    iT += t;
    iA += a;
  });

  const total = cells.length || 1;
  const scores = [
    { label: "Green space index", with: iG / total, base: bG / total, higherIsBetter: true },
    { label: "Walkability score", with: iW / total, base: bW / total, higherIsBetter: true },
    { label: "Accessibility score", with: iA / total, base: bA / total, higherIsBetter: true },
    { label: "Public transport", with: iT / total, base: bT / total, higherIsBetter: true },
    { label: "Heat risk", with: iH / total, base: bH / total, higherIsBetter: false },
    { label: "Noise score", with: iN / total, base: bN / total, higherIsBetter: false },
  ];

  const cols = 3;
  const cardW = (cw - (cols - 1) * 4) / cols;
  const cardH = 22;
  const gapR = 4;

  scores.forEach((s, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    scoreCard(
      pdf,
      margin + col * (cardW + 4),
      y + row * (cardH + gapR),
      cardW,
      cardH,
      s.label,
      parseFloat(s.with.toFixed(1)),
      parseFloat(s.base.toFixed(1)),
      s.higherIsBetter
    );
  });

  y += Math.ceil(scores.length / cols) * (cardH + gapR) + 5;

  // ── 6. BEFORE / AFTER TABLE ───────────────────────────────────────────────
  if (y > 220) {
    pdf.addPage();
    y = 20;
  }
  y = sectionHeading(pdf, "Before vs after — key score changes", y, margin, pageWidth);

  const colW = [cw * 0.4, cw * 0.18, cw * 0.24, cw * 0.18];
  const rowH = 6.5;

  setFill(pdf, C.slate100);
  pdf.rect(margin, y - 4.5, cw, rowH, "F");
  const headers = ["Indicator", "Baseline", "With interventions", "Change"];
  let hx = margin + 2;
  headers.forEach((h, i) => {
    pdf.setFontSize(6.5);
    pdf.setFont("helvetica", "bold");
    setTxt(pdf, C.slate600);
    pdf.text(h, i === 0 ? hx : hx + colW[i] - 2, y - 0.5, { align: i === 0 ? "left" : "right" });
    hx += colW[i];
  });
  y += rowH - 1.5;

  scores.forEach((s, idx) => {
    if (y > 270) {
      pdf.addPage();
      y = 20;
    }
    if (idx % 2 === 0) {
      setFill(pdf, [249, 251, 253] as [number, number, number]);
      pdf.rect(margin, y - 4.5, cw, rowH, "F");
    }
    const val = parseFloat(s.with.toFixed(1));
    const base = parseFloat(s.base.toFixed(1));
    const delta = parseFloat((val - base).toFixed(1));
    const isNeutral = Math.abs(delta) < 0.05;
    const isPositive = s.higherIsBetter ? delta > 0 : delta < 0;
    const dColor: [number, number, number] = isNeutral ? C.slate400 : isPositive ? C.green : C.red;
    const dStr = isNeutral ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`;
    const cells2 = [s.label, base.toFixed(1), val.toFixed(1), dStr];
    let rx = margin + 2;
    cells2.forEach((cell, i) => {
      pdf.setFontSize(7.5);
      pdf.setFont("helvetica", "normal");
      setTxt(pdf, i === 3 ? dColor : i === 0 ? C.slate900 : C.slate600);
      pdf.text(cell, i === 0 ? rx : rx + colW[i] - 2, y - 0.5, {
        align: i === 0 ? "left" : "right",
      });
      rx += colW[i];
    });
    setDraw(pdf, C.slate200);
    pdf.setLineWidth(0.2);
    pdf.line(margin, y + 1.5, pageWidth - margin, y + 1.5);
    y += rowH;
  });

  y += 7;

  // ── 7. AI ADVISORY — colour-coded by severity ─────────────────────────────
  if (y > 230) {
    pdf.addPage();
    y = 20;
  }
  y = sectionHeading(pdf, "AI planning advisory", y, margin, pageWidth);

  // Severity legend
  pdf.setFontSize(6.5);
  pdf.setFont("helvetica", "normal");
  const legendItems: Array<{ label: string; color: [number, number, number] }> = [
    { label: "Alert", color: C.red },
    { label: "Warning", color: C.amber },
    { label: "Recommendation", color: C.green },
  ];
  let lx = margin;
  legendItems.forEach(({ label, color }) => {
    setFill(pdf, color);
    pdf.circle(lx + 1.5, y - 1, 1.5, "F");
    setTxt(pdf, C.slate600);
    pdf.text(label, lx + 4.5, y);
    lx += pdf.getTextWidth(label) + 10;
  });
  y += 5;

  if (aiAdvices.length === 0) {
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "italic");
    setTxt(pdf, C.slate400);
    pdf.text("No advisory generated. Click 'Generate Advisory' first.", margin + 2, y, {
      maxWidth: cw,
    });
    y += 8;
  } else {
    aiAdvices.forEach((advice) => {
      const title = advice.title || "";
      const body = advice.description || advice.text || "";
      const status = advice.type || advice.status || "warning";
      y = advisoryCard(pdf, margin, pageWidth, cw, y, title, body, status);
    });
  }

  // ── 8. FOOTER ─────────────────────────────────────────────────────────────
  const totalPages = (pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    setDraw(pdf, C.slate200);
    pdf.setLineWidth(0.25);
    pdf.line(margin, 284, pageWidth - margin, 284);
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    setTxt(pdf, C.slate400);
    pdf.text("PlanLab AI  ·  CitySage Sdn. Bhd.  ·  Pilot Study", margin, 289);
    pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin, 289, { align: "right" });
  }

  pdf.save(`PlanLab_${scenarioName.replace(/\s+/g, "_")}_${Date.now()}.pdf`);
};
