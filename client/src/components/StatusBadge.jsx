// Displays submitted, pending, and channel result states consistently.
function StatusBadge({ status }) {
  const style = { SUBMITTED: 'success', SENT: 'success', PENDING: 'warning', FAILED: 'danger' }[status] || 'secondary';
  return <span className={`badge rounded-pill text-bg-${style}`}>{status}</span>;
}
export default StatusBadge;
