import { NextResponse } from "next/server";
import pool from "@/lib/db";

// GET — load all saved scenarios
export async function GET() {
  try {
    const result = await pool.query("SELECT * FROM scenarios ORDER BY created_at DESC");
    return NextResponse.json({ scenarios: result.rows });
  } catch (error) {
    console.error("DB error:", error);
    return NextResponse.json({ error: "Failed to fetch scenarios" }, { status: 500 });
  }
}

// POST — save a new scenario
export async function POST(req: Request) {
  try {
    const { name, description, cellStates, summary } = await req.json();

    if (!name || !cellStates) {
      return NextResponse.json({ error: "Missing name or cellStates" }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO scenarios (name, description, cell_states, summary)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, description || "", JSON.stringify(cellStates), summary || ""]
    );

    return NextResponse.json({ scenario: result.rows[0] });
  } catch (error) {
    console.error("DB error:", error);
    return NextResponse.json({ error: "Failed to save scenario" }, { status: 500 });
  }
}
