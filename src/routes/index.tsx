import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Solstice · Winter Arc Tracker" },
      { name: "description", content: "Track your winter arc progress from September 1st. A quiet, 120-day dashboard for habits, streaks, and momentum." },
      { property: "og:title", content: "Solstice · Winter Arc Tracker" },
      { property: "og:description", content: "Track your winter arc progress from September 1st. A quiet, 120-day dashboard for habits, streaks, and momentum." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const ARC_LENGTH_DAYS = 120;
const STORAGE_KEY = "solstice-logged-days";

function formatDate(date: Date) {
  const [year, month, day] = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ];
  return `${year}-${month}-${day}`;
}

function getArcDates(year: number) {
  const start = new Date(year, 8, 1); // Sep 1
  const end = new Date(start);
  end.setDate(end.getDate() + ARC_LENGTH_DAYS - 1);
  return { start, end };
}

function getCurrentArcYear() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const { start } = getArcDates(currentYear);
  // If we're before Sep 1, the current active arc is the previous year's.
  if (now < start) return currentYear - 1;
  return currentYear;
}

function diffInDays(a: Date, b: Date) {
  const ms = a.getTime() - b.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function computeStreak(logged: Set<string>, today: Date) {
  let streak = 0;
  const cursor = new Date(today);
  while (true) {
    const key = formatDate(cursor);
    if (logged.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function getWeekDays(anchor: Date) {
  const day = anchor.getDay();
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - ((day + 6) % 7));
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

function getWeeklyCompletion(logged: Set<string>, weekStart: Date) {
  let completed = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    if (logged.has(formatDate(d))) completed += 1;
  }
  return completed / 7;
}

function useWinterArc() {
  const [loggedDays, setLoggedDays] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setLoggedDays(new Set(JSON.parse(raw)));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(loggedDays)));
  }, [loggedDays, mounted]);

  const today = useMemo(() => new Date(), []);
  const arcYear = useMemo(getCurrentArcYear, []);
  const { start, end } = useMemo(() => getArcDates(arcYear), [arcYear]);

  const dayNumber = diffInDays(today, start) + 1;
  const arcStarted = today >= start;
  const arcFinished = today > end;
  const currentDay = arcStarted ? Math.min(dayNumber, ARC_LENGTH_DAYS) : 0;
  const progress = arcStarted ? Math.min(100, Math.max(0, (currentDay / ARC_LENGTH_DAYS) * 100)) : 0;
  const streak = computeStreak(loggedDays, today);

  const toggleToday = () => {
    const key = formatDate(today);
    setLoggedDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isTodayLogged = loggedDays.has(formatDate(today));

  return {
    today,
    arcYear,
    start,
    end,
    arcStarted,
    arcFinished,
    currentDay,
    progress,
    streak,
    loggedDays,
    isTodayLogged,
    toggleToday,
    mounted,
  };
}

function Header({ dayNumber, today }: { dayNumber: number; today: Date }) {
  const dateLabel = today.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="flex items-center justify-between animate-rise">
      <div className="flex items-center gap-3">
        <div
          className="size-9 rounded-full"
          style={{
            background: "conic-gradient(from 210deg,#E08A44,#F2C078,#FCEFD8,#E08A44)",
          }}
        />
        <div>
          <p className="font-[Manrope] text-sm font-extrabold tracking-[0.2em] uppercase">
            Solstice
          </p>
          <p className="font-[Manrope] text-[11px] text-warm-muted tracking-[0.15em] uppercase">
            Winter Arc Tracker
          </p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right hidden sm:block">
          <p className="font-[Manrope] text-[11px] text-warm-muted uppercase tracking-[0.15em]">
            {dayNumber > 0 ? `Day ${dayNumber}` : "Before the arc"}
          </p>
          <p className="font-[Manrope] text-sm font-semibold">{dateLabel}</p>
        </div>
        <div className="size-11 rounded-full grid place-items-center bg-ink text-cream text-sm font-bold">
          You
        </div>
      </div>
    </header>
  );
}

