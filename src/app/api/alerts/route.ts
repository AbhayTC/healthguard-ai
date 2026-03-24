import { supabaseAdmin } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

// GET - Fetch alerts
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const district = searchParams.get("district");
    const severity = searchParams.get("severity");
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");

    let query = supabaseAdmin
      .from("alerts")
      .select("*, outbreaks(*)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (district && district !== "all") {
      query = query.eq("district", district);
    }
    if (severity && severity !== "all") {
      query = query.eq("severity", severity);
    }
    if (unreadOnly) {
      query = query.eq("is_read", false);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const unreadCount = data?.filter((a) => !a.is_read).length || 0;

    return NextResponse.json({
      data,
      count: data?.length || 0,
      unread_count: unreadCount,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Mark alert as read
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Alert ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("alerts")
      .update({ is_read: true })
      .eq("id", body.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Alert marked as read",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}