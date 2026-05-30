// Lists delivery attempts for email and optional channels.
import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader'; import StatusBadge from '../components/StatusBadge'; import { getLogs } from '../services/api';
function ReminderLogs() {
  const [logs, setLogs] = useState([]); const load = useCallback(() => getLogs().then(setLogs), []); useEffect(() => { load(); }, [load]);
  return <><PageHeader eyebrow="Audit trail" title="Reminder Logs" description="Review every delivery attempt across enabled channels."><button className="btn btn-outline-secondary" onClick={load}>Refresh</button></PageHeader><div className="card content-card"><div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>Sent At</th><th>Member</th><th>Channel</th><th>Status</th><th>Error</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td>{new Date(log.sentAt).toLocaleString('en-IN')}</td><td>{log.member?.name || 'Deleted member'}</td><td>{log.channel}</td><td><StatusBadge status={log.status} /></td><td className="text-danger small">{log.error || '-'}</td></tr>)}{!logs.length && <tr><td className="text-center text-secondary py-5" colSpan="5">No reminder attempts recorded yet.</td></tr>}</tbody></table></div></div></>;
}
export default ReminderLogs;
