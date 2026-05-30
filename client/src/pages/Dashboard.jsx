// Shows the current weekly cycle, summary cards, and manual admin actions.
import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { getCurrentWeek, markSubmitted, resetWeek, sendRemindersNow } from '../services/api';

const formatDate = (value) => value ? new Date(value).toLocaleString('en-IN') : 'Not yet';

function Dashboard() {
  const [week, setWeek] = useState(null); const [notice, setNotice] = useState(null); const [busy, setBusy] = useState(false);
  const load = useCallback(() => getCurrentWeek().then(setWeek).catch(() => setNotice({ type: 'danger', text: 'Could not load current-week data.' })), []);
  useEffect(() => { load(); }, [load]);
  async function action(fn, success) { setBusy(true); try { await fn(); setNotice({ type: 'success', text: success }); await load(); } catch (error) { setNotice({ type: 'danger', text: error.response?.data?.error || 'Action failed.' }); } finally { setBusy(false); } }
  const rows = week?.statuses || []; const submitted = rows.filter((row) => row.status === 'SUBMITTED').length;

  return (
    <>
      <PageHeader eyebrow="Admin dashboard" title="Weekly timesheet status" description="Track submissions and remind only active team members who are still pending.">
        <div className="d-flex gap-2"><button className="btn btn-primary" disabled={busy} onClick={() => action(sendRemindersNow, 'Reminder run completed.')}>Send Reminder Now</button><button className="btn btn-outline-secondary" disabled={busy} onClick={() => action(resetWeek, 'Current week reset.')}>Reset Current Week</button></div>
      </PageHeader>
      {notice && <div className={`alert alert-${notice.type}`}>{notice.text}</div>}
      <div className="row g-3 mb-4">
        {[['Total Members', rows.length], ['Submitted', submitted], ['Pending', rows.length - submitted], ['Reminder Window', week?.window.label || '...']].map(([label, value]) => <div className="col-6 col-lg-3" key={label}><div className="card metric-card"><div className="card-body"><p>{label}</p><strong>{value}</strong></div></div></div>)}
      </div>
      <div className="card content-card"><div className="card-body p-0"><div className="table-responsive"><table className="table align-middle mb-0">
        <thead><tr><th>Name</th><th>Email</th><th>Mobile</th><th>Status</th><th>Last Reminder</th><th>Submitted At</th><th>Count</th><th></th></tr></thead>
        <tbody>{rows.length ? rows.map((row) => <tr key={row.id}><td className="fw-semibold">{row.member.name}</td><td>{row.member.email}</td><td>{row.member.mobile || '-'}</td><td><StatusBadge status={row.status} /></td><td>{formatDate(row.lastReminderSentAt)}</td><td>{formatDate(row.submittedAt)}</td><td>{row.reminderCount}</td><td>{row.status === 'PENDING' && <button className="btn btn-sm btn-outline-success" onClick={() => action(() => markSubmitted(row.memberId), `${row.member.name} marked as submitted.`)}>Mark Submitted</button>}</td></tr>) : <tr><td className="text-center text-secondary py-5" colSpan="8">No current weekly cycle. Add members, then use Reset Current Week.</td></tr>}</tbody>
      </table></div></div></div>
    </>
  );
}
export default Dashboard;
