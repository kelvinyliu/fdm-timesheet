
## Tech Stack

- **Frontend:** React 19, Vite
- **Backend:** Node.js, Express 5

## Project Structure

```
fdm-timesheet/
  client/       # React frontend (Vite)
  server/       # Node.js + Express API
```

## Getting Started

### Prerequisites

- Node.js 18+

### Server

```bash
cd server
npm install
npm run dev
```

### Client

```bash
cd client
npm install
npm run dev
```

The client runs on `http://localhost:5173` and the server on `http://localhost:3000` by default.


## User Roles

| Role | Permissions |
|---|---|
| `CONSULTANT` | Create, edit, and submit own timesheets; view submission status |
| `LINE_MANAGER` | Review, approve, or reject timesheets for assigned consultants |
| `FINANCE_MANAGER` | Access approved timesheets, set daily rate, process payment, add notes |
| `SYSTEM_ADMIN` | Create and deactivate user accounts, assign roles, view audit log |

User accounts are created by a System Administrator. There is no self-registration.

## Key Features

- Role-based access control throughout
- Weekly timesheet entry with daily hours per day
- Timesheets lock from editing once submitted
- Line managers can only act on timesheets belonging to their assigned consultants
- Mandatory rejection comments so consultants know what to fix
- Consultant can edit a rejected timesheet and resubmit
- Finance team sets a daily rate per timesheet before processing
- Full audit trail of submission, approval, rejection, and payment events
- Audit records retained for 7 years (HMRC compliance)
