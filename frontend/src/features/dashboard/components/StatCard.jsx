export default function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-violet-300">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  )
}
