// Manages consented active team members and optional Telegram chat IDs.
import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { addMember, deleteMember, getMembers, importMembersCsv, updateMember } from '../services/api';

const emptyForm = { name: '', email: '', mobile: '', telegramChatId: '', active: true };
function TeamMembers() {
  const [members, setMembers] = useState([]); const [form, setForm] = useState(emptyForm); const [editingId, setEditingId] = useState(null); const [notice, setNotice] = useState(null);
  const load = useCallback(() => getMembers().then(setMembers), []); useEffect(() => { load(); }, [load]);
  const field = (name) => (event) => setForm({ ...form, [name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value });
  async function submit(event) { event.preventDefault(); try { editingId ? await updateMember(editingId, form) : await addMember(form); setForm(emptyForm); setEditingId(null); setNotice({ type: 'success', text: 'Team member saved.' }); await load(); } catch (error) { setNotice({ type: 'danger', text: error.response?.data?.error || 'Could not save member.' }); } }
  function edit(member) { setEditingId(member.id); setForm(member); }
  async function remove(id) { if (!window.confirm('Delete this team member?')) return; await deleteMember(id); await load(); }
  async function importCsv(event) { const file = event.target.files[0]; if (!file) return; try { const result = await importMembersCsv(await file.text()); setNotice({ type: 'success', text: `${result.importedCount} team member(s) imported.` }); await load(); } catch (error) { setNotice({ type: 'danger', text: error.response?.data?.error || 'Could not import CSV.' }); } finally { event.target.value = ''; } }
  return (
    <>
      <PageHeader eyebrow="Directory" title="Team Members" description="Maintain the saved recipients eligible for weekly reminders." />
      <div className="safety-note mb-4"><strong>Consent note:</strong> Add only team members who have agreed to receive timesheet reminders. Reminders are sent only to saved active members.</div>
      {notice && <div className={`alert alert-${notice.type}`}>{notice.text}</div>}
      <div className="card content-card mb-4"><div className="card-body p-4"><h2 className="h5 mb-2">Import team members</h2><p className="text-secondary mb-3">Upload a CSV file with <code>name,email,mobile</code> columns. Duplicate emails are rejected.</p><input accept=".csv,text/csv" className="form-control" onChange={importCsv} type="file" /></div></div>
      <div className="card content-card mb-4"><div className="card-body p-4"><h2 className="h5 mb-3">{editingId ? 'Edit team member' : 'Add team member'}</h2><form className="row g-3" onSubmit={submit}>
        <div className="col-md-3"><input className="form-control" placeholder="Name *" value={form.name} onChange={field('name')} /></div><div className="col-md-3"><input className="form-control" placeholder="Email *" type="email" value={form.email} onChange={field('email')} /></div><div className="col-md-2"><input className="form-control" placeholder="Mobile" value={form.mobile} onChange={field('mobile')} /></div><div className="col-md-2"><input className="form-control" placeholder="Telegram chat ID" value={form.telegramChatId} onChange={field('telegramChatId')} /></div>
        <div className="col-md-2 d-flex gap-2 align-items-center"><button className="btn btn-primary" type="submit">Save</button>{editingId && <button className="btn btn-light" onClick={() => { setEditingId(null); setForm(emptyForm); }} type="button">Cancel</button>}</div>
        <div className="col-12"><label className="form-check"><input checked={form.active} className="form-check-input" onChange={field('active')} type="checkbox" /> <span className="form-check-label">Active member</span></label></div>
      </form></div></div>
      <div className="card content-card"><div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>Name</th><th>Email</th><th>Mobile</th><th>Telegram</th><th>Active</th><th></th></tr></thead><tbody>
        {members.map((member) => <tr key={member.id}><td className="fw-semibold">{member.name}</td><td>{member.email}</td><td>{member.mobile || '-'}</td><td>{member.telegramChatId || '-'}</td><td>{member.active ? 'Yes' : 'No'}</td><td className="text-end"><button className="btn btn-sm btn-outline-primary me-2" onClick={() => edit(member)}>Edit</button><button className="btn btn-sm btn-outline-danger" onClick={() => remove(member.id)}>Delete</button></td></tr>)}
        {!members.length && <tr><td className="text-center text-secondary py-5" colSpan="6">No team members saved yet.</td></tr>}
      </tbody></table></div></div>
    </>
  );
}
export default TeamMembers;
