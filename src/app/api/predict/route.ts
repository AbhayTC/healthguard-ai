import { generatePrediction } from "@/lib/gemini";
import { supabaseAdmin } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { district } = await req.json();

    if (!district) {
      return NextResponse.json(
        { error: "District is required" },
        { status: 400 }
      );
    }

    // 1. Fetch recent symptom reports (last 30 days)
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: symptoms } = await supabaseAdmin
      .from("symptom_reports")
      .select("symptoms, severity, num_affected, reported_at, village")
      .eq("district", district)
      .gte("reported_at", thirtyDaysAgo)
      .order("reported_at", { ascending: false })
      .limit(100);

    // 2. Fetch water quality data
    const { data: waterData } = await supabaseAdmin
      .from("water_quality")
      .select("source_name, source_type, ph_level, turbidity, coliform_count, contamination_level, tested_at")
      .eq("district", district)
      .order("tested_at", { ascending: false })
      .limit(20);

    // 3. Fetch seasonal/historical data
    const { data: seasonal } = await supabaseAdmin
      .from("seasonal_data")
      .select("*")
      .eq("district", district)
      .order("year", { ascending: false })
      .limit(12);

    // 4. Build comprehensive AI prompt
    const prompt = `You are an expert epidemiological AI analyst for India's public health surveillance system.

TASK: Analyze the following health data for ${district} district and predict potential water-borne disease outbreaks.

=== RECENT SYMPTOM REPORTS (Last 30 days) ===
Total reports: ${symptoms?.length || 0}
${symptoms && symptoms.length > 0
  ? JSON.stringify(symptoms.slice(0, 30), null, 2)
  : "No recent reports available. Use historical and environmental data for prediction."
}

=== WATER QUALITY DATA ===
${waterData && waterData.length > 0
  ? JSON.stringify(waterData, null, 2)
  : "No recent water quality data. Consider this a risk factor — lack of monitoring."
}

=== SEASONAL & HISTORICAL DATA ===
${seasonal && seasonal.length > 0
  ? JSON.stringify(seasonal, null, 2)
  : "No seasonal data available."
}

=== ANALYSIS INSTRUCTIONS ===
Based on ALL available data, provide your prediction. Consider:
- Symptom clustering patterns and frequency
- Water contamination indicators (pH outside 6.5-8.5, high turbidity, coliform presence)
- Seasonal monsoon patterns (June-September = peak risk in India)
- Historical outbreak patterns
- If data is sparse, note this in your reasoning and provide conservative estimates

RESPOND ONLY IN THIS EXACT JSON FORMAT (no markdown, no extra text):
{
  "risk_level": "low|medium|high|critical",
  "predicted_disease": "cholera|typhoid|hepatitis_a|dysentery|gastroenteritis|dengue|malaria",
  "predicted_cases": <integer>,
  "confidence": <float 0.0 to 1.0>,
  "key_factors": ["factor1", "factor2", "factor3"],
  "recommendations": ["recommendation1", "recommendation2", "recommendation3", "recommendation4"],
  "reasoning": "Brief 2-3 sentence explanation",
  "data_quality": "good|moderate|poor",
  "time_horizon": "next 2 weeks"
}`;

    // 5. Call Gemini API
    const responseText = await generatePrediction(prompt);

    // 6. Parse response (handle potential formatting issues)
    let prediction;
    try {
      const cleaned = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      prediction = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        {
          error: "AI returned invalid format",
          raw: responseText,
        },
        { status: 500 }
      );
    }

    // 7. Store prediction in database
    const { data: outbreak } = await supabaseAdmin
      .from("outbreaks")
      .insert({
        disease: prediction.predicted_disease,
        district,
        risk_level: prediction.risk_level,
        predicted_cases: prediction.predicted_cases,
        ai_confidence: prediction.confidence,
        status: "predicted",
      })
      .select()
      .single();

    // 8. Auto-create alert if risk is high or critical
    if (["high", "critical"].includes(prediction.risk_level) && outbreak) {
      await supabaseAdmin.from("alerts").insert({
        outbreak_id: outbreak.id,
        title: `${prediction.risk_level === "critical" ? "🚨" : "⚠️"} ${prediction.risk_level.toUpperCase()} RISK: ${prediction.predicted_disease} in ${district}`,
        message: `AI predicts ~${prediction.predicted_cases} cases in the next 2 weeks (${Math.round(prediction.confidence * 100)}% confidence). Key factors: ${prediction.key_factors.join(", ")}. Recommendations: ${prediction.recommendations.join(". ")}`,
        district,
        severity: prediction.risk_level === "critical" ? "critical" : "warning",
      });
    }

    // 9. Return prediction to frontend
    return NextResponse.json({
      success: true,
      prediction,
      outbreak_id: outbreak?.id,
    });
  } catch (error) {
    console.error("Prediction error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}