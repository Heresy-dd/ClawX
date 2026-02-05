/**
 * Header Component
 * Top navigation bar with page title
 */
import { useLocation } from 'react-router-dom';

// Page titles mapping
const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/chat': 'Chat',
  '/channels': 'Channels',
  '/skills': 'Skills',
  '/cron': 'Cron Tasks',
  '/settings': 'Settings',
};

export function Header() {
  const location = useLocation();
  
  // Get current page title
  const currentTitle = pageTitles[location.pathname] || 'ClawX';
  
  return (
    <header className="flex h-14 items-center border-b bg-background px-6">
      <h2 className="text-lg font-semibold">{currentTitle}</h2>
    </header>
  );
}