function Hero({ arcStarted, currentDay, progress, streak, arcYear }: {
  arcStarted: boolean;
  currentDay: number;
  progress: number;
  streak: number;
  arcYear: number;
}) {
  return (
    <section className="mt-14 grid grid-cols-12 gap-8 items-end animate-rise [animation-delay:80ms]">
      <div className="col-span-12 lg:col-span-7">
        <p className="text-ember text-xs font-bold uppercase tracking-[0.25em] mb-3 font-[Manrope]">
          The run begins
        </p>
        <h1 className="font-medium leading-[0.95] tracking-tight font-[Fraunces]">
          <span className="text-[56px] sm:text-[72px]">September 1st,</span>
          <br />
          <span className="italic text-[56px] sm:text-[72px] text-ember">{arcYear}</span>
        </h1>
        <p className="mt-5 text-warm-muted text-[15px] max-w-md leading-relaxed font-[Manrope]">
          One hundred and twenty days of quiet discipline, from the first cool morning to the
          shortest night. {arcStarted ? `You are on day ${currentDay}.` : "The arc has not yet begun."}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <span className="px-4 py-2 rounded-full bg-ink text-cream text-xs font-semibold tracking-wide font-[Manrope]">
            {ARC_LENGTH_DAYS} days total
          </span>
          <span className="px-4 py-2 rounded-full bg-white/60 border border-ember/30 text-ink text-xs font-semibold tracking-wide font-[Manrope]">
            {streak} day streak
          </span>
          <span className="px-4 py-2 rounded-full bg-white/60 border border-ember/30 text-ink text-xs font-semibold tracking-wide font-[Manrope]">
            {Math.round(progress)}% complete
          </span>
        </div>
      </div>
      <div className="col-span-12 lg:col-span-5">
        <div
          className="relative rounded-3xl bg-white/55 border border-ember/20 p-6"
          style={{ boxShadow: "0 30px 60px -30px rgba(224,138,68,0.5)" }}
        >
          <div className="flex items-end justify-between">
            <p className="text-xs text-warm-muted uppercase tracking-[0.2em] font-[Manrope]">
              Progress
            </p>
            <p className="text-xs text-ember font-bold font-[Manrope]">
              {arcStarted ? `Day ${currentDay} / ${ARC_LENGTH_DAYS}` : "Not started"}
            </p>
          </div>
          <div className="mt-3 flex items-end gap-1">
            <span className="font-semibold text-5xl leading-none font-[Fraunces]">
              {Math.round(progress)}
            </span>
            <span className="font-semibold text-2xl text-ember mb-1 font-[Manrope]">%</span>
            <span className="ml-2 text-xs text-warm-muted mb-1 font-[Manrope]">complete</span>
          </div>
          <div className="mt-4 h-2 rounded-full bg-cream overflow-hidden">
            <div
              className="h-full rounded-full animate-barfill"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg,#E08A44,#F2C078)",
              }}
            />
          </div>
          <div className="mt-4 flex justify-between text-[10px] uppercase tracking-[0.15em] text-warm-muted font-[Manrope]">
            <span>Sep 1</span>
            <span>Nov 15</span>
            <span>Dec 30</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function WeekCard({ date, logged, isToday, onToggle }: {
  date: Date;
  logged: boolean;
  isToday: boolean;
  onToggle?: (() => void) | undefined;
}) {
  const label = date.toLocaleDateString("en-US", { weekday: "short" });
  const dayNum = date.getDate();
  const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

  if (isToday) {
    return (
      <button
        onClick={onToggle}
        className={`rounded-2xl p-4 shadow-lg text-left transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 font-[Manrope] ${
          logged
            ? "bg-gradient-to-br from-ember to-gold text-ink"
            : "bg-gradient-to-br from-ember/80 to-gold/80 text-ink"
        }`}
      >
        <p className="text-[11px] uppercase tracking-[0.15em] opacity-70 font-semibold">Today</p>
        <p className="mt-1 text-3xl font-semibold font-[Fraunces]">{logged ? "✓" : "+1"}</p>
        <p className="text-xs font-bold">{logged ? "logged" : "tap to log"}</p>
      </button>
    );
  }

  return (
    <div
      className={`rounded-2xl border p-4 font-[Manrope] ${
        logged
          ? "bg-white/55 border-ember/15"
          : "bg-white/30 border-ember/10 opacity-70"
      }`}
    >
      <p className="text-[11px] text-warm-muted uppercase tracking-[0.15em]">{label}</p>
      <p className={`mt-1 text-3xl font-semibold font-[Fraunces] ${logged ? "text-ink" : "text-warm-muted"}`}>
        {dayNum}
      </p>
      <p className="text-xs text-ember font-semibold">
        {logged ? "kept" : isPast ? "missed" : "—"}
      </p>
    </div>
  );
}

