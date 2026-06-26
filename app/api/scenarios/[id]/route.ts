import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { cellStates, summary } = await req.json();
    const { id } = await params; // ← await params

    const result = await pool.query(
      `UPDATE scenarios SET cell_states = $1, summary = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [JSON.stringify(cellStates), summary || "", id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    return NextResponse.json({ scenario: result.rows[0] });
  } catch (error) {
    console.error("DB error:", error);
    return NextResponse.json({ error: "Failed to update scenario" }, { status: 500 });
  }
}
