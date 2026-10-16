// ═══════════════════════════════════════════════════════════════
// App.jsx — Terminal Root Application with Theme Management
// Pure Black (#000000) & Pure White (#ffffff) Support
// ═══════════════════════════════════════════════════════════════
import { useState, useCallback, useEffect } from 'react';
import Navigation from './components/Navigation.jsx';
import Blackboard from './pages/Blackboard.jsx';
import Settings from './pages/Settings.jsx';
import AIAssistant from './components/AIAssistant.jsx';
import { useTasks } from './hooks/useTasks.js';
import { useNotifications } from './hooks/useNotifications.js';

export default function App() {
  const [activePage, setActivePage] = useState('blackboard');
  const [theme, setTheme] = useState(() => localStorage.getItem('lee_theme') || 'dark');
  const taskManager = useTasks();
  const notifications = useNotifications();
  const [toast, setToast] = useState(null);

  // Sync theme with document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('lee_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const showToast = useCallback((message, duration = 3000) => {
    setToast(message);
    setTimeout(() => setToast(null), duration);
  }, []);

  return (
    <>
      <Navigation
        activePage={activePage}
        onPageChange={setActivePage}
        stats={taskManager.stats}
        isSubscribed={notifications.isSubscribed}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSubscribe={async () => {
          const res = await notifications.subscribe();
          showToast(res?.success ? 'Notifications enabled!' : `Failed: ${res?.error}`);
        }}
      />

      <main className="main">
        {activePage === 'blackboard' && (
          <Blackboard
            taskManager={taskManager}
            showToast={showToast}
          />
        )}
        {activePage === 'settings' && (
          <Settings
            notifications={notifications}
            showToast={showToast}
            theme={theme}
            setTheme={setTheme}
          />
        )}
      </main>

      <AIAssistant
        onMutation={taskManager.fetchTasks}
        showToast={showToast}
      />

      {toast && (
        <div className="toast" onClick={() => setToast(null)}>
          {toast}
        </div>
      )}
    </>
  );
}
