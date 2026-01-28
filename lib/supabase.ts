import { createClient, RealtimeChannel } from "@supabase/supabase-js";

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

export interface CandidateData {
    id: string;
    title: string;
    score: number;
    distance: number;
    type?: string;
    source?: string;
    prose_preview?: string;
    full_prose?: string;
    breakdown?: {
        total: number;
        dist: number;
        hist: number;
        var: number;
        heading: number;
        notes: string[];
    };
}

export interface PreprocessingInfo {
    enabled: boolean;
    model?: string;
    original_prose?: string;
    synthesized_prose?: string;
    latency_ms?: number;
}

export interface RawData {
    supabase_stories?: Array<{ name: string; prose: string; distance: number }>;
    mapkit_pois?: Array<{ name: string; type: string; distance: number }>;
    geocode?: {
        country?: string;
        city?: string;
        district?: string;
        street?: string;
    };
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
    candidates: CandidateData[] | null;
    winner_id: string | null;
    winner_title: string | null;
    winner_score: number | null;
    feedback: "like" | "dislike" | "skip" | "complete" | null;
    payload: {
        poi_count?: number;
        candidate_count?: number;
        gemini_payload_preview?: string;
        prompt_persona?: string;
        prompt_lyricism?: number;
        user_history_tags?: string[];
        preprocessing?: PreprocessingInfo;
        raw_data?: RawData;
    } | null;
}

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to real-time events for a specific session.
 * Call this and events will stream in as they're logged from the iOS app.
 */
export function subscribeToSession(
    sessionId: string,
    onEvent: (event: FoxEvent) => void
): RealtimeChannel {
    return supabase
        .channel(`session:${sessionId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'fox_events',
            filter: `session_id=eq.${sessionId}`
        }, (payload) => onEvent(payload.new as FoxEvent))
        .subscribe();
}

/**
 * Subscribe to all new sessions (for live dashboard)
 */
export function subscribeToNewSessions(
    onSession: (session: FoxSession) => void
): RealtimeChannel {
    return supabase
        .channel('new_sessions')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'fox_sessions'
        }, (payload) => onSession(payload.new as FoxSession))
        .subscribe();
}

