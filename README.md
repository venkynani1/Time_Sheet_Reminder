<!-- Explains setup and operation of the Weekly Timesheet Reminder System. -->
# Weekly Timesheet Reminder System

This full-stack app helps a team collect weekly timesheets without paid SMS. It sends reminders only to saved active members who are still pending, records delivery attempts, and gives each member a unique confirmation link.

The default provider is free SMTP email through Nodemailer. Telegram Bot reminders are optional. Twilio remains available as a future dependency but is disabled and unused by default.

## Safety

Do not spam. Add only team members who have agreed to receive reminders. The app sends only to saved active members, stops reminding a member after confirmation, and stops all reminder runs after Monday at `9:00 AM` India time.

## Weekly Reminder Logic

All scheduler jobs use the `Asia/Kolkata` timezone.

| Time | Behavior |
| --- | --- |
| Friday `5:00 PM` | Reset active members to `PENDING`, then send the first reminder |
| After Friday `5:00 PM` | Send every five hours only to pending active members |
| Monday `7:00 AM` to `9:00 AM` | Send every 30 minutes only to pending active members |
| Monday `9:00 AM` onward | Stop reminders |

Previous weekly statuses and reminder logs remain in `server/data/database.json`. A manual reset replaces only the current week's statuses.

## Pages

- **Dashboard:** summary cards, current-week status table, manual reminder run, mark submitted, and reset
- **Team Members:** add, edit, disable, or delete recipients with name, email, mobile, and optional Telegram chat ID
- **Confirmation Page:** public `http://localhost:5173/confirm/<memberToken>` link with `Yes` and `Not Yet`
- **Reminder Logs:** delivery-attempt history for enabled channels
- **Settings:** enabled-channel summary and scheduler timezone

## Setup

Install Node.js 18 or newer. Install dependencies:

```bash
cd client
npm install

cd ../server
npm install
```

Create your private backend environment file:

```powershell
cd server
Copy-Item .env.example .env
```

## Free Email Setup

SMTP email is the primary provider. Many email services provide SMTP access. For Gmail:

1. Enable two-step verification for the sender account.
2. Create a Gmail App Password.
3. Set `EMAIL_HOST=smtp.gmail.com`, `EMAIL_PORT=587`, your address as `EMAIL_USER`, the app password as `EMAIL_PASS`, and the sender label or address as `EMAIL_FROM`.

Do not commit `server/.env`.

## Optional Telegram Setup

1. Create a bot with Telegram's `@BotFather`.
2. Add the token to `TELEGRAM_BOT_TOKEN`.
3. Set `TELEGRAM_ENABLED=true`.
4. Add a Telegram chat ID to each member who should receive Telegram reminders.

Email continues to work when Telegram is disabled.

## Environment Variables

```dotenv
PORT=5000
CLIENT_URL=http://localhost:5173
APP_BASE_URL=http://localhost:5173
EMAIL_ENABLED=true
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=
TIMEZONE=Asia/Kolkata
TELEGRAM_ENABLED=false
TELEGRAM_BOT_TOKEN=
TWILIO_ENABLED=false
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

`TWILIO_ENABLED=false` is intentional. The current reminder workflow never sends SMS.

After copying `.env.example` to `.env`, add the Gmail sender address and replace the local app-password marker before using email:

```dotenv
EMAIL_USER=your-gmail-address@gmail.com
EMAIL_PASS=MANUAL_UPDATE_REQUIRED_APP_PASSWORD
EMAIL_FROM=your-gmail-address@gmail.com
```

Paste the Gmail App Password into `EMAIL_PASS` locally. Never paste it into source code, logs, chat messages, screenshots, or commits.

## Run

Start the backend:

```bash
cd server
npm run dev
```

Start the frontend in a second terminal:

```bash
cd client
npm run dev
```

Open `http://localhost:5173`.

## Deployment

### Render Backend

Create a Render Web Service from this GitHub repository:

- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`

Add these Render environment variables:

```dotenv
PORT=5000
CLIENT_URL=https://your-vercel-frontend.vercel.app
APP_BASE_URL=https://your-vercel-frontend.vercel.app
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=your_email@gmail.com
TIMEZONE=Asia/Kolkata
EMAIL_ENABLED=true
```

`CLIENT_URL` controls browser CORS access. `APP_BASE_URL` controls confirmation links in reminder emails. Set both to the deployed Vercel URL without a trailing slash.

This starter uses `server/data/database.json`. Render's filesystem is ephemeral unless you attach persistent storage. Configure a persistent disk or migrate the JSON service to a managed database before relying on production history.

### Vercel Frontend

Create a Vercel project from the same GitHub repository:

- Root directory: `client`
- Build command: `npm run build`
- Output directory: `dist`

Add this Vercel environment variable:

```dotenv
VITE_API_BASE_URL=https://your-render-backend.onrender.com
```

The included `client/vercel.json` rewrite allows deployed confirmation URLs such as `/confirm/<memberToken>` to load the React app directly.

## Confirmation Flow

Every reminder contains a member-specific link such as:

```text
http://localhost:5173/confirm/8dcbafcc-example-token
```

The page displays the member's name and asks whether the timesheet has been submitted. Choosing `Yes` stores `SUBMITTED` with a timestamp. Future reminder runs skip that member for the current week. Choosing `Not Yet` leaves the member pending.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/members` | List team members |
| `POST` | `/api/members` | Add a team member |
| `PUT` | `/api/members/:id` | Update a team member |
| `DELETE` | `/api/members/:id` | Delete a team member |
| `GET` | `/api/timesheet/current-week` | Get current weekly statuses and window state |
| `POST` | `/api/timesheet/confirm/:token` | Submit `{ "answer": "YES" }` or `{ "answer": "NOT_YET" }` |
| `POST` | `/api/timesheet/send-reminders-now` | Send reminders to pending members while the window is active |
| `POST` | `/api/timesheet/reset-week` | Reset the current weekly cycle |
| `POST` | `/api/timesheet/mark-submitted/:memberId` | Admin mark-as-submitted action |
| `GET` | `/api/timesheet/logs` | List reminder attempts |
| `GET` | `/api/timesheet/settings` | Show non-secret channel settings |
| `GET` | `/api/health` | Check SMTP configuration, scheduler state, and JSON storage access |
| `POST` | `/api/settings/test-email` | Manually send one SMTP test email using `{ "email": "recipient@example.com" }` |
| `GET` | `/api/settings/email-template` | Get the saved email template and sample preview |
| `PUT` | `/api/settings/email-template` | Save the common email template |
| `POST` | `/api/members/import` | Import members from CSV content |

The Settings page includes a **Send Test Email** form. It sends only when clicked and returns a clear validation message until the SMTP placeholders in `server/.env` are replaced.

## Editable Email Template

The Settings page includes an **Email Template** editor for the common subject and body. Scheduled and manual reminders render the saved template separately for each pending member.

Supported placeholders:

```text
{{name}}
{{confirmationLink}}
{{deadline}}
{{weekRange}}
```

The subject and body cannot be empty. The body must include `{{confirmationLink}}`. Saving without `{{name}}` is allowed but returns a personalization warning.

## CSV Team Upload

The Team Members page can bulk import a `.csv` file with this header:

```csv
name,email,mobile
Alice Example,alice@example.com,+919876543210
Bob Example,bob@example.com,+919999999999
```

Duplicate email addresses are rejected, including duplicates that differ only by capitalization.

## Security Warning

`server/.env` contains local credentials and is excluded by `.gitignore`. Never commit it. Never log, print, or expose `EMAIL_PASS`.

## Folder Structure

```text
client/src/
|-- components/
|-- pages/
|-- services/
|-- styles/
server/
|-- controllers/
|-- data/
|-- routes/
|-- services/
|-- .env.example
```
