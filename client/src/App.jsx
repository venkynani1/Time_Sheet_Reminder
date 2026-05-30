// Selects the requested admin or confirmation page without an extra routing dependency.
import AppLayout from './components/AppLayout';
import ConfirmationPage from './pages/ConfirmationPage';
import Dashboard from './pages/Dashboard';
import ReminderLogs from './pages/ReminderLogs';
import Settings from './pages/Settings';
import TeamMembers from './pages/TeamMembers';

function App() {
  const path = window.location.pathname;
  const token = path.match(/^\/confirm\/([^/]+)$/)?.[1];
  if (token) return <ConfirmationPage token={token} />;

  const pages = { '/members': <TeamMembers />, '/logs': <ReminderLogs />, '/settings': <Settings /> };
  return <AppLayout>{pages[path] || <Dashboard />}</AppLayout>;
}

export default App;
