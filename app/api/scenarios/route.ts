import { NextResponse } from "next/server";
import pool from "@/lib/db";

// GET — load all saved scenarios filtered by user
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    const result = await pool.query(
      "SELECT * FROM scenarios WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    return NextResponse.json({ scenarios: result.rows });
  } catch (error) {
    console.error("DB error:", error);
    return NextResponse.json({ error: "Failed to fetch scenarios" }, { status: 500 });
  }
}

// POST — save a new scenario
export async function POST(req: Request) {
  try {
    const { name, description, cellStates, summary, userId } = await req.json();

    if (!name || !cellStates) {
      return NextResponse.json({ error: "Missing name or cellStates" }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO scenarios (name, description, cell_states, summary, user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description || "", JSON.stringify(cellStates), summary || "", userId || null]
    );

    return NextResponse.json({ scenario: result.rows[0] });
  } catch (error) {
    console.error("DB error:", error);
    return NextResponse.json({ error: "Failed to save scenario" }, { status: 500 });
  }
}
