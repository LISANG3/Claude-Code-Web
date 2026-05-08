interface Tab {
  id: string;
  title: string;
  model?: string;
}

interface Props {
  tabs: Tab[];
  activeTab: string | null;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onNewTab: () => void;
}

export default function TabBar({ tabs, activeTab, onTabSelect, onTabClose, onNewTab }: Props) {
  if (tabs.length === 0) return null;

  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 overflow-x-auto shrink-0">
      {tabs.map(tab => (
        <div
          key={tab.id}
          onClick={() => onTabSelect(tab.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer border-r border-gray-200 dark:border-gray-700 min-w-0 max-w-[180px] transition-colors ${
            activeTab === tab.id
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
              : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800/50'
          }`}
        >
          <span className="truncate flex-1">{tab.title}</span>
          {tab.model && (
            <span className="text-[10px] text-gray-400 shrink-0">{tab.model}</span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onTabClose(tab.id); }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0 ml-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
      <button
        onClick={onNewTab}
        className="px-2 py-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800/50"
        title="新建会话"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}
