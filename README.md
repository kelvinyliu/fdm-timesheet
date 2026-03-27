
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

## API Reference

All endpoints are prefixed with `/api`. Protected endpoints require an `Authorization: Bearer <token>` header. Tokens are obtained from `POST /api/auth/login`.

### Auth

#### `POST /api/auth/login`
Public. Authenticates a user and returns a JWT.

**Request body**
| Field | Type | Required |
|---|---|---|
| `email` | string | yes |
| `password` | string | yes |

**Response `200`**
```json
{
  "token": "<jwt>",
  "user": { "id": "uuid", "name": "string", "email": "string", "role": "CONSULTANT", "createdAt": "iso8601" }
}
```

**Errors:** `400` missing fields · `401` invalid credentials

#### `POST /api/auth/change-password`
Requires authentication. Changes the current user's password.

**Request body**
| Field | Type | Required |
|---|---|---|
| `currentPassword` | string | yes |
| `newPassword` | string (min 8 chars) | yes |

**Response `204`** — no content

**Errors:** `400` missing fields or password too short · `401` current password incorrect

---

### Users
All routes require `SYSTEM_ADMIN`.

#### `GET /api/users`
Returns all users.

**Response `200`** — array of user objects `{ id, name, email, role, createdAt }`

#### `POST /api/users`
Creates a new user account.

**Request body**
| Field | Type | Required |
|---|---|---|
| `name` | string | yes |
| `email` | string | yes |
| `password` | string | yes |
| `role` | `CONSULTANT` \| `LINE_MANAGER` \| `FINANCE_MANAGER` \| `SYSTEM_ADMIN` | yes |

**Response `201`** — created user object

**Errors:** `400` missing/invalid fields · `409` email already in use

#### `PATCH /api/users/:id/role`
Updates a user's role. Cannot change your own role.

**Request body**
| Field | Type | Required |
|---|---|---|
| `role` | `CONSULTANT` \| `LINE_MANAGER` \| `FINANCE_MANAGER` \| `SYSTEM_ADMIN` | yes |

**Response `200`** — updated user object

**Errors:** `400` invalid role or self-change attempt · `404` user not found

#### `DELETE /api/users/:id`
Deletes a user. Cannot delete your own account.

**Response `204`** — no content

**Errors:** `400` self-delete attempt · `404` user not found

---

### Client Assignments

#### `GET /api/assignments`
Requires `CONSULTANT`. Returns the caller's client assignments.

**Response `200`** — array of `{ id, consultantId, clientName, hourlyRate, createdAt }`

#### `POST /api/assignments`
Requires `SYSTEM_ADMIN`. Creates a client assignment for a consultant.

**Request body**
| Field | Type | Required |
|---|---|---|
| `consultantId` | UUID | yes |
| `clientName` | string | yes |
| `hourlyRate` | number (> 0) | yes |

**Response `201`** — created assignment object

**Errors:** `400` missing/invalid fields

#### `DELETE /api/assignments/:id`
Requires `SYSTEM_ADMIN`. Removes a client assignment.

**Response `204`** — no content

**Errors:** `404` assignment not found

---

### Manager Assignments
All routes require `SYSTEM_ADMIN`. Links line managers to their consultants (one manager per consultant).

#### `GET /api/manager-assignments`
Returns all manager–consultant links.

**Response `200`** — array of `{ id, managerId, managerName, consultantId, consultantName, assignedAt }`

#### `POST /api/manager-assignments`
Assigns a consultant to a line manager.

**Request body**
| Field | Type | Required |
|---|---|---|
| `managerId` | UUID | yes |
| `consultantId` | UUID | yes |

**Response `201`** — created assignment object

**Errors:** `400` missing fields · `409` consultant already assigned to a manager

#### `DELETE /api/manager-assignments/:id`
Removes a manager–consultant link.

**Response `204`** — no content

**Errors:** `404` assignment not found

---

### Timesheets

#### `GET /api/timesheets`
Requires `CONSULTANT`, `LINE_MANAGER`, or `FINANCE_MANAGER`. Returns timesheets scoped to the caller's role — consultants see only their own; line managers see only their assigned consultants'; finance managers see all `APPROVED` and `COMPLETED` timesheets.

