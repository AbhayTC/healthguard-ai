import { supabaseAdmin } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

// GET - Fetch water quality reports
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const district = searchParams.get("district");
    const limit = parseInt(searchParams.get("limit") || "50");

    let query = supabaseAdmin
      .from("water_quality")
      .select("*")
      .order("tested_at", { ascending: false })
      .limit(limit);

    if (district && district !== "all") {
      query = query.eq("district", district);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, count: data?.length || 0 });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Submit water quality report
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validation
    if (!body.source_name || !body.district) {
      return NextResponse.json(
        { error: "Source name and district are required" },
        { status: 400 }
      );
    }

    // Auto-determine contamination level if not provided
    let contamination_level = body.contamination_level || "safe";
    if (!body.contamination_level) {
      const ph = body.ph_level;
      const coliform = body.coliform_count;
      if (
        (ph && (ph < 6.0 || ph > 9.0)) ||
        (coliform && coliform > 500)
      ) {
        contamination_level = "danger";
      } else if (
        (ph && (ph < 6.5 || ph > 8.5)) ||
        (coliform && coliform > 100)
      ) {
        contamination_level = "warning";
      }
    }

    const { data, error } = await supabaseAdmin
      .from("water_quality")
      .insert({
        source_name: body.source_name,
        source_type: body.source_type || "tap",
        district: body.district,
        ph_level: body.ph_level || null,
        turbidity: body.turbidity || null,
        coliform_count: body.coliform_count || null,
        contamination_level,
        tested_by: body.tested_by || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { data, message: "Water quality report submitted" },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}