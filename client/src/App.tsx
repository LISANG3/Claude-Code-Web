import { useState, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import SessionList from './components/SessionList';
import ChatView from './components/ChatView';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import FileSearch from './components/FileSearch';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

interface Tab {
  id: string;
  title: string;
  model?: string;
}

function AuthenticatedApp() {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [fileSearchVisible, setFileSearchVisible] = useState(false);
  const navigate = useNavigate();

  useKeyboardShortcuts({
    onToggleSidebar: useCallback(() => setSidebarVisible(v => !v), []),
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
    setTabs(prev => prev.filter(t => t.id !== id));
    if (activeTab === id) {
      const remaining = tabs.filter(t => t.id !== id);
      if (remaining.length > 0) {
        handleTabSelect(remaining[remaining.length - 1].id);
      } else {
        setActiveTab(null);
        navigate('/');
      }
    }
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
              />
            } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
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
