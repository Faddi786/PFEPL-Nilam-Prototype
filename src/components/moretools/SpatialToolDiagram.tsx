import type { ReactNode } from "react";
import type { SpatialToolMeta } from "../../data/spatialToolCatalog";

type DiagramProps = { type: NonNullable<SpatialToolMeta["diagram"]> };

export default function SpatialToolDiagram({ type }: DiagramProps) {
  const diagrams: Record<NonNullable<SpatialToolMeta["diagram"]>, ReactNode> = {
    contains: (
      <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
        <rect x="10" y="10" width="180" height="100" fill="none" stroke="#7c3aed" strokeWidth="2" strokeDasharray="6 3" />
        <rect x="50" y="35" width="60" height="50" fill="rgba(34,197,94,0.4)" stroke="#16a34a" strokeWidth="2" />
        <text x="100" y="105" textAnchor="middle" className="fill-slate-500 text-[9px]">Parcel fully inside boundary</text>
      </svg>
    ),
    touches: (
      <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
        <rect x="30" y="30" width="55" height="60" fill="rgba(59,130,246,0.35)" stroke="#2563eb" strokeWidth="2" />
        <rect x="85" y="30" width="55" height="60" fill="rgba(234,179,8,0.35)" stroke="#ca8a04" strokeWidth="2" />
        <line x1="85" y1="30" x2="85" y2="90" stroke="#dc2626" strokeWidth="3" />
        <text x="100" y="108" textAnchor="middle" className="fill-slate-500 text-[9px]">Shared boundary edge</text>
      </svg>
    ),
    disjoint: (
      <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
        <ellipse cx="55" cy="55" rx="40" ry="30" fill="rgba(2,132,199,0.2)" stroke="#0284c7" strokeWidth="2" strokeDasharray="5 3" />
        <rect x="120" y="40" width="50" height="40" fill="rgba(34,197,94,0.4)" stroke="#16a34a" strokeWidth="2" />
        <text x="100" y="108" textAnchor="middle" className="fill-slate-500 text-[9px]">No overlap between geometries</text>
      </svg>
    ),
    crosses: (
      <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
        <rect x="50" y="25" width="100" height="70" fill="rgba(239,68,68,0.2)" stroke="#dc2626" strokeWidth="2" />
        <line x1="20" y1="60" x2="180" y2="60" stroke="#475569" strokeWidth="4" />
        <text x="100" y="108" textAnchor="middle" className="fill-slate-500 text-[9px]">Line passes through polygon</text>
      </svg>
    ),
    distance: (
      <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
        <circle cx="100" cy="55" r="45" fill="none" stroke="#ea580c" strokeWidth="2" strokeDasharray="5 3" />
        <circle cx="100" cy="55" r="4" fill="#dc2626" />
        <rect x="130" y="40" width="35" height="30" fill="rgba(249,115,22,0.4)" stroke="#ea580c" strokeWidth="2" />
        <text x="100" y="108" textAnchor="middle" className="fill-slate-500 text-[9px]">Within N meters of point</text>
      </svg>
    ),
    nearest: (
      <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
        <circle cx="40" cy="60" r="5" fill="#dc2626" />
        <rect x="90" y="45" width="40" height="35" fill="rgba(34,197,94,0.5)" stroke="#16a34a" strokeWidth="2" />
        <rect x="140" y="30" width="35" height="30" fill="rgba(148,163,184,0.3)" stroke="#64748b" strokeWidth="1" />
        <line x1="45" y1="60" x2="90" y2="62" stroke="#16a34a" strokeWidth="2" strokeDasharray="4 2" />
        <text x="100" y="108" textAnchor="middle" className="fill-slate-500 text-[9px]">Closest parcel highlighted</text>
      </svg>
    ),
    "point-in-polygon": (
      <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
        <polygon points="60,30 140,35 130,85 50,80" fill="rgba(124,58,237,0.3)" stroke="#7c3aed" strokeWidth="2" />
        <circle cx="95" cy="58" r="5" fill="#dc2626" />
        <text x="100" y="108" textAnchor="middle" className="fill-slate-500 text-[9px]">Point inside parcel polygon</text>
      </svg>
    ),
    bbox: (
      <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
        <rect x="25" y="20" width="150" height="75" fill="rgba(13,148,136,0.12)" stroke="#0d9488" strokeWidth="2" strokeDasharray="6 3" />
        <rect x="45" y="40" width="30" height="25" fill="rgba(34,197,94,0.4)" stroke="#16a34a" strokeWidth="1.5" />
        <rect x="90" y="50" width="35" height="30" fill="rgba(34,197,94,0.4)" stroke="#16a34a" strokeWidth="1.5" />
        <rect x="160" y="35" width="25" height="20" fill="rgba(148,163,184,0.2)" stroke="#94a3b8" strokeWidth="1" />
        <text x="100" y="108" textAnchor="middle" className="fill-slate-500 text-[9px]">Parcels within viewport extent</text>
      </svg>
    ),
    union: (
      <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
        <rect x="35" y="40" width="50" height="45" fill="rgba(59,130,246,0.3)" stroke="#2563eb" strokeWidth="2" />
        <rect x="75" y="40" width="50" height="45" fill="rgba(59,130,246,0.3)" stroke="#2563eb" strokeWidth="2" />
        <path d="M 120 50 L 155 50 L 155 95 L 120 95 Z" fill="rgba(34,197,94,0.35)" stroke="#16a34a" strokeWidth="2" strokeDasharray="4 2" />
        <text x="100" y="108" textAnchor="middle" className="fill-slate-500 text-[9px]">A + B → merged polygon</text>
      </svg>
    ),
    difference: (
      <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
        <rect x="40" y="30" width="90" height="60" fill="rgba(148,163,184,0.25)" stroke="#64748b" strokeWidth="2" />
        <rect x="95" y="45" width="35" height="30" fill="rgba(239,68,68,0.5)" stroke="#dc2626" strokeWidth="2" />
        <rect x="40" y="30" width="55" height="60" fill="rgba(34,197,94,0.4)" stroke="#16a34a" strokeWidth="2" />
        <text x="100" y="108" textAnchor="middle" className="fill-slate-500 text-[9px]">A minus B = net area</text>
      </svg>
    ),
    clip: (
      <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
        <rect x="20" y="15" width="160" height="90" fill="none" stroke="#7c3aed" strokeWidth="2" strokeDasharray="6 3" />
        <rect x="50" y="35" width="100" height="50" fill="rgba(13,148,136,0.35)" stroke="#0d9488" strokeWidth="2" />
        <text x="100" y="108" textAnchor="middle" className="fill-slate-500 text-[9px]">Trimmed to boundary</text>
      </svg>
    ),
    dissolve: (
      <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
        <rect x="30" y="40" width="45" height="40" fill="rgba(59,130,246,0.3)" stroke="#2563eb" strokeWidth="1.5" />
        <rect x="70" y="40" width="45" height="40" fill="rgba(59,130,246,0.3)" stroke="#2563eb" strokeWidth="1.5" />
        <rect x="130" y="35" width="55" height="50" fill="rgba(234,179,8,0.3)" stroke="#ca8a04" strokeWidth="2" strokeDasharray="5 3" />
        <text x="100" y="108" textAnchor="middle" className="fill-slate-500 text-[9px]">Same owner → one geometry</text>
      </svg>
    ),
    hull: (
      <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
        <polygon points="50,70 70,35 110,30 140,50 130,80 80,85" fill="rgba(168,85,247,0.15)" stroke="#9333ea" strokeWidth="2" strokeDasharray="6 3" />
        <rect x="65" y="45" width="25" height="20" fill="rgba(59,130,246,0.4)" stroke="#2563eb" strokeWidth="1.5" />
        <rect x="100" y="50" width="25" height="22" fill="rgba(59,130,246,0.4)" stroke="#2563eb" strokeWidth="1.5" />
        <text x="100" y="108" textAnchor="middle" className="fill-slate-500 text-[9px]">Minimum convex envelope</text>
      </svg>
    ),
    centroid: (
      <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
        <polygon points="55,35 135,40 125,85 45,80" fill="rgba(148,163,184,0.25)" stroke="#64748b" strokeWidth="2" />
        <circle cx="90" cy="60" r="5" fill="#dc2626" />
        <text x="100" y="108" textAnchor="middle" className="fill-slate-500 text-[9px]">Center point of polygon</text>
      </svg>
    ),
    "sym-diff": (
      <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
        <circle cx="75" cy="55" r="35" fill="rgba(59,130,246,0.3)" stroke="#2563eb" strokeWidth="2" />
        <circle cx="105" cy="55" r="35" fill="rgba(16,185,129,0.25)" stroke="#059669" strokeWidth="2" />
        <path d="M 75 20 A 35 35 0 0 1 75 90 A 35 35 0 0 1 60 55 Z" fill="rgba(234,179,8,0.5)" stroke="#ca8a04" strokeWidth="1.5" />
        <path d="M 120 55 A 35 35 0 0 1 105 20 A 35 35 0 0 1 105 90 Z" fill="rgba(234,179,8,0.5)" stroke="#ca8a04" strokeWidth="1.5" />
        <text x="100" y="108" textAnchor="middle" className="fill-slate-500 text-[9px]">Exclusive areas (A ⊕ B)</text>
      </svg>
    ),
    "spatial-join": (
      <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
        <rect x="15" y="20" width="80" height="80" fill="rgba(124,58,237,0.1)" stroke="#7c3aed" strokeWidth="2" strokeDasharray="5 3" />
        <rect x="110" y="25" width="75" height="70" fill="white" stroke="#e2e8f0" strokeWidth="1" />
        <text x="147" y="45" textAnchor="middle" className="fill-slate-600 text-[8px]">Survey | Village</text>
        <text x="147" y="60" textAnchor="middle" className="fill-slate-500 text-[7px]">124/2 | Khutal</text>
        <text x="147" y="73" textAnchor="middle" className="fill-slate-500 text-[7px]">128/1 | Khutal</text>
        <path d="M 95 60 L 110 60" stroke="#16a34a" strokeWidth="2" markerEnd="url(#arrow)" />
        <text x="100" y="108" textAnchor="middle" className="fill-slate-500 text-[9px]">Attach boundary attributes</text>
      </svg>
    ),
    "select-location": (
      <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
        <ellipse cx="70" cy="55" rx="45" ry="30" fill="rgba(2,132,199,0.15)" stroke="#0284c7" strokeWidth="2" strokeDasharray="5 3" />
        <rect x="55" y="42" width="30" height="25" fill="rgba(239,68,68,0.45)" stroke="#dc2626" strokeWidth="2" />
        <text x="140" y="45" className="fill-slate-600 text-[8px]">WHERE class='Private'</text>
        <text x="140" y="58" className="fill-slate-600 text-[8px]">AND in flood zone</text>
        <text x="100" y="108" textAnchor="middle" className="fill-slate-500 text-[9px]">Attribute + spatial filter</text>
      </svg>
    ),
    "k-nearest": (
      <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
        <circle cx="35" cy="60" r="5" fill="#dc2626" />
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <rect x={75 + i * 22} y={40 + (i % 2) * 15} width="18" height="16" fill={`rgba(59,130,246,${0.5 - i * 0.08})`} stroke="#2563eb" strokeWidth="1.5" />
            <text x={84 + i * 22} y={75 + (i % 2) * 15} textAnchor="middle" className="fill-slate-500 text-[7px]">{i + 1}</text>
          </g>
        ))}
        <text x="100" y="108" textAnchor="middle" className="fill-slate-500 text-[9px]">Top K ranked by distance</text>
      </svg>
    ),
    route: (
      <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
        <line x1="10" y1="60" x2="190" y2="60" stroke="#475569" strokeWidth="5" />
        <rect x="10" y="40" width="180" height="40" fill="rgba(249,115,22,0.15)" stroke="#ea580c" strokeWidth="1.5" strokeDasharray="5 3" />
        <rect x="90" y="48" width="25" height="24" fill="rgba(249,115,22,0.5)" stroke="#ea580c" strokeWidth="2" />
        <text x="100" y="108" textAnchor="middle" className="fill-slate-500 text-[9px]">Parcels along road corridor</text>
      </svg>
    ),
  };

  return (
    <div className="h-28 rounded-xl border border-slate-100 bg-slate-50/80 p-2">
      {diagrams[type]}
    </div>
  );
}