**Response `200`** — array of timesheet objects:
```json
{ "id": "uuid", "consultantId": "uuid", "assignmentId": "uuid|null", "weekStart": "YYYY-MM-DD",
  "status": "DRAFT|PENDING|APPROVED|REJECTED|COMPLETED", "rejectionComment": "string|null",
  "totalHours": 40, "createdAt": "iso8601", "updatedAt": "iso8601" }
```

#### `POST /api/timesheets`
Requires `CONSULTANT`. Creates a new timesheet. At most one per consultant per week.

**Request body**
| Field | Type | Required |
|---|---|---|
| `weekStart` | date string (`YYYY-MM-DD`, must be a Monday) | yes |
| `assignmentId` | UUID | no |

**Response `201`** — created timesheet object

**Errors:** `400` missing `weekStart` or not a Monday · `409` timesheet for this week already exists

#### `GET /api/timesheets/:id`
Requires `CONSULTANT`, `LINE_MANAGER`, or `FINANCE_MANAGER`. Returns a timesheet with its daily entries. Consultants can only access their own; line managers can only access their assigned consultants'; finance managers can access any timesheet.

**Response `200`**
```json
{ ...timesheetFields, "entries": [{ "id": "uuid", "date": "YYYY-MM-DD", "hoursWorked": 7.5 }] }
```

**Errors:** `403` not authorised · `404` not found

#### `PUT /api/timesheets/:id/entries`
Requires `CONSULTANT`. Saves daily hours for a timesheet. Only allowed while status is `DRAFT`. Upserts — existing entries for the same date are overwritten.

**Request body**
| Field | Type | Required |
|---|---|---|
| `entries` | array | yes |
| `entries[].date` | date string (`YYYY-MM-DD`) | yes |
| `entries[].hoursWorked` | number (0–24) | yes |

**Response `200`** — array of all entries for the timesheet

**Errors:** `400` invalid entries · `403` not owner or timesheet not in DRAFT · `404` not found

#### `POST /api/timesheets/:id/submit`
Requires `CONSULTANT`. Transitions a `DRAFT` timesheet to `PENDING` and records a `SUBMISSION` audit event. Timesheet becomes read-only after this point.

**Response `200`** — updated timesheet object

**Errors:** `400` timesheet not in DRAFT · `403` not owner · `404` not found

#### `GET /api/timesheets/:id/autofill`
Requires `CONSULTANT`. Returns the daily entries from the previous week's timesheet (7 days before `weekStart`), to be used as a template.

**Response `200`** — array of `{ id, date, hoursWorked }` (may be empty if no previous timesheet exists)

**Errors:** `403` not owner · `404` timesheet not found

#### `PATCH /api/timesheets/:id/review`
Requires `LINE_MANAGER`. Approves or rejects a `PENDING` timesheet. Manager must be assigned to the consultant. Records an `APPROVAL` or `REJECTION` audit event.

**Request body**
| Field | Type | Required |
|---|---|---|
| `action` | `APPROVE` \| `REJECT` | yes |
| `comment` | string | required when `action` is `REJECT` |

**Response `200`** — updated timesheet object

**Errors:** `400` invalid action or missing rejection comment · `403` not authorised for this consultant · `404` not found · `409` timesheet not in `PENDING`

#### `POST /api/timesheets/:id/payment`
Requires `FINANCE_MANAGER`. Processes payment for an `APPROVED` timesheet. Calculates the amount as `dailyRate × totalHours / 8`, sets timesheet status to `COMPLETED`, and records a `PROCESSING` audit event. Can only be called once per timesheet.

**Request body**
| Field | Type | Required |
|---|---|---|
| `dailyRate` | number (> 0) | yes |
| `notes` | string | no |

**Response `200`**
```json
{ "id": "uuid", "timesheetId": "uuid", "processedBy": "uuid", "dailyRate": 440.00,
  "amount": 2200.00, "status": "COMPLETED", "createdAt": "iso8601" }
```

**Errors:** `400` missing or invalid `dailyRate` · `404` timesheet not found · `409` timesheet not in `APPROVED` or payment already processed

---

### Audit

#### `GET /api/audit`
Requires `SYSTEM_ADMIN`. Returns the full audit log across all timesheets, ordered most-recent first.

**Response `200`** — array of audit records:
```json
{ "id": "uuid", "action": "SUBMISSION|APPROVAL|REJECTION|PROCESSING", "performedBy": "uuid",
  "timesheetId": "uuid|null", "detail": {}, "createdAt": "iso8601" }
```

---

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
