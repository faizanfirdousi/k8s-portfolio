import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const BAR_DATA = [
  { label: 'MON', value: 40, color: 'bg-red-400' },
  { label: 'TUE', value: 60, color: 'bg-blue-400' },
  { label: 'WED', value: 25, color: 'bg-green-400' },
  { label: 'THU', value: 80, color: 'bg-yellow-400' },
  { label: 'FRI', value: 65, color: 'bg-purple-400' },
];

function BrutalistBarChart({ podCount = 7 }: { podCount?: number }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const data = BAR_DATA.map((d, i) => ({
    ...d,
    value: Math.min(100, Math.max(15, d.value + (podCount % 3) * (i % 2 === 0 ? 5 : -3))),
  }));

  return (
    <div className="relative flex h-full min-h-[280px] w-full flex-col border-[3px] border-black bg-white p-4 shadow-[6px_6px_0_0_#000] sm:p-6">
      <h3 className="mb-4 border-b-[3px] border-black pb-2 text-lg font-black uppercase text-black">
        Pod Traffic
      </h3>
      <div className="flex min-h-[140px] flex-1 items-end justify-between gap-2">
        {data.map((item, i) => (
          <div key={i} className="group relative flex h-full flex-1 items-end">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${item.value}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 20, delay: i * 0.08 }}
              onHoverStart={() => setHovered(i)}
              onHoverEnd={() => setHovered(null)}
              className={cn(
                'relative z-10 flex w-full origin-bottom cursor-pointer items-center justify-center overflow-hidden border-[3px] border-black',
                item.color,
              )}
              whileHover={{ scaleY: 1.08, scaleX: 1.04 }}
            >
              <span className="relative z-20 font-mono text-[10px] font-bold text-black/80">{item.label}</span>
            </motion.div>
            <AnimatePresence>
              {hovered === i && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="pointer-events-none absolute bottom-full -mb-2 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap border-[3px] border-black bg-black px-2 py-1 text-xs font-black text-white"
                >
                  {item.value}%
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

const RADAR_DATA = [
  { label: 'UPTIME', value: 95, color: '#4ade80' },
  { label: 'READY', value: 85, color: '#f87171' },
  { label: 'SECURE', value: 90, color: '#60a5fa' },
  { label: 'ROUTES', value: 100, color: '#fbbf24' },
  { label: 'NODES', value: 80, color: '#a78bfa' },
];

const NUM_AXES = RADAR_DATA.length;
const RADAR_SIZE = 200;
const CENTER = RADAR_SIZE / 2;
const RADIUS = 80;

const angleToRad = (angle: number) => (Math.PI / 180) * angle;
const getCoords = (value: number, index: number) => {
  const angle = angleToRad((360 / NUM_AXES) * index - 90);
  const r = (value / 100) * RADIUS;
  return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) };
};

function BrutalistRadarChart({ readyPct = 85 }: { readyPct?: number }) {
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  const data = RADAR_DATA.map((d) =>
    d.label === 'READY' ? { ...d, value: readyPct } : d,
  );

  const pathData =
    data
      .map((d, i) => {
        const coords = getCoords(d.value, i);
        return `${i === 0 ? 'M' : 'L'} ${coords.x} ${coords.y}`;
      })
      .join(' ') + ' Z';

  return (
    <div className="relative flex h-full min-h-[280px] w-full flex-col gap-4 overflow-hidden border-[3px] border-black bg-zinc-50 p-4 shadow-[6px_6px_0_0_#000] sm:flex-row sm:p-6">
      <div className="relative flex min-h-[180px] flex-1 items-center justify-center">
        <svg viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`} className="h-full max-h-52 w-full max-w-52 overflow-visible">
          {[100, 75, 50, 25].map((level, lvlIdx) => (
            <path
              key={lvlIdx}
              d={
                data
                  .map((_, i) => {
                    const c = getCoords(level, i);
                    return `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`;
                  })
                  .join(' ') + ' Z'
              }
              fill="none"
              className="stroke-black/10"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          ))}
          {data.map((_, i) => {
            const outer = getCoords(100, i);
            return (
              <line
                key={i}
                x1={CENTER}
                y1={CENTER}
                x2={outer.x}
                y2={outer.y}
                className="stroke-black/10"
                strokeWidth="2"
              />
            );
          })}
          <motion.path
            d={pathData}
            fill="rgba(167, 139, 250, 0.5)"
            className="stroke-black"
            strokeWidth="3"
            strokeLinejoin="round"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
            style={{ originX: '50%', originY: '50%' }}
          />
        </svg>
      </div>
      <div className="z-10 flex w-full flex-col justify-center gap-1 sm:w-36">
        <h3 className="mb-1 border-b-[3px] border-black pb-2 text-lg font-black uppercase">Health</h3>
        {data.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between p-1.5 transition-colors hover:bg-white"
            onMouseEnter={() => setHoveredMetric(item.label)}
            onMouseLeave={() => setHoveredMetric(null)}
          >
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 border-2 border-black" style={{ backgroundColor: item.color }} />
              <span className="font-mono text-[10px] font-bold">{item.label}</span>
            </div>
            <span className={cn('text-sm font-black', hoveredMetric === item.label && 'text-indigo-600')}>
              {item.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface BentoDashboardProps {
  podCount?: number;
  readyPct?: number;
  compact?: boolean;
}

export default function BentoDashboard({ podCount = 7, readyPct = 85, compact = true }: BentoDashboardProps) {
  if (compact) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BrutalistBarChart podCount={podCount} />
        <BrutalistRadarChart readyPct={readyPct} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <BrutalistBarChart podCount={podCount} />
      <BrutalistRadarChart readyPct={readyPct} />
    </div>
  );
}
