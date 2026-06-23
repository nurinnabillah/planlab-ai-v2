import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query("SELECT * FROM grid_cells ORDER BY row_num, col_num");
    return NextResponse.json({ cells: result.rows });
  } catch (error) {
    console.error("DB error:", error);
    return NextResponse.json({ error: "Failed to fetch grid" }, { status: 500 });
  }
}
