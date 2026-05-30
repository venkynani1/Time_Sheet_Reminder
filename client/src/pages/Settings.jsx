// Provides channel details, manual SMTP testing, and editable email templates.
import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { getEmailTemplate, getSettings, sendTestEmail, updateEmailTemplate } from '../services/api';

function Settings() {
  const [settings, setSettings] = useState(null);
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState(null);
  const [sending, setSending] = useState(false);
  const [template, setTemplate] = useState({ subject: '', body: '' });
  const [preview, setPreview] = useState({ subject: '', body: '' });
  const [templateNotice, setTemplateNotice] = useState(null);

  useEffect(() => {
    getSettings().then(setSettings);
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

  return <>
    <PageHeader eyebrow="Configuration" title="Settings" description="Channels are configured through server environment variables so secrets stay off the client." />
    <div className="row g-4">
      {[['Email via SMTP', settings?.emailEnabled, 'Primary free provider. Configure EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, and EMAIL_FROM.'], ['Telegram Bot', settings?.telegramEnabled, 'Optional free channel. Enable it only after setting a bot token and member chat IDs.'], ['Twilio SMS', settings?.twilioEnabled, 'Optional future provider. It is disabled by default and not used by the reminder workflow.']].map(([title, enabled, text]) => <div className="col-md-4" key={title}><div className="card content-card h-100"><div className="card-body p-4"><div className="d-flex justify-content-between"><h2 className="h5">{title}</h2><span className={`badge text-bg-${enabled ? 'success' : 'secondary'}`}>{enabled ? 'Enabled' : 'Disabled'}</span></div><p className="text-secondary mb-0">{text}</p></div></div></div>)}
    </div>

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

    <div className="card content-card mt-4"><div className="card-body p-4"><h2 className="h5">Send Test Email</h2><p className="text-secondary">Use this manual check after updating SMTP credentials in <code>server/.env</code>.</p>{notice && <div className={`alert alert-${notice.type}`}>{notice.text}</div>}<form className="d-flex flex-wrap gap-2" onSubmit={testEmail}><input className="form-control flex-grow-1" onChange={(event) => setEmail(event.target.value)} placeholder="recipient@example.com" type="email" value={email} /><button className="btn btn-primary" disabled={sending} type="submit">{sending ? 'Sending...' : 'Send Test Email'}</button></form></div></div>
    <div className="card content-card mt-4"><div className="card-body p-4"><h2 className="h5">Scheduler timezone</h2><p className="mb-0">All automatic reminder jobs run in <strong>{settings?.timezone || 'Asia/Kolkata'}</strong>.</p></div></div>
  </>;
}
export default Settings;
