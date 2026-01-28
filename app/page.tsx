"use client";

import { useEffect, useState } from "react";
import { supabase, FoxSession, FoxEvent } from "@/lib/supabase";
import Link from "next/link";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<FoxSession[]>([]);
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [stats, setStats] = useState({ total: 0, active: 0, events: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    // Fetch sessions
    const { data: sessionsData } = await supabase
      .from("fox_sessions")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(50);

    // Fetch event counts per session
    const { data: eventsData } = await supabase
      .from("fox_events")
      .select("session_id");

    const sessions = sessionsData || [];
    setSessions(sessions);

    // Count events per session
    const counts: Record<string, number> = {};
    (eventsData || []).forEach((e: { session_id: string }) => {
      counts[e.session_id] = (counts[e.session_id] || 0) + 1;
    });
    setEventCounts(counts);

    // Calculate stats
    const active = sessions.filter(s => !s.ended_at).length;
    setStats({
      total: sessions.length,
      active,
      events: eventsData?.length || 0
    });

    setLoading(false);
  }

  function formatDuration(start: string, end: string | null): string {
    if (!end) return "Active";
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⏳</div>
        <div className="empty-title">Loading sessions...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Pipeline Observatory</h1>
      <p className="page-subtitle">Debug the full path from GPS → Curator → Gemini</p>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon orange">📱</div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Sessions</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">🟢</div>
          <div className="stat-content">
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">Active Now</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.events}</div>
            <div className="stat-label">Pipeline Events</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">🎯</div>
          <div className="stat-content">
            <div className="stat-value">—</div>
            <div className="stat-label">Avg Score</div>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Sessions</span>
          <button onClick={fetchData} className="btn btn-secondary">↻ Refresh</button>
        </div>
        <div className="card-body">
          {sessions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <div className="empty-title">No sessions yet</div>
              <div className="empty-text">Enable analytics in The Fox app to start collecting data</div>
            </div>
          ) : (
            <div className="session-list">
              {sessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/sessions/${session.id}`}
                  className="session-row"
                >
                  <div className="session-device">
                    <span className="session-device-name">
                      {session.device_name || "Unknown Device"}
                    </span>
                    <span className="session-device-id">
                      {session.id.slice(0, 8)}
                    </span>
                  </div>
                  <span className="session-time">{formatTime(session.started_at)}</span>
                  <span className={`session-duration ${!session.ended_at ? 'active' : ''}`}>
                    {formatDuration(session.started_at, session.ended_at)}
                  </span>
                  <span className="session-events">
                    {eventCounts[session.id] || 0} events
                  </span>
                  <span className="session-arrow">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
