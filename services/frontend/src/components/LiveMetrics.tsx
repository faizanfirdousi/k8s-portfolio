import { Activity, Cpu, Database, Box } from 'lucide-react';
import { useMetrics } from '../hooks/useMetrics';

function formatCpu(cpuStr: string): string {
  const cpu = parseFloat(cpuStr);
  if (isNaN(cpu)) return '0m';
  if (cpu < 1) {
    return `${Math.round(cpu * 1000)}m`;
  }
  return `${cpu.toFixed(2)}`;
}

function formatMemory(memStr: string): string {
  const mem = parseFloat(memStr);
  if (isNaN(mem)) return '0 MB';
  const mb = mem / (1024 * 1024);
  if (mb > 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${Math.round(mb)} MB`;
}

export default function LiveMetrics() {
  const { metrics, loading, error } = useMetrics(5000);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 mb-6 flex items-center">
        <Activity size={16} className="mr-2" />
        Failed to load live metrics: {error}
      </div>
    );
  }

  return (
    <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Pods Card */}
      <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white/50 backdrop-blur p-4 shadow-sm transition-all hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-900">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <Box size={20} />
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Active Pods</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
              {loading && !metrics ? '...' : metrics?.totalPods || '0'}
            </h3>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          </div>
        </div>
      </div>

      {/* CPU Card */}
      <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white/50 backdrop-blur p-4 shadow-sm transition-all hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-900">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400">
          <Cpu size={20} />
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">CPU Requests</p>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
            {loading && !metrics ? '...' : formatCpu(metrics?.totalCpuRequests || '0')}
          </h3>
        </div>
      </div>

      {/* Memory Card */}
      <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white/50 backdrop-blur p-4 shadow-sm transition-all hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-900">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
          <Database size={20} />
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Memory Requests</p>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
            {loading && !metrics ? '...' : formatMemory(metrics?.totalMemoryRequests || '0')}
          </h3>
        </div>
      </div>
    </div>
  );
}
