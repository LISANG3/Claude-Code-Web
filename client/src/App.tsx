import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import SessionList from './components/SessionList';
import ChatView from './components/ChatView';

export default function App() {
  const { token } = useAuth();

  if (!token) return <Login />;

  return (
    <div className="h-screen flex flex-col">
      <Routes>
        <Route path="/" element={<SessionList />} />
        <Route path="/chat/:sessionId" element={<ChatView />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}
