"use client";

import { useEffect, useState } from "react";
import { supabase, FoxEvent } from "@/lib/supabase";

export default function LiveEventsPage() {
    const [events, setEvents] = useState<FoxEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecentEvents();

        // Set up real-time subscription
        const channel = supabase
            .channel("fox_events_realtime")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "fox_events" },
                (payload) => {
                    setEvents((prev) => [payload.new as FoxEvent, ...prev.slice(0, 99)]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function fetchRecentEvents() {
        const { data, error } = await supabase
            .from("fox_events")
            .select("*")
            .order("timestamp", { ascending: false })
            .limit(100);

        if (error) {
            console.error("Error fetching events:", error);
        } else {
            setEvents(data || []);
        }
        setLoading(false);
    }

    function getEventBadgeClass(type: string): string {
        if (type === "pipeline") return "pipeline";
        if (type === "user_feedback") return "feedback";
        if (type === "error") return "error";
        return "pipeline";
    }

    function formatTime(iso: string): string {
        return new Date(iso).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    }

    if (loading) {
        return (
            <div className="empty-state">
                <div className="empty-icon">⏳</div>
                <div className="empty-title">Connecting to live feed...</div>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 className="page-title">Live Feed</h1>
                    <p className="page-subtitle">Real-time stream of all events from all devices</p>
                </div>
                <div className="live-indicator">
                    <span className="live-dot"></span>
                    Live Connection
                </div>
            </div>

            {events.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📡</div>
                    <div className="empty-title">Waiting for events...</div>
                    <div className="empty-text">Events will appear here instantly as they happen</div>
                </div>
            ) : (
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Recent Events</span>
                        <button onClick={fetchRecentEvents} className="btn btn-secondary">↻ Sync</button>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        {events.map((event) => (
                            <div
                                key={event.id}
                                style={{
                                    padding: '1rem 1.25rem',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    animation: 'fadeIn 0.5s ease'
                                }}
                            >
                                <span className="pipeline-time" style={{ width: '80px' }}>
                                    {formatTime(event.timestamp)}
                                </span>

                                <span className={`pipeline-type-badge ${getEventBadgeClass(event.event_type)}`} style={{ minWidth: '100px', textAlign: 'center' }}>
                                    {event.event_type === 'pipeline' ? 'Pipeline' :
                                        event.event_type === 'user_feedback' ? 'Feedback' :
                                            event.event_type.replace('_', ' ')}
                                </span>

                                <div style={{ flex: 1 }}>
                                    {event.winner_title ? (
                                        <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                                            Selected: {event.winner_title}
                                        </span>
                                    ) : event.feedback ? (
                                        <span style={{ fontWeight: '500', color: 'var(--accent-green)' }}>
                                            User Feedback: {event.feedback}
                                        </span>
                                    ) : (
                                        <span style={{ color: 'var(--text-secondary)' }}>
                                            {event.event_type}
                                        </span>
                                    )}
                                </div>

                                {event.winner_score !== null && (
                                    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent-amber)', fontSize: '0.875rem' }}>
                                        {event.winner_score.toFixed(3)}
                                    </span>
                                )}

                                {event.latitude && (
                                    <span className="location-badge">
                                        Example St.
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}
