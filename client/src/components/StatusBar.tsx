import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken } from '../lib/api';

interface Stats {
  totalSessions: number;
  totalCost: number;
  totalTurns: number;
}

export default function StatusBar() {
  const [stats, setStats] = useState<Stats | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = getToken();
    fetch('/api/sessions', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const sessions = data.sessions || [];
        setStats({
          totalSessions: sessions.length,
          totalCost: sessions.reduce((sum: number, s: any) => sum + (s.totalCostUsd || 0), 0),
          totalTurns: sessions.reduce((sum: number, s: any) => sum + (s.numTurns || 0), 0),
        });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="h-6 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center px-3 text-[11px] text-gray-500 dark:text-gray-400 shrink-0">
      <div className="flex items-center gap-4">
        <span>CCW v2</span>
        {stats && (
          <>
            <span>会话: {stats.totalSessions}</span>
            <span>轮次: {stats.totalTurns}</span>
            <span>费用: ${stats.totalCost.toFixed(4)}</span>
          </>
        )}
      </div>
      <div className="flex-1" />
      <button onClick={() => navigate('/settings')} className="hover:text-gray-700 dark:hover:text-gray-300">
        ⚙️ 设置
      </button>
    </div>
  );
}
