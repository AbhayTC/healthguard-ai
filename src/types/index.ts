export interface Profile {
  id: string;
  full_name: string;
  role: "admin" | "health_worker" | "public";
  district: string;
  phone: string | null;
  created_at: string;
}

export interface SymptomReport {
  id: number;
  user_id: string | null;
  symptoms: string[];
  severity: "mild" | "moderate" | "severe";
  location_lat: number | null;
  location_lng: number | null;
  district: string;
  village: string | null;
  num_affected: number;
  reported_at: string;
  profiles?: Profile;
}

export interface WaterQuality {
  id: number;
  source_name: string;
  source_type: "well" | "river" | "tap" | "borewell" | "pond";
  district: string;
  ph_level: number | null;
  turbidity: number | null;
  coliform_count: number | null;
  contamination_level: "safe" | "warning" | "danger";
  tested_by: string | null;
  tested_at: string;
}

export interface Outbreak {
  id: number;
  disease: string;
  district: string;
  risk_level: "low" | "medium" | "high" | "critical";
  predicted_cases: number;
  ai_confidence: number;
  status: "predicted" | "confirmed" | "resolved";
  created_at: string;
}

export interface Alert {
  id: number;
  outbreak_id: number | null;
  title: string;
  message: string;
  district: string;
  severity: "info" | "warning" | "critical";
  is_read: boolean;
  created_at: string;
  outbreaks?: Outbreak;
}

export interface SeasonalData {
  id: number;
  district: string;
  month: number;
  year: number;
  rainfall_mm: number;
  avg_temperature: number;
  humidity_percent: number;
  historical_cases: number;
}

export interface PredictionResult {
  risk_level: "low" | "medium" | "high" | "critical";
  predicted_disease: string;
  predicted_cases: number;
  confidence: number;
  key_factors: string[];
  recommendations: string[];
  reasoning: string;
  data_quality: "good" | "moderate" | "poor";
  time_horizon: string;
}