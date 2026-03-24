import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// GET - Dashboard statistics
export async function GET() {
  try {
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    // Parallel fetch all stats
    const [reportsRes, outbreaksRes, alertsRes, waterRes] = await Promise.all([
      supabaseAdmin
        .from("symptom_reports")
        .select("id, district, severity, reported_at")
        .gte("reported_at", thirtyDaysAgo),
      supabaseAdmin
        .from("outbreaks")
        .select("id, district, risk_level, status, disease")
        .in("status", ["predicted", "confirmed"]),
      supabaseAdmin
        .from("alerts")
        .select("id, is_read, severity")
        .eq("is_read", false),
      supabaseAdmin
        .from("water_quality")
        .select("id, district, contamination_level")
        .gte("tested_at", thirtyDaysAgo),
    ]);

    // Count unique districts monitored
    const allDistricts = new Set([
      ...(reportsRes.data?.map((r) => r.district) || []),
      ...(outbreaksRes.data?.map((o) => o.district) || []),
      ...(waterRes.data?.map((w) => w.district) || []),
    ]);

    // Reports by district (for chart)
    const reportsByDistrict: Record<string, number> = {};
    reportsRes.data?.forEach((r) => {
      reportsByDistrict[r.district] =
        (reportsByDistrict[r.district] || 0) + 1;
    });

    // Risk distribution (for donut chart)
    const riskDistribution = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    outbreaksRes.data?.forEach((o) => {
      riskDistribution[o.risk_level as keyof typeof riskDistribution]++;
    });

    return NextResponse.json({
      total_reports: reportsRes.data?.length || 0,
      active_outbreaks: outbreaksRes.data?.length || 0,
      pending_alerts: alertsRes.data?.length || 0,
      districts_monitored: allDistricts.size,
      contaminated_sources:
        waterRes.data?.filter((w) => w.contamination_level === "danger")
          .length || 0,
      reports_by_district: reportsByDistrict,
      risk_distribution: riskDistribution,
    });
  } catch (err) {
    console.error("Stats error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}