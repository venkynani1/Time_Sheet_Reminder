// Renders a consistent title and description for admin pages.
function PageHeader({ eyebrow, title, description, children }) {
  return (
    <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
      <div><p className="section-kicker">{eyebrow}</p><h1 className="h2 fw-bold mb-2">{title}</h1><p className="text-secondary mb-0">{description}</p></div>
      {children}
    </div>
  );
}
export default PageHeader;
