import { useEffect, useMemo, useState } from "react";

const MISSIONS_KEY = "solstice-missions";
const MISSION_LOG_KEY = "solstice-mission-log";

export type Mission = { id: string; title: string };
type MissionLog = Record<string, string[]>; // dateKey -> mission ids completed

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function diffInDays(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export function Missions({
  today,
  start,
  arcStarted,
  arcLength,
}: {
  today: Date;
  start: Date;
  arcStarted: boolean;
  arcLength: number;
}) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [log, setLog] = useState<MissionLog>({});
  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    try {
      const m = localStorage.getItem(MISSIONS_KEY);
      if (m) setMissions(JSON.parse(m));
      const l = localStorage.getItem(MISSION_LOG_KEY);
      if (l) setLog(JSON.parse(l));
    } catch {
      // ignore corrupted storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(MISSIONS_KEY, JSON.stringify(missions));
    localStorage.setItem(MISSION_LOG_KEY, JSON.stringify(log));
  }, [missions, log, hydrated]);

  const todayKey = formatDate(today);
  const doneToday = useMemo(() => new Set(log[todayKey] ?? []), [log, todayKey]);

  const elapsedDays = arcStarted
    ? Math.min(arcLength, Math.max(1, diffInDays(today, start) + 1))
    : 0;

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ids of Object.values(log)) {
      for (const id of ids) counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  }, [log]);

  const addMission = () => {
    const title = draft.trim();
    if (!title) return;
    setMissions((prev) => [...prev, { id: newId(), title }]);
    setDraft("");
  };

  const saveEdit = () => {
    const title = editValue.trim();
    if (!editingId || !title) {
      setEditingId(null);
      return;
    }
    setMissions((prev) => prev.map((m) => (m.id === editingId ? { ...m, title } : m)));
    setEditingId(null);
  };

  const removeMission = (id: string) => {
    setMissions((prev) => prev.filter((m) => m.id !== id));
    setLog((prev) => {
      const next: MissionLog = {};
      for (const [k, ids] of Object.entries(prev)) {
        const filtered = ids.filter((x) => x !== id);
        if (filtered.length) next[k] = filtered;
      }
      return next;
    });
  };

  const toggleToday = (id: string) => {
    setLog((prev) => {
      const current = new Set(prev[todayKey] ?? []);
      if (current.has(id)) current.delete(id);
      else current.add(id);
      const next = { ...prev };
      if (current.size) next[todayKey] = Array.from(current);
      else delete next[todayKey];
      return next;
    });
  };

  const overall = missions.length && elapsedDays
    ? Math.round(
        (missions.reduce((sum, m) => sum + Math.min(stats[m.id] ?? 0, elapsedDays), 0) /
          (missions.length * elapsedDays)) *
          100,
      )
    : 0;

  return (
    <section className="mt-14 animate-rise [animation-delay:200ms]">
      <div className="flex items-baseline justify-between mb-5 gap-4">
        <h2 className="text-2xl font-semibold tracking-tight font-[Fraunces]">Missions</h2>
        <span className="text-xs text-warm-muted tracking-[0.15em] uppercase font-[Manrope]">
          {missions.length} active · {overall}% kept
        </span>
      </div>

      <div className="rounded-3xl bg-white/55 border border-ember/15 p-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addMission()}
            placeholder="Add a mission for the whole arc — e.g. Run 5km"
            className="flex-1 rounded-full bg-cream border border-ember/25 px-5 py-3 text-sm font-[Manrope] outline-none focus:border-ember placeholder:text-warm-muted"
          />
          <button
            onClick={addMission}
            className="rounded-full bg-ink text-cream px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] font-[Manrope] transition-transform hover:-translate-y-0.5"
          >
            Add mission
          </button>
        </div>

        {missions.length === 0 ? (
          <p className="mt-6 text-sm text-warm-muted font-[Manrope]">
            No missions yet. Add the things you want to do every single day of the arc — they will
            show up here each morning.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {missions.map((m) => {
              const kept = Math.min(stats[m.id] ?? 0, Math.max(elapsedDays, stats[m.id] ?? 0));
              const pct = elapsedDays ? Math.min(100, Math.round((kept / elapsedDays) * 100)) : 0;
              const isDone = doneToday.has(m.id);
              const isEditing = editingId === m.id;

              return (
                <li
                  key={m.id}
                  className="rounded-2xl border border-ember/15 bg-cream/60 p-4 flex flex-col gap-3"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleToday(m.id)}
                      aria-label={isDone ? `Undo ${m.title} for today` : `Mark ${m.title} done today`}
                      className={`size-8 shrink-0 rounded-full grid place-items-center text-sm font-bold transition-colors ${
                        isDone
                          ? "bg-gradient-to-br from-ember to-gold text-ink"
                          : "border border-ember/40 text-ember/60"
                      }`}
                    >
                      {isDone ? "✓" : ""}
                    </button>

                    {isEditing ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        onBlur={saveEdit}
                        className="flex-1 rounded-full bg-white border border-ember/30 px-4 py-2 text-sm font-[Manrope] outline-none"
                      />
                    ) : (
                      <p
                        className={`flex-1 text-[15px] font-[Manrope] font-semibold ${
                          isDone ? "text-ink" : "text-ink/80"
                        }`}
                      >
                        {m.title}
                      </p>
                    )}

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-ember font-bold font-[Manrope]">
                        {stats[m.id] ?? 0}
                        <span className="text-warm-muted font-medium">
                          /{elapsedDays || arcLength}
                        </span>
                      </span>
                      {!isEditing && (
                        <button
                          onClick={() => {
                            setEditingId(m.id);
                            setEditValue(m.title);
                          }}
                          className="text-[11px] uppercase tracking-[0.15em] text-warm-muted hover:text-ink font-[Manrope]"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => removeMission(m.id)}
                        className="text-[11px] uppercase tracking-[0.15em] text-warm-muted hover:text-ember font-[Manrope]"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="h-1.5 rounded-full bg-ember/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: "linear-gradient(90deg,#E08A44,#F2C078)",
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {missions.length > 0 && (
          <p className="mt-5 text-[11px] uppercase tracking-[0.15em] text-warm-muted font-[Manrope]">
            {arcStarted
              ? `Day ${elapsedDays} of ${arcLength} · ${doneToday.size}/${missions.length} done today`
              : "Missions unlock daily check-ins once the arc begins"}
          </p>
        )}
      </div>
    </section>
  );
}
