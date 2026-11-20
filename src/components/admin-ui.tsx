export function AdminTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl">{title}</h1>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-noir/60">{label}</p>
      <p className="mt-1 text-2xl font-bold text-vert">{value}</p>
      {hint && <p className="mt-1 text-xs text-noir/60">{hint}</p>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="card p-6 text-sm text-noir/70">{children}</p>;
}

export function Panel({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card p-5 ${className}`}>
      {title && <h2 className="mb-3 font-[family-name:var(--font-sans)] text-lg font-bold">{title}</h2>}
      {children}
    </section>
  );
}
