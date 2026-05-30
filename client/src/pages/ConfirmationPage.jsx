// Lets a team member confirm submission through their unique reminder link.
import { useEffect, useState } from 'react';
import { confirmTimesheet } from '../services/api';

function ConfirmationPage({ token }) {
  const [result, setResult] = useState(null); const [error, setError] = useState(null);
  async function answer(value) { try { setResult(await confirmTimesheet(token, value)); } catch { setError('This confirmation link is invalid or inactive.'); } }
  useEffect(() => {
    confirmTimesheet(token, 'NOT_YET')
      .then(setResult)
      .catch(() => setError('This confirmation link is invalid or inactive.'));
  }, [token]);
  return <main className="confirmation-shell"><div className="card confirmation-card"><div className="card-body p-4 p-md-5">
    <p className="section-kicker">Weekly timesheet</p><h1 className="h3 mb-3">{result ? `Hello, ${result.member.name}` : 'Timesheet confirmation'}</h1>
    {error ? <div className="alert alert-danger">{error}</div> : <><p className="text-secondary">Have you submitted your timesheet?</p>{result?.status?.status === 'SUBMITTED' ? <div className="alert alert-success mb-0">Thank you. Your timesheet is marked as submitted.</div> : <div className="d-flex gap-2"><button className="btn btn-success" onClick={() => answer('YES')}>Yes</button><button className="btn btn-outline-secondary" onClick={() => answer('NOT_YET')}>Not Yet</button></div>}</>}
  </div></div></main>;
}
export default ConfirmationPage;
