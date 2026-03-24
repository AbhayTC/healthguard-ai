import { supabaseAdmin } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

// GET - Fetch outbreaks
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const district = searchParams.get("district");

    let query = supabaseAdmin
      .from("outbreaks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }
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

// PATCH - Update outbreak status
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.id || !body.status) {
      return NextResponse.json(
        { error: "ID and status are required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("outbreaks")
      .update({ status: body.status })
      .eq("id", body.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}