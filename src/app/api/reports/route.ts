import { supabaseAdmin } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

// GET - Fetch symptom reports
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const district = searchParams.get("district");
    const limit = parseInt(searchParams.get("limit") || "50");
    const days = parseInt(searchParams.get("days") || "30");

    const sinceDate = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000
    ).toISOString();

    let query = supabaseAdmin
      .from("symptom_reports")
      .select("*")
      .gte("reported_at", sinceDate)
      .order("reported_at", { ascending: false })
      .limit(limit);

    if (district && district !== "all") {
      query = query.eq("district", district);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Reports fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, count: data?.length || 0 });
  } catch (err) {
    console.error("Reports API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Submit new symptom report
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validation
    if (!body.symptoms || body.symptoms.length === 0) {
      return NextResponse.json(
        { error: "At least one symptom is required" },
        { status: 400 }
      );
    }
    if (!body.district) {
      return NextResponse.json(
        { error: "District is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("symptom_reports")
      .insert({
        user_id: body.user_id || null,
        symptoms: body.symptoms,
        severity: body.severity || "mild",
        location_lat: body.location_lat || null,
        location_lng: body.location_lng || null,
        district: body.district,
        village: body.village || null,
        num_affected: body.num_affected || 1,
      })
      .select()
      .single();

    if (error) {
      console.error("Report insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { data, message: "Report submitted successfully" },
      { status: 201 }
    );
  } catch (err) {
    console.error("Report POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}