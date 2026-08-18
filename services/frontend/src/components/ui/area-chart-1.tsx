import React from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  LinearXAxis,
  LinearXAxisTickSeries,
  LinearXAxisTickLabel,
  LinearYAxis,
  LinearYAxisTickSeries,
  AreaSeries,
  Area,
  Gradient,
  GradientStop,
  GridlineSeries,
  Gridline,
  type ChartDataTypes,
} from 'reaviz';

interface ChartDataPoint {
  key: Date;
  data: number | null | undefined;
}

interface ChartSeries {
  key: string;
  data: ChartDataPoint[];
}

const DiamondAlertIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M9.92844 1.25411C9.32947 1.25895 8.73263 1.49041 8.28293 1.94747L1.92062 8.41475C1.02123 9.32885 1.03336 10.8178 1.94748 11.7172L8.41476 18.0795C9.32886 18.9789 10.8178 18.9667 11.7172 18.0526L18.0795 11.5861C18.979 10.6708 18.9667 9.18232 18.0526 8.28291L11.5853 1.92061C11.1283 1.47091 10.5274 1.24926 9.92844 1.25411ZM9.93901 2.49597C10.2155 2.49373 10.4926 2.59892 10.7089 2.81172L17.1762 9.17403C17.6087 9.59962 17.6139 10.2767 17.1884 10.7097L10.8261 17.1761C10.4005 17.6087 9.72379 17.614 9.29123 17.1884L2.82394 10.826C2.39139 10.4005 2.38613 9.72378 2.81174 9.29121L9.17404 2.82393C9.38684 2.60765 9.66256 2.4982 9.93901 2.49597Z" fill="#E84045" />
  </svg>
);

const CircleAlertIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M10.0001 1.66663C5.40511 1.66663 1.66675 5.40499 1.66675 9.99996C1.66675 14.5949 5.40511 18.3333 10.0001 18.3333C14.5951 18.3333 18.3334 14.5949 18.3334 9.99996C18.3334 5.40499 14.5951 1.66663 10.0001 1.66663Z" fill="#E84045" />
  </svg>
);

const TriangleAlertIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M10.0001 2.10535C9.35241 2.10535 8.70472 2.42118 8.35459 3.05343L1.9044 14.7063C1.22414 15.9354 2.14514 17.5 3.5499 17.5H16.4511C17.8559 17.5 18.7769 15.9354 18.0966 14.7063L11.6456 3.05343C11.2955 2.42118 10.6478 2.10535 10.0001 2.10535Z" fill="#E84045" />
  </svg>
);

const UpTrendIcon: React.FC<{ baseColor: string; strokeColor: string; className?: string }> = ({
  baseColor,
  strokeColor,
  className,
}) => (
  <svg className={className} width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="14" fill={baseColor} fillOpacity="0.4" />
    <path d="M9.50134 12.6111L14.0013 8.16663M14.0013 8.16663L18.5013 12.6111M14.0013 8.16663L14.0013 19.8333" stroke={strokeColor} strokeWidth="2" strokeLinecap="square" />
  </svg>
);

const DownTrendIcon: React.FC<{ baseColor: string; strokeColor: string; className?: string }> = ({
  baseColor,
  strokeColor,
  className,
}) => (
  <svg className={className} width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="28" rx="14" fill={baseColor} fillOpacity="0.4" />
    <path d="M18.4987 15.3889L13.9987 19.8334M13.9987 19.8334L9.49866 15.3889M13.9987 19.8334V8.16671" stroke={strokeColor} strokeWidth="2" strokeLinecap="square" />
  </svg>
);

const LEGEND_ITEMS = [
  { name: 'Running', color: '#5B14C5' },
  { name: 'Pending', color: '#B58BF3' },
  { name: 'Events', color: '#DAC5F9' },
];

const now = new Date();
const generateDate = (offsetDays: number): Date => {
  const date = new Date(now);
  date.setDate(now.getDate() - offsetDays);
  return date;
};

function validateChartData(data: ChartSeries[]) {
  return data.map((series) => ({
    ...series,
    data: series.data.map((item) => ({
      ...item,
      data: typeof item.data !== 'number' || Number.isNaN(item.data) ? 0 : item.data,
    })),
  })) as unknown as ChartDataTypes[];
}

interface IncidentReportCardProps {
  runningPods?: number;
  pendingPods?: number;
  eventCount?: number;
}

export default function IncidentReportCard({
  runningPods = 6,
  pendingPods = 1,
  eventCount = 12,
}: IncidentReportCardProps) {
  const chartData = validateChartData([
    {
      key: 'Running',
      data: [6, 5, 4, 3, 2, 1, 0].map((d) => ({
        key: generateDate(d),
        data: Math.max(0, runningPods - Math.floor(d / 2)),
      })),
    },
    {
      key: 'Events',
      data: [6, 5, 4, 3, 2, 1, 0].map((d) => ({
        key: generateDate(d),
        data: Math.max(1, eventCount - d),
      })),
    },
    {
      key: 'Pending',
      data: [6, 5, 4, 3, 2, 1, 0].map((d) => ({
        key: generateDate(d),
        data: Math.max(0, pendingPods + (d % 2)),
      })),
    },
  ]);

  const metrics = [
    {
      id: 'pods',
      Icon: DiamondAlertIcon,
      label: 'Running Pods',
      value: String(runningPods),
      TrendIcon: UpTrendIcon,
      trendBaseColor: '#40E5D1',
      trendStrokeColor: '#14b8a6',
      delay: 0,
    },
    {
      id: 'pending',
      Icon: CircleAlertIcon,
      label: 'Pending Pods',
      value: String(pendingPods),
      TrendIcon: pendingPods > 0 ? UpTrendIcon : DownTrendIcon,
      trendBaseColor: pendingPods > 0 ? '#E84045' : '#40E5D1',
      trendStrokeColor: pendingPods > 0 ? '#F08083' : '#40E5D1',
      delay: 0.05,
    },
    {
      id: 'events',
      Icon: TriangleAlertIcon,
      label: 'Cluster Events',
      value: String(eventCount),
      TrendIcon: DownTrendIcon,
      trendBaseColor: '#40E5D1',
      trendStrokeColor: '#40E5D1',
      delay: 0.1,
    },
  ];

  return (
    <div className="flex w-full max-w-md flex-col overflow-hidden rounded-3xl border-2 border-zinc-900 bg-white pb-4 pt-4 shadow-[8px_8px_0_0_#18181b]">
      <h3 className="px-7 pb-6 pt-2 text-left text-2xl font-bold text-black">Cluster Report</h3>
      <div className="mb-4 flex w-full justify-between px-8">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="h-4 w-4" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-gray-500">{item.name}</span>
          </div>
        ))}
      </div>
      <div className="reaviz-chart-container h-[180px]">
        <AreaChart
          height={180}
          data={chartData as never}
          xAxis={
            <LinearXAxis
              type="time"
              tickSeries={
                <LinearXAxisTickSeries
                  label={
                    <LinearXAxisTickLabel
                      format={(v) =>
                        new Date(v as Date).toLocaleDateString('en-US', {
                          month: 'numeric',
                          day: 'numeric',
                        })
                      }
                      fill="var(--reaviz-tick-fill)"
                    />
                  }
                  tickSize={10}
                />
              }
            />
          }
          yAxis={
            <LinearYAxis
              axisLine={null}
              tickSeries={<LinearYAxisTickSeries line={null} label={null} tickSize={10} />}
            />
          }
          series={
            <AreaSeries
              type="grouped"
              interpolation="smooth"
              area={
                <Area
                  gradient={
                    <Gradient
                      stops={[
                        <GradientStop key={1} stopOpacity={0} />,
                        <GradientStop key={2} offset="100%" stopOpacity={0.4} />,
                      ]}
                    />
                  }
                />
              }
              colorScheme={['#5B14C5', '#DAC5F9', '#B58BF3']}
            />
          }
          gridlines={<GridlineSeries line={<Gridline strokeColor="var(--reaviz-gridline-stroke)" />} />}
        />
      </div>
      <div className="flex flex-col divide-y divide-gray-200 px-8 pt-6 font-mono">
        {metrics.map((metric) => (
          <motion.div
            key={metric.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: metric.delay }}
            className="flex w-full items-center gap-2 py-4"
          >
            <div className="flex w-1/2 flex-row items-center gap-2 text-base text-gray-500">
              <metric.Icon />
              <span className="truncate" title={metric.label}>
                {metric.label}
              </span>
            </div>
            <div className="flex w-1/2 items-center justify-end gap-2">
              <span className="text-xl font-semibold text-black">{metric.value}</span>
              <metric.TrendIcon baseColor={metric.trendBaseColor} strokeColor={metric.trendStrokeColor} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
