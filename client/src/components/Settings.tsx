import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-800">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">设置</h1>
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <section className="mb-8">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">外观</h2>
          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
            <div>
              <div className="text-sm text-gray-900 dark:text-white">主题</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">选择浅色、深色或跟随系统</div>
            </div>
            <select
              value={theme}
              onChange={e => setTheme(e.target.value as any)}
              className="text-sm bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="light">浅色</option>
              <option value="dark">深色</option>
              <option value="system">跟随系统</option>
            </select>
          </div>
        </section>
        <section className="mb-8">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">快捷键</h2>
          <div className="space-y-2">
            {[
              ['Ctrl+B', '切换侧边栏'],
              ['Ctrl+P', '文件搜索'],
              ['Ctrl+J', '切换终端视图'],
              ['Escape', '中断/关闭'],
            ].map(([key, desc]) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-700 dark:text-gray-300">{desc}</span>
                <kbd className="px-2 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400">{key}</kbd>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">账户</h2>
          <button onClick={logout} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors">
            退出登录
          </button>
        </section>
      </div>
    </div>
  );
}
