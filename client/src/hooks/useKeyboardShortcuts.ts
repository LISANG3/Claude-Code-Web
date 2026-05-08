import { useEffect, useRef } from 'react';

interface ShortcutHandlers {
  onToggleSidebar?: () => void;
  onToggleTerminal?: () => void;
  onFileSearch?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'b') {
        e.preventDefault();
        handlersRef.current.onToggleSidebar?.();
      }
      if (ctrl && e.key === 'j') {
        e.preventDefault();
        handlersRef.current.onToggleTerminal?.();
      }
      if (ctrl && e.key === 'p') {
        e.preventDefault();
        handlersRef.current.onFileSearch?.();
      }
      if (e.key === 'Escape') {
        handlersRef.current.onEscape?.();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
