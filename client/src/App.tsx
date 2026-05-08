import { useState, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import SessionList from './components/SessionList';
import ChatView from './components/ChatView';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import FileSearch from './components/FileSearch';
import ContextPanel from './components/ContextPanel';
import StatusBar from './components/StatusBar';
import Settings from './components/Settings';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

interface Tab {
  id: string;
  title: string;
  model?: string;
}

function AuthenticatedApp() {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [contextPanelVisible, setContextPanelVisible] = useState(false);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [fileSearchVisible, setFileSearchVisible] = useState(false);
  const navigate = useNavigate();

  useKeyboardShortcuts({
    onToggleSidebar: useCallback(() => setSidebarVisible(v => !v), []),
    onToggleTerminal: useCallback(() => setContextPanelVisible(v => !v), []),
    onFileSearch: useCallback(() => setFileSearchVisible(v => !v), []),
    onEscape: useCallback(() => setFileSearchVisible(false), []),
  });

  function handleNewTab() {
    navigate('/');
  }

  function handleTabSelect(id: string) {
    setActiveTab(id);
    navigate(`/chat/${id}`);
  }

  function handleTabClose(id: string) {
    setTabs(prev => {
      const remaining = prev.filter(t => t.id !== id);
      if (activeTab === id) {
        if (remaining.length > 0) {
          const nextTab = remaining[remaining.length - 1];
          setActiveTab(nextTab.id);
          navigate(`/chat/${nextTab.id}`);
        } else {
          setActiveTab(null);
          navigate('/');
        }
      }
      return remaining;
    });
  }

  function handleSessionOpen(id: string, title: string, model?: string) {
    if (!tabs.find(t => t.id === id)) {
      setTabs(prev => [...prev, { id, title, model }]);
    }
    setActiveTab(id);
  }

  return (
    <div className="h-screen flex flex-col">
      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        onTabSelect={handleTabSelect}
        onTabClose={handleTabClose}
        onNewTab={handleNewTab}
      />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          visible={sidebarVisible}
          onToggle={() => setSidebarVisible(v => !v)}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Routes>
            <Route path="/" element={
              <SessionList onSessionOpen={handleSessionOpen} />
            } />
            <Route path="/chat/:sessionId" element={
              <ChatView
                sidebarVisible={sidebarVisible}
                onToggleSidebar={() => setSidebarVisible(v => !v)}
                onSessionOpen={handleSessionOpen}
                contextPanelVisible={contextPanelVisible}
                onToggleContextPanel={() => setContextPanelVisible(v => !v)}
              />
            } />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
        {contextPanelVisible && (
          <div className="w-72 border-l border-gray-200 dark:border-gray-700 shrink-0 overflow-hidden">
            <ContextPanel />
          </div>
        )}
      </div>
      <StatusBar />
      <FileSearch
        visible={fileSearchVisible}
        onSelect={(path) => console.log('Selected file:', path)}
        onClose={() => setFileSearchVisible(false)}
      />
    </div>
  );
}

export default function App() {
  const { token } = useAuth();
  if (!token) return <Login />;
  return <AuthenticatedApp />;
}
