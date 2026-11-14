import Badge from '../ui/Badge'

export default function RecentScenes({ scenes, onSelect }) {
  return (
    <ul className="divide-y divide-line">
      {scenes.map((d) => (
        <li key={d.id}>
          <button onClick={() => onSelect(d.id)} className="flex w-full items-center justify-between gap-3 py-3 text-left hover:text-white">
            <span>
              <span className="block text-sm text-slate-100">{d.name}</span>
              <span className="block text-xs text-slate-400">{d.acquired} · {d.direction} · {d.pols.join('/')}</span>
            </span>
            <Badge tone={d.status === 'Ready' ? 'ready' : 'processing'}>{d.status}</Badge>
          </button>
        </li>
      ))}
    </ul>
  )
}
