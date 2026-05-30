// Provides the shared admin navigation and page container.
const links = [['/', 'Dashboard'], ['/members', 'Team Members'], ['/logs', 'Reminder Logs'], ['/settings', 'Settings']];

function AppLayout({ children }) {
  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark app-navbar">
        <div className="container">
          <a className="navbar-brand fw-bold" href="/">Timesheet Reminder</a>
          <div className="navbar-nav ms-auto flex-row gap-2 gap-md-3">
            {links.map(([href, label]) => <a className={`nav-link ${window.location.pathname === href ? 'active' : ''}`} href={href} key={href}>{label}</a>)}
          </div>
        </div>
      </nav>
      <main className="container py-4 py-md-5">{children}</main>
    </>
  );
}

export default AppLayout;
