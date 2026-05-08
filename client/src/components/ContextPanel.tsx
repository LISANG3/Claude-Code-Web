import { useState, useEffect } from 'react';
import { getToken } from '../lib/api';

interface GitInfo {
  branch: string;
  files: { path: string; status: string }[];
  ahead: number;
  behind: number;
  isClean: boolean;
}

interface EnvInfo {
  os: string;
  nodeVersion: string;
  git: { branch: string; remote: string } | null;
  project: { name: string; version: string; dependencies: string[] } | null;
  claude: { model: string; maxTurns: number; maxBudgetUsd: number };
}

export default function ContextPanel() {
  const [git, setGit] = useState<GitInfo | null>(null);
  const [env, setEnv] = useState<EnvInfo | null>(null);
  const [activeSection, setActiveSection] = useState<'git' | 'env'>('git');

  useEffect(() => {
    const token = getToken();
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch('/api/git/status', { headers }).then(r => r.json()).catch(() => null),
      fetch('/api/environment', { headers }).then(r => r.json()).catch(() => null),
    ]).then(([g, e]) => { setGit(g); setEnv(e); });
  }, []);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 text-xs">
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveSection('git')}
          className={`flex-1 px-3 py-2 font-medium transition-colors ${
            activeSection === 'git'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Git
        </button>
        <button
          onClick={() => setActiveSection('env')}
          className={`flex-1 px-3 py-2 font-medium transition-colors ${
            activeSection === 'env'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          环境
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeSection === 'git' && git && (
          <>
            <div>
              <div className="text-gray-500 dark:text-gray-400 mb-1">分支</div>
              <div className="flex items-center gap-2">
                <span className="text-green-600 dark:text-green-400">🌿</span>
                <span className="font-mono text-gray-900 dark:text-white">{git.branch}</span>
                {git.ahead > 0 && <span className="text-yellow-500">↑{git.ahead}</span>}
                {git.behind > 0 && <span className="text-yellow-500">↓{git.behind}</span>}
              </div>
            </div>
            {!git.isClean && (
              <div>
                <div className="text-gray-500 dark:text-gray-400 mb-1">变更 ({git.files.length})</div>
                {git.files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 py-0.5">
                    <span className={`w-4 text-center font-mono ${
                      f.status === 'modified' ? 'text-yellow-500' :
                      f.status === 'added' ? 'text-green-500' :
                      f.status === 'deleted' ? 'text-red-500' : 'text-gray-400'
                    }`}>
                      {f.status === 'modified' ? 'M' : f.status === 'added' ? 'A' : f.status === 'deleted' ? 'D' : '?'}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300 truncate">{f.path}</span>
                  </div>
                ))}
              </div>
            )}
            {git.isClean && <div className="text-gray-400">工作区干净</div>}
          </>
        )}
        {activeSection === 'env' && env && (
          <>
            <div>
              <div className="text-gray-500 dark:text-gray-400 mb-1">系统</div>
              <div className="space-y-0.5 text-gray-700 dark:text-gray-300">
                <div>{env.os}</div>
                <div>Node {env.nodeVersion}</div>
              </div>
            </div>
            {env.project && (
              <div>
                <div className="text-gray-500 dark:text-gray-400 mb-1">项目</div>
                <div className="space-y-0.5 text-gray-700 dark:text-gray-300">
                  <div>{env.project.name} v{env.project.version}</div>
                  <div>{env.project.dependencies.length} 依赖</div>
                </div>
              </div>
            )}
            {env.git && (
              <div>
                <div className="text-gray-500 dark:text-gray-400 mb-1">Git</div>
                <div className="space-y-0.5 text-gray-700 dark:text-gray-300">
                  <div className="font-mono">{env.git.branch}</div>
                  <div className="truncate">{env.git.remote}</div>
                </div>
              </div>
            )}
            <div>
              <div className="text-gray-500 dark:text-gray-400 mb-1">Claude</div>
              <div className="space-y-0.5 text-gray-700 dark:text-gray-300">
                <div>模型: {env.claude.model}</div>
                <div>最大轮次: {env.claude.maxTurns}</div>
                <div>最大费用: ${env.claude.maxBudgetUsd}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
