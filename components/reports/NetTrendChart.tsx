"use client";

import { useState } from "react";
import { formatKES } from "@/lib/utils";

export interface NetTrendPoint {
  dateKey: string;
  label: string;
  net: number;
}

const HEIGHT = 120;
const BAR_GAP = 3;
const MAX_BAR_WIDTH = 28;

export function NetTrendChart({ points }: { points: NetTrendPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const maxAbs = Math.max(1, ...points.map((p) => Math.abs(p.net)));
  const zeroY = HEIGHT / 2;
  const barMaxHeight = HEIGHT / 2 - 4;
  const barWidth = Math.min(
    MAX_BAR_WIDTH,
    Math.max(4, 100 / points.length - BAR_GAP)
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-2 text-[11px] font-bold text-slate-500">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-status-free" /> Positive
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-rose-600" /> Negative
        </span>
      </div>

      <div className="relative" style={{ height: HEIGHT }}>
        <svg
          viewBox={`0 0 100 ${HEIGHT}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          <line
            x1={0}
            y1={zeroY}
            x2={100}
            y2={zeroY}
            className="stroke-slate-200"
            strokeWidth={1}
          />
          {points.map((p, i) => {
            const x = (i + 0.5) * (100 / points.length);
            const h = (Math.abs(p.net) / maxAbs) * barMaxHeight;
            const y = p.net >= 0 ? zeroY - h : zeroY;
            return (
              <rect
                key={p.dateKey}
                x={x - barWidth / 2}
                y={y}
                width={barWidth}
                height={Math.max(h, 1)}
                rx={2}
                className={
                  p.net >= 0
                    ? "fill-status-free cursor-pointer"
                    : "fill-rose-600 cursor-pointer"
                }
                opacity={hovered === null || hovered === i ? 1 : 0.45}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </svg>

        {hovered !== null && points[hovered] && (
          <div
            className="absolute -top-1 -translate-y-full rounded-lg bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1.5 pointer-events-none whitespace-nowrap shadow-lg"
            style={{
              left: `${(hovered + 0.5) * (100 / points.length)}%`,
              transform: "translate(-50%, -100%)",
            }}
          >
            {points[hovered].label} · {formatKES(points[hovered].net)}
          </div>
        )}
      </div>

      <div className="flex justify-between mt-1 text-[10px] font-semibold text-slate-400">
        <span>{points[0]?.label}</span>
        {points.length > 1 && <span>{points[points.length - 1]?.label}</span>}
      </div>
    </div>
  );
}
