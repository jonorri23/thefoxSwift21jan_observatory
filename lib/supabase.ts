import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types for Fox Observatory
export interface FoxSession {
    id: string;
    device_id: string;
    device_name: string | null;
    app_version: string | null;
    started_at: string;
    ended_at: string | null;
    settings: Record<string, unknown> | null;
}

export interface FoxEvent {
    id: number;
    session_id: string;
    event_type: "pipeline" | "context_update" | "content_selected" | "user_feedback" | "error";
    timestamp: string;
    latitude: number | null;
    longitude: number | null;
    speed: number | null;
    heading: number | null;
    candidates: Array<{
        id: string;
        title: string;
        score: number;
        distance: number;
        type?: string;
        source?: string;
        breakdown?: {
            total: number;
            dist: number;
            hist: number;
            var: number;
            heading: number;
            notes: string[];
        };
    }> | null;
    winner_id: string | null;
    winner_title: string | null;
    winner_score: number | null;
    feedback: "like" | "dislike" | "skip" | "complete" | null;
    payload: Record<string, unknown> | null;
}
