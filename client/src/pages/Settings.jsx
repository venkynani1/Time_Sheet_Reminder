// Provides channel details, manual Gmail API testing, and editable email templates.
import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { getEmailDiagnostics, getEmailTemplate, getSettings, getWhatsAppStatus, sendReminderTemplateTest, sendTestEmail, updateEmailTemplate } from '../services/api';

function Settings() {
  const [settings, setSettings] = useState(null);
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState(null);
  const [sending, setSending] = useState(false);
  const [template, setTemplate] = useState({ subject: '', body: '' });
  const [preview, setPreview] = useState({ subject: '', body: '' });
  const [templateNotice, setTemplateNotice] = useState(null);
  const [whatsappStatus, setWhatsappStatus] = useState(null);
  const [diagnostics, setDiagnostics] = useState([]);
  const [templateTestEmail, setTemplateTestEmail] = useState('');
  const [templateTestNotice, setTemplateTestNotice] = useState(null);
  const [sendingTemplateTest, setSendingTemplateTest] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings);
    getWhatsAppStatus().then(setWhatsappStatus);
    getEmailDiagnostics().then(setDiagnostics);
    getEmailTemplate().then((result) => { setTemplate(result.template); setPreview(result.preview); });
  }, []);

  async function testEmail(event) {
    event.preventDefault(); setSending(true); setNotice(null);
    try { setNotice({ type: 'success', text: (await sendTestEmail(email)).message }); }
    catch (error) { setNotice({ type: 'danger', text: error.response?.data?.error || 'Could not send the test email.' }); }
    finally { setSending(false); }
  }

  async function saveTemplate(event) {
    event.preventDefault(); setTemplateNotice(null);
    try {
      const result = await updateEmailTemplate(template);
      setPreview(result.preview);
      setTemplateNotice({ type: result.warnings.length ? 'warning' : 'success', text: result.warnings[0] || 'Email template saved.' });
    } catch (error) {
      setTemplateNotice({ type: 'danger', text: error.response?.data?.errors?.join(' ') || 'Could not save the email template.' });
    }
  }

  async function testReminderTemplate(event) {
    event.preventDefault(); setSendingTemplateTest(true); setTemplateTestNotice(null);
    try {
      const result = await sendReminderTemplateTest(templateTestEmail);
      setTemplateTestNotice({ type: 'success', text: result.message });
      setDiagnostics(await getEmailDiagnostics());
    } catch (error) {
      setTemplateTestNotice({ type: 'danger', text: error.response?.data?.error || 'Could not send the reminder template test.' });
    } finally { setSendingTemplateTest(false); }
  }

  return <>
    <PageHeader eyebrow="Configuration" title="Settings" description="Channels are configured through server environment variables so secrets stay off the client." />
    <div className="row g-4">
      {[['Email via Gmail API', settings?.emailEnabled, 'Primary HTTPS provider. Configure Google OAuth2 credentials and the Gmail sender address.'], ['Telegram Bot', settings?.telegramEnabled, 'Optional free channel. Enable it only after setting a bot token and member chat IDs.'], ['Twilio SMS', settings?.twilioEnabled, 'Optional future provider. It is disabled by default and not used by the reminder workflow.']].map(([title, enabled, text]) => <div className="col-md-4" key={title}><div className="card content-card h-100"><div className="card-body p-4"><div className="d-flex justify-content-between"><h2 className="h5">{title}</h2><span className={`badge text-bg-${enabled ? 'success' : 'secondary'}`}>{enabled ? 'Enabled' : 'Disabled'}</span></div><p className="text-secondary mb-0">{text}</p></div></div></div>)}
    </div>

    <div className="card content-card mt-4"><div className="card-body p-4">
      <div className="d-flex flex-wrap justify-content-between gap-3">
        <div>
          <h2 className="h5">WhatsApp</h2>
          <p className="text-secondary mb-0">Optional unofficial WhatsApp Web channel. Enable only after configuring the backend and consenting recipients.</p>
        </div>
        <div className="d-flex flex-wrap gap-2 align-items-start">
          <span className={`badge text-bg-${whatsappStatus?.enabled ? 'success' : 'secondary'}`}>{whatsappStatus?.enabled ? 'Enabled' : 'Disabled'}</span>
          <span className={`badge text-bg-${whatsappStatus?.connected ? 'success' : 'secondary'}`}>{whatsappStatus?.connected ? 'Connected' : 'Not Connected'}</span>
        </div>
      </div>
      {whatsappStatus?.lastError && <div className="alert alert-warning mt-3 mb-0">Last error: {whatsappStatus.lastError}</div>}
    </div></div>

    <div className="card content-card mt-4"><div className="card-body p-4">
      <h2 className="h5">Email Template</h2>
      <p className="text-secondary">Supported placeholders: <code>{'{{name}}'}</code>, <code>{'{{confirmationLink}}'}</code>, <code>{'{{deadline}}'}</code>, <code>{'{{weekRange}}'}</code>.</p>
      {templateNotice && <div className={`alert alert-${templateNotice.type}`}>{templateNotice.text}</div>}
      <form onSubmit={saveTemplate}>
        <label className="form-label fw-semibold" htmlFor="template-subject">Email subject</label>
        <input className="form-control mb-3" id="template-subject" onChange={(event) => setTemplate({ ...template, subject: event.target.value })} value={template.subject} />
        <label className="form-label fw-semibold" htmlFor="template-body">Email body</label>
        <textarea className="form-control mb-3" id="template-body" onChange={(event) => setTemplate({ ...template, body: event.target.value })} rows="9" value={template.body} />
        <button className="btn btn-primary" type="submit">Save Email Template</button>
      </form>
      <hr className="my-4" />
      <h3 className="h6">Preview</h3>
      <p className="small text-secondary">Sample data: Test User, Monday 9:00 AM</p>
      <div className="border rounded p-3 bg-light"><strong>{preview.subject}</strong><div className="mt-3 template-preview">{preview.body}</div></div>
    </div></div>

    <div className="card content-card mt-4"><div className="card-body p-4"><h2 className="h5">Send Test Email</h2><p className="text-secondary">Use this manual check after adding Gmail API OAuth2 credentials to <code>server/.env</code> or Render.</p>{notice && <div className={`alert alert-${notice.type}`}>{notice.text}</div>}<form className="d-flex flex-wrap gap-2" onSubmit={testEmail}><input className="form-control flex-grow-1" onChange={(event) => setEmail(event.target.value)} placeholder="recipient@example.com" type="email" value={email} /><button className="btn btn-primary" disabled={sending} type="submit">{sending ? 'Sending...' : 'Send Test Email'}</button></form></div></div>
    <div className="card content-card mt-4"><div className="card-body p-4">
      <div className="d-flex flex-wrap justify-content-between gap-3 mb-3"><div><h2 className="h5">Email Diagnostics</h2><p className="text-secondary mb-0">Inspect recent Gmail API reminder sends and send the current reminder template to a test inbox.</p></div><button className="btn btn-outline-secondary" onClick={() => getEmailDiagnostics().then(setDiagnostics)} type="button">Refresh</button></div>
      {templateTestNotice && <div className={`alert alert-${templateTestNotice.type}`}>{templateTestNotice.text}</div>}
      <form className="d-flex flex-wrap gap-2 mb-4" onSubmit={testReminderTemplate}><input className="form-control flex-grow-1" onChange={(event) => setTemplateTestEmail(event.target.value)} placeholder="recipient@example.com" type="email" value={templateTestEmail} /><button className="btn btn-primary" disabled={sendingTemplateTest} type="submit">{sendingTemplateTest ? 'Sending...' : 'Send Same Reminder Template Test'}</button></form>
      <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>Sent At</th><th>Member</th><th>Recipient</th><th>Subject</th><th>Status</th><th>Gmail Message</th><th>Error</th></tr></thead><tbody>{diagnostics.map((log) => <tr key={`${log.sentAt}-${log.gmailMessageId || log.recipientEmail}`}><td>{new Date(log.sentAt).toLocaleString('en-IN')}</td><td>{log.memberName || 'Diagnostic test'}</td><td>{log.recipientEmail || '-'}</td><td className="small">{log.subject || '-'}</td><td>{log.status}</td><td className="small">{log.gmailMessageId || '-'}<br />{log.gmailThreadId || '-'}</td><td className="text-danger small">{log.error || '-'}</td></tr>)}{!diagnostics.length && <tr><td className="text-center text-secondary py-4" colSpan="7">No email diagnostics recorded yet.</td></tr>}</tbody></table></div>
    </div></div>
    <div className="card content-card mt-4"><div className="card-body p-4"><h2 className="h5">Scheduler timezone</h2><p className="mb-0">All automatic reminder jobs run in <strong>{settings?.timezone || 'Asia/Kolkata'}</strong>.</p></div></div>
  </>;
}
export default Settings;
