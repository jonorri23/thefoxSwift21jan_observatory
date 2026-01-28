"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, FoxEvent, FoxSession, subscribeToSession, PreprocessingInfo, RawData } from "@/lib/supabase";
import { useParams } from "next/navigation";
import Link from "next/link";

interface PipelinePayload {
    poi_count?: number;
    candidate_count?: number;
    gemini_payload_preview?: string;
    prompt_persona?: string;
    prompt_lyricism?: number;
    user_history_tags?: string[];
    preprocessing?: PreprocessingInfo;
    raw_data?: RawData;
}

interface Candidate {
    id: string;
    title: string;
    score: number;
    distance: number;
    type?: string;
    source?: string;
    prose_preview?: string; // [NEW] Preview of the content
    breakdown?: {
        total: number;
        dist: number;
        hist: number;
        var: number;
        heading: number;
        notes: string[];
    };
}

export default function SessionDetailPage() {
    const { id } = useParams();
    const [session, setSession] = useState<FoxSession | null>(null);
    const [events, setEvents] = useState<FoxEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLive, setIsLive] = useState(false);

    // Callback for new events from realtime
    const handleNewEvent = useCallback((event: FoxEvent) => {
        setEvents(prev => [event, ...prev]);
    }, []);

    useEffect(() => {
        if (id) {
            fetchSessionDetails(id as string);
        }
    }, [id]);

    // Setup realtime subscription when session is active
    useEffect(() => {
        if (!session || session.ended_at) return;

        setIsLive(true);
        const channel = subscribeToSession(session.id, handleNewEvent);

        return () => {
            channel.unsubscribe();
            setIsLive(false);
        };
    }, [session, handleNewEvent]);

    async function fetchSessionDetails(sessionId: string) {
        const { data: sessionData } = await supabase
            .from("fox_sessions")
            .select("*")
            .eq("id", sessionId)
            .single();

        const { data: eventsData } = await supabase
            .from("fox_events")
            .select("*")
            .eq("session_id", sessionId)
            .order("timestamp", { ascending: false });

        setSession(sessionData);
        setEvents(eventsData || []);
        setLoading(false);
    }

    function formatTime(iso: string): string {
        return new Date(iso).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    }

    function getEventBadgeClass(type: string): string {
        if (type === "pipeline") return "pipeline";
        if (type === "user_feedback") return "feedback";
        if (type === "error") return "error";
        return "pipeline";
    }

    if (loading) {
        return (
            <div className="empty-state">
                <div className="empty-icon">⏳</div>
                <div className="empty-title">Loading session...</div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="empty-state">
                <div className="empty-icon">❓</div>
                <div className="empty-title">Session not found</div>
                <Link href="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                    ← Back to Sessions
                </Link>
            </div>
        );
    }

    return (
        <div>
            <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem' }}>
                ← Back to Sessions
            </Link>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '1rem', marginBottom: '2rem' }}>
                <div>
                    <h1 className="page-title">{session.device_name || "Unknown Device"}</h1>
                    <p className="page-subtitle" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {session.id}
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div className={`live-indicator ${session.ended_at ? '' : ''}`} style={session.ended_at ? { background: 'var(--bg-tertiary)', color: 'var(--text-muted)' } : {}}>
                        {isLive && <span className="live-dot"></span>}
                        {session.ended_at ? 'Ended' : isLive ? 'LIVE' : 'Active'}
                    </div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {events.length} pipeline events {isLive && '• Streaming'}
                    </div>
                </div>
            </div>

            {/* Session Settings */}
            {session.settings && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <div className="card-header">
                        <span className="card-title">Session Config</span>
                    </div>
                    <div className="card-body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {Object.entries(session.settings as Record<string, unknown>).map(([key, value]) => (
                            <div key={key} style={{ background: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8125rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>{key}: </span>
                                <span style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>{String(value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Pipeline Events */}
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Pipeline Events</h2>

            {events.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📡</div>
                    <div className="empty-title">No events yet</div>
                    <div className="empty-text">Events will appear as the app runs</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {events.map((event) => {
                        const payload = event.payload as PipelinePayload | null;
                        const candidates = (event.candidates || []) as Candidate[];

                        return (
                            <div key={event.id} className="pipeline-card">
                                <div className="pipeline-header">
                                    <div className="pipeline-type">
                                        <span className={`pipeline-type-badge ${getEventBadgeClass(event.event_type)}`}>
                                            {event.event_type === 'pipeline' ? '🎯 Pipeline' :
                                                event.event_type === 'user_feedback' ? '👍 Feedback' :
                                                    event.event_type === 'error' ? '❌ Error' : event.event_type}
                                        </span>
                                        {event.latitude && event.longitude && (
                                            <span className="location-badge">
                                                📍 {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                                                {event.speed !== null && event.speed > 0 && ` • ${(event.speed * 3.6).toFixed(0)} km/h`}
                                            </span>
                                        )}
                                    </div>
                                    <span className="pipeline-time">{formatTime(event.timestamp)}</span>
                                </div>

                                <div className="pipeline-body">
                                    {/* Left Column - Winner & Scoring */}
                                    <div className="pipeline-section">
                                        {event.winner_title ? (
                                            <>
                                                <span className="pipeline-section-title">Selected Content</span>
                                                <div className="pipeline-winner">
                                                    <div className="pipeline-winner-title">{event.winner_title}</div>
                                                    <div className="pipeline-winner-meta">
                                                        Score: {event.winner_score?.toFixed(3)} • ID: {event.winner_id?.slice(0, 8)}
                                                    </div>
                                                </div>
                                            </>
                                        ) : event.feedback ? (
                                            <>
                                                <span className="pipeline-section-title">User Feedback</span>
                                                <div style={{ padding: '0.75rem 1rem', background: 'rgba(81, 207, 102, 0.1)', borderRadius: '8px', color: 'var(--accent-green)', fontWeight: '500' }}>
                                                    {event.feedback.toUpperCase()}
                                                </div>
                                            </>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)' }}>No winner selected</span>
                                        )}

                                        {candidates.length > 0 && (
                                            <div style={{ marginTop: '1rem' }}>
                                                <span className="pipeline-section-title">
                                                    All Candidates ({candidates.length})
                                                </span>
                                                <div className="candidates-list">
                                                    {candidates.slice(0, 8).map((c, i) => (
                                                        <div key={i} className={`candidate-row ${c.id === event.winner_id ? 'winner' : ''}`} style={{ display: 'block', padding: '0.5rem' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                    {/* Source Badge - More descriptive */}
                                                                    <span
                                                                        title={`Source: ${c.source}${c.prose_preview ? '\n\n' + c.prose_preview : ''}`}
                                                                        style={{
                                                                            fontSize: '0.65rem',
                                                                            padding: '2px 5px',
                                                                            borderRadius: '3px',
                                                                            background: c.source?.includes('supabase') ? '#f59f00' :
                                                                                c.source?.includes('apple') ? '#74c0fc' :
                                                                                    c.source === 'unknown' ? '#868e96' : '#ced4da',
                                                                            color: '#000',
                                                                            cursor: 'help'
                                                                        }}
                                                                    >
                                                                        {c.source?.includes('supabase') ? '📖 DB' :
                                                                            c.source?.includes('apple') ? '🗺️ Map' :
                                                                                c.type ? `📍 ${c.type}` : '?'}
                                                                    </span>
                                                                    <span className="candidate-title" style={{ fontWeight: '500' }}>{c.title}</span>
                                                                </div>
                                                                <div style={{ textAlign: 'right' }}>
                                                                    <span className="candidate-score" title={JSON.stringify(c.breakdown, null, 2)} style={{ cursor: 'help' }}>{c.score.toFixed(3)}</span>
                                                                    <span className="candidate-distance" style={{ marginLeft: '8px' }}>{Math.round(c.distance)}m</span>
                                                                </div>
                                                            </div>
                                                            {/* Breakdown Mini-Vis */}
                                                            {c.breakdown && (
                                                                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                                                    <span>Dist: {(c.breakdown.dist * 0.3).toFixed(2)}</span>
                                                                    <span>Hist: {(c.breakdown.hist * 0.5).toFixed(2)}</span>
                                                                    <span>Head: {(c.breakdown.heading * 0.2).toFixed(2)}</span>
                                                                    {c.breakdown.notes.length > 0 && <span style={{ color: 'var(--accent-yellow)' }}>• {c.breakdown.notes.join(', ')}</span>}
                                                                </div>
                                                            )}
                                                            {/* Prose Preview (if available) */}
                                                            {c.prose_preview && (
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    "{c.prose_preview.slice(0, 80)}..."
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {candidates.length > 8 && (
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.5rem' }}>
                                                            +{candidates.length - 8} more candidates
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Column - Payload & Config */}
                                    <div className="pipeline-section">
                                        {payload && (
                                            <>
                                                <span className="pipeline-section-title">Pipeline Metadata</span>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                                                    <div style={{ background: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>POIs Found</div>
                                                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: '500' }}>{payload.poi_count ?? '—'}</div>
                                                    </div>
                                                    <div style={{ background: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Candidates</div>
                                                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: '500' }}>{payload.candidate_count ?? '—'}</div>
                                                    </div>
                                                    <div style={{ background: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Persona</div>
                                                        <div style={{ fontWeight: '500', color: 'var(--accent-purple)' }}>{payload.prompt_persona ?? '—'}</div>
                                                    </div>
                                                    <div style={{ background: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                                                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: '500' }}>{payload.prompt_lyricism?.toFixed(1) ?? '—'}</div>
                                                    </div>
                                                </div>

                                                {/* User History Tags */}
                                                {payload.user_history_tags && payload.user_history_tags.length > 0 && (
                                                    <div style={{ marginBottom: '1rem' }}>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>User History Tags</div>
                                                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                                            {payload.user_history_tags.map(tag => (
                                                                <span key={tag} style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Preprocessing Info (NEW) */}
                                                {payload.preprocessing && (
                                                    <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-purple)', marginBottom: '0.5rem', fontWeight: '600' }}>
                                                            🧠 Preprocessing {payload.preprocessing.enabled ? 'Active' : 'Disabled'}
                                                        </div>
                                                        {payload.preprocessing.model && (
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                                                Model: <span style={{ color: 'var(--accent-purple)' }}>{payload.preprocessing.model}</span>
                                                                {payload.preprocessing.latency_ms && ` • ${payload.preprocessing.latency_ms}ms`}
                                                            </div>
                                                        )}
                                                        {payload.preprocessing.original_prose && (
                                                            <details style={{ marginTop: '0.5rem' }}>
                                                                <summary style={{ fontSize: '0.7rem', cursor: 'pointer', color: 'var(--text-muted)' }}>Original vs Synthesized</summary>
                                                                <div style={{ marginTop: '0.5rem', display: 'grid', gap: '0.5rem' }}>
                                                                    <div style={{ fontSize: '0.65rem', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                                                                        <strong>Original:</strong> {payload.preprocessing.original_prose?.slice(0, 200)}...
                                                                    </div>
                                                                    <div style={{ fontSize: '0.65rem', padding: '0.5rem', background: 'rgba(139, 92, 246, 0.2)', borderRadius: '4px' }}>
                                                                        <strong>Synthesized:</strong> {payload.preprocessing.synthesized_prose?.slice(0, 200)}...
                                                                    </div>
                                                                </div>
                                                            </details>
                                                        )}
                                                    </div>
                                                )}

                                                {payload.gemini_payload_preview && (
                                                    <>
                                                        <span className="pipeline-section-title">Gemini Payload Preview</span>
                                                        <div className="payload-preview">
                                                            {payload.gemini_payload_preview}
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