function ThisWeek({ today, loggedDays, onToggleToday }: {
  today: Date;
  loggedDays: Set<string>;
  onToggleToday: () => void;
}) {
  const weekDays = useMemo(() => getWeekDays(today), [today]);
  const first = weekDays[0];
  const last = weekDays[6];
  const rangeLabel = first && last
    ? `${first.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${last.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : "";

  return (
    <section className="mt-14 animate-rise [animation-delay:160ms]">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-2xl font-semibold tracking-tight font-[Fraunces]">This week</h2>
        <span className="text-xs text-warm-muted tracking-[0.15em] uppercase font-[Manrope]">
          {rangeLabel}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {weekDays.map((date) => {
          const isToday = formatDate(date) === formatDate(today);
          return (
            <WeekCard
              key={formatDate(date)}
              date={date}
              logged={loggedDays.has(formatDate(date))}
              isToday={isToday}
              onToggle={isToday ? onToggleToday : undefined}
            />
          );
        })}
      </div>
    </section>
  );
}

function ArcChart({ today, start, loggedDays }: { today: Date; start: Date; loggedDays: Set<string> }) {
  const weeks = useMemo(() => {
    const bars: { label: string; completion: number }[] = [];
    for (let i = 0; i < 15; i++) {
      const weekStart = new Date(start);
      weekStart.setDate(start.getDate() + i * 7);
      const completion = getWeeklyCompletion(loggedDays, weekStart);
      const label = i % 4 === 0 ? weekStart.toLocaleDateString("en-US", { month: "short" }) : "";
      bars.push({ label, completion });
    }
    return bars;
  }, [start, loggedDays]);

  return (
    <section className="mt-14 grid grid-cols-12 gap-8 animate-rise [animation-delay:240ms]">
      <div className="col-span-12 lg:col-span-8">
        <div className="rounded-3xl bg-white/55 border border-ember/15 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold font-[Fraunces]">Your arc</h3>
            <span className="text-xs text-warm-muted font-[Manrope]">120-day runway</span>
          </div>
          <div className="h-32 rounded-2xl overflow-hidden relative bg-gradient-to-b from-sun to-cream outline outline-1 -outline-offset-1 outline-ember/10">
            <div className="absolute inset-0 flex items-end gap-[2px] px-2 pb-2">
              {weeks.map((bar, i) => {
                const isPast = i * 7 <= diffInDays(today, start);
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t transition-all duration-500"
                    style={{
                      height: `${Math.max(8, bar.completion * 100)}%`,
                      background: isPast
                        ? bar.completion > 0
                          ? "linear-gradient(180deg,#F2C078,#E08A44)"
                          : "#E08A44"
                        : "rgba(251,244,231,0.7)",
                    }}
                  />
                );
              })}
            </div>
            <span className="absolute top-2 left-3 text-[10px] uppercase tracking-[0.15em] text-ink/40 font-[Manrope]">
              logged
            </span>
          </div>
          <div className="mt-3 flex justify-between text-[10px] uppercase tracking-[0.15em] text-warm-muted font-[Manrope]">
            <span>Sep</span>
            <span>Oct</span>
            <span>Nov</span>
            <span>Dec</span>
          </div>
        </div>
      </div>
      <div className="col-span-12 lg:col-span-4">
        <div
          className="rounded-3xl bg-ink text-cream p-6 h-full"
          style={{ boxShadow: "0 30px 60px -30px rgba(60,46,32,0.6)" }}
        >
          <p className="text-gold text-xs font-bold uppercase tracking-[0.2em] font-[Manrope]">
            Milestone
          </p>
          <p className="mt-3 text-2xl font-medium leading-tight font-[Fraunces]">The Equinox</p>
          <p className="mt-2 text-cream/60 text-sm leading-relaxed font-[Manrope]">
            Around Sep 22 — the light shifts. Keep the streak alive through the shortening days.
          </p>
          <div className="mt-5 pt-5 border-t border-cream/15 text-sm text-cream/80 font-[Manrope]">
            <div className="flex justify-between">
              <span>Current streak</span>
              <span className="font-bold text-gold">{computeStreak(loggedDays, today)} days</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Countdown({ daysUntil }: { daysUntil: number }) {
  return (
    <section className="mt-14 animate-rise [animation-delay:160ms]">
      <div className="rounded-3xl bg-white/55 border border-ember/15 p-10 text-center">
        <p className="text-ember text-xs font-bold uppercase tracking-[0.25em] mb-3 font-[Manrope]">
          Before the arc
        </p>
        <h2 className="text-4xl sm:text-5xl font-medium tracking-tight font-[Fraunces]">
          Winter arc begins in <span className="italic text-ember">{daysUntil}</span> days
        </h2>
        <p className="mt-4 text-warm-muted max-w-md mx-auto font-[Manrope]">
          Come back on September 1st to start logging your first day. The dashboard will unlock
          automatically.
        </p>
      </div>
    </section>
  );
}

function Footer({ arcYear }: { arcYear: number }) {
  return (
    <footer className="mt-16 pt-8 border-t border-ember/15 flex items-center justify-between text-[11px] text-warm-muted uppercase tracking-[0.2em] font-[Manrope]">
      <span>Solstice · keep the light</span>
      <span>Sep 1 → Dec 30 · {arcYear}</span>
    </footer>
  );
}

function Index() {
  const {
    today,
    arcYear,
    start,
    arcStarted,
    currentDay,
    progress,
    streak,
    loggedDays,
    isTodayLogged,
    toggleToday,
    mounted,
  } = useWinterArc();

  const daysUntil = diffInDays(start, today);

  // Prevent hydration mismatch: render a minimal shell until client hydration completes.
  if (!mounted) {
    return (
      <div className="min-h-screen bg-cream text-ink antialiased font-[Manrope]">
        <div className="absolute top-0 left-0 w-full h-[520px] overflow-hidden pointer-events-none bg-gradient-to-b from-sun to-transparent" />
        <div className="relative max-w-6xl mx-auto px-6 py-8">
          <div className="h-8 w-40 rounded bg-ember/10 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream text-ink antialiased font-[Manrope]">
      <div className="absolute top-0 left-0 w-full h-[520px] overflow-hidden pointer-events-none bg-gradient-to-b from-sun to-transparent" />
      <div
        className="absolute -top-24 right-10 w-[360px] h-[360px] rounded-full pointer-events-none animate-floaty"
        style={{
          background: "radial-gradient(circle,rgba(242,192,120,0.65) 0%,rgba(242,192,120,0) 70%)",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6 py-8">
        <Header dayNumber={currentDay} today={today} />

        <Hero
          arcStarted={arcStarted}
          currentDay={currentDay}
          progress={progress}
          streak={streak}
          arcYear={arcYear}
        />

        {arcStarted ? (
          <>
            <ThisWeek
              today={today}
              loggedDays={loggedDays}
              onToggleToday={toggleToday}
            />
            <ArcChart today={today} start={start} loggedDays={loggedDays} />
          </>
        ) : (
          <Countdown daysUntil={daysUntil} />
        )}

        <Footer arcYear={arcYear} />
      </div>
    </div>
  );
}
