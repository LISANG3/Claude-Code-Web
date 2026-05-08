interface Props {
  stats: { cost: number; tokens: number; duration: number };
  onClose: () => void;
}

export default function StatsPanel({ stats, onClose }: Props) {
  const durationSec = (stats.duration / 1000).toFixed(1);

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-gray-500">费用: </span>
            <span className="font-mono text-gray-900 dark:text-white">${stats.cost.toFixed(4)}</span>
          </div>
          <div>
            <span className="text-gray-500">Tokens: </span>
            <span className="font-mono text-gray-900 dark:text-white">{stats.tokens.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-500">耗时: </span>
            <span className="font-mono text-gray-900 dark:text-white">{durationSec}s</span>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
