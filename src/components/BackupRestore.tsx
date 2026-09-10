import { useEffect, useMemo, useRef, useState } from "react";

const KEYS = ["solstice-logged-days", "solstice-missions", "solstice-mission-log"] as const;

type Backup = {
  app: "solstice-winter-arc";
  version: 1;
  exportedAt: string;
  data: Record<string, unknown>;
};

function readStored<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function useBackupSummary() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onStorage = () => setTick((t) => t + 1);
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return useMemo(() => {
    void tick;
    const loggedDays = readStored<string[]>("solstice-logged-days") ?? [];
    const missions = readStored<{ id: string; title: string }[]>("solstice-missions") ?? [];
    const missionLog = readStored<Record<string, string[]>>("solstice-mission-log") ?? {};

    const missionCompletions = Object.values(missionLog).reduce(
      (sum, ids) => sum + ids.length,
      0,
    );

    return {
      loggedDaysCount: loggedDays.length,
      missionsCount: missions.length,
      missionCompletions,
      fileName: `winter-arc-backup-${new Date().toISOString().slice(0, 10)}.json`,
      hasData: loggedDays.length > 0 || missions.length > 0 || missionCompletions > 0,
    };
  }, [tick]);
}

export function BackupRestore() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const summary = useBackupSummary();

  const exportData = () => {
    try {
      const data: Record<string, unknown> = {};
      for (const key of KEYS) {
        const raw = localStorage.getItem(key);
        data[key] = raw ? JSON.parse(raw) : null;
      }
      const backup: Backup = {
        app: "solstice-winter-arc",
        version: 1,
        exportedAt: new Date().toISOString(),
        data,
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = summary.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus({ kind: "ok", text: `Saved ${summary.fileName} to your downloads.` });
    } catch {
      setStatus({ kind: "err", text: "Could not create the backup file." });
    }
  };

  const importData = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Backup;
      if (!parsed || parsed.app !== "solstice-winter-arc" || !parsed.data) {
        setStatus({ kind: "err", text: "That file is not a Solstice backup." });
        return;
      }
      for (const key of KEYS) {
        const value = parsed.data[key];
        if (value === null || value === undefined) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(value));
      }
      setStatus({ kind: "ok", text: "Progress restored. Reloading…" });
      setTimeout(() => window.location.reload(), 600);
    } catch {
      setStatus({ kind: "err", text: "That file could not be read." });
    }
  };

  return (
    <section className="mt-14 animate-rise [animation-delay:280ms]">
      <div className="flex items-baseline justify-between mb-5 gap-4">
        <h2 className="text-2xl font-semibold tracking-tight font-[Fraunces]">Backup &amp; restore</h2>
        <span className="text-xs text-warm-muted tracking-[0.15em] uppercase font-[Manrope]">
          Move to a new phone
        </span>
      </div>

      <div className="rounded-3xl bg-white/55 border border-ember/15 p-6">
        <p className="text-sm text-warm-muted font-[Manrope] leading-relaxed max-w-2xl">
          Save a backup file with every mission and all your daily progress. Send it to your new
          phone (email, chat, cloud drive), then open this site there and load the file — everything
          comes back exactly as it was.
        </p>

        <div className="mt-6 rounded-2xl border border-ember/15 bg-cream/60 p-5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-ink text-cream grid place-items-center text-lg">
              📦
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold font-[Manrope] text-ink truncate">
                {summary.fileName}
              </p>
              <p className="text-xs text-warm-muted font-[Manrope]">
                {summary.hasData
                  ? "This file contains everything listed below"
                  : "No progress to back up yet"}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-white/60 border border-ember/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.15em] text-warm-muted font-[Manrope]">
                Logged days
              </p>
              <p className="mt-1 text-3xl font-semibold font-[Fraunces] text-ember">
                {summary.loggedDaysCount}
              </p>
            </div>
            <div className="rounded-xl bg-white/60 border border-ember/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.15em] text-warm-muted font-[Manrope]">
                Missions saved
              </p>
              <p className="mt-1 text-3xl font-semibold font-[Fraunces] text-ember">
                {summary.missionsCount}
              </p>
            </div>
            <div className="rounded-xl bg-white/60 border border-ember/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.15em] text-warm-muted font-[Manrope]">
                Mission check-ins
              </p>
              <p className="mt-1 text-3xl font-semibold font-[Fraunces] text-ember">
                {summary.missionCompletions}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={exportData}
            className="rounded-full bg-ink text-cream px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] font-[Manrope] transition-transform hover:-translate-y-0.5"
          >
            Export my progress
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-full bg-white/70 border border-ember/30 px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] font-[Manrope] transition-transform hover:-translate-y-0.5"
          >
            Restore from file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void importData(file);
            }}
          />
        </div>

        {status && (
          <p
            className={`mt-5 text-[11px] uppercase tracking-[0.15em] font-[Manrope] ${
              status.kind === "ok" ? "text-ember" : "text-warm-muted"
            }`}
          >
            {status.text}
          </p>
        )}

        <p className="mt-5 text-[11px] uppercase tracking-[0.15em] text-warm-muted font-[Manrope]">
          Restoring replaces whatever is saved on this device
        </p>
      </div>
    </section>
  );
}
