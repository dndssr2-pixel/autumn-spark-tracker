import { useRef, useState } from "react";

const KEYS = ["solstice-logged-days", "solstice-missions", "solstice-mission-log"] as const;

type Backup = {
  app: "solstice-winter-arc";
  version: 1;
  exportedAt: string;
  data: Record<string, unknown>;
};

export function BackupRestore() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

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
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `winter-arc-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus({ kind: "ok", text: "Backup file saved to your downloads." });
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
