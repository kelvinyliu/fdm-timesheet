-- Enums
CREATE TYPE user_role AS ENUM ('CONSULTANT', 'LINE_MANAGER', 'FINANCE_MANAGER', 'SYSTEM_ADMIN');
CREATE TYPE timesheet_status AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');
CREATE TYPE audit_action AS ENUM ('SUBMISSION', 'APPROVAL', 'REJECTION', 'PROCESSING');
CREATE TYPE payment_status AS ENUM ('COMPLETED', 'PENDING');

-- Users (all roles in one table)
CREATE TABLE users (
  user_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          user_role NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Client assignments (consultant <-> client + hourly rate)
CREATE TABLE client_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  client_name   VARCHAR(255) NOT NULL,
  hourly_rate   NUMERIC(10,2) NOT NULL CHECK (hourly_rate > 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Timesheets (one per consultant per week)
CREATE TABLE timesheets (
  timesheet_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES client_assignments(assignment_id) ON DELETE SET NULL,
  week_start    DATE NOT NULL,
  status        timesheet_status NOT NULL DEFAULT 'DRAFT',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX timesheets_consultant_week ON timesheets (consultant_id, week_start);

-- Timesheet entries (multiple client/internal buckets per day)
CREATE TABLE timesheet_entries (
  entry_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id  UUID NOT NULL REFERENCES timesheets(timesheet_id) ON DELETE CASCADE,
  entry_date    DATE NOT NULL,
  entry_kind    VARCHAR(16) NOT NULL CHECK (entry_kind IN ('CLIENT', 'INTERNAL')),
  assignment_id UUID REFERENCES client_assignments(assignment_id) ON DELETE SET NULL,
  hours_worked  NUMERIC(4,2) NOT NULL CHECK (hours_worked >= 0 AND hours_worked <= 24),
  CHECK (
    (entry_kind = 'CLIENT' AND assignment_id IS NOT NULL) OR
    (entry_kind = 'INTERNAL' AND assignment_id IS NULL)
  )
);
CREATE UNIQUE INDEX timesheet_entries_unique_bucket ON timesheet_entries (
  timesheet_id,
  entry_date,
  entry_kind,
  COALESCE(assignment_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- Line manager -> consultant assignments (one active manager per consultant)
CREATE TABLE line_manager_consultants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id    UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reviews (line manager decisions on timesheets)
CREATE TABLE reviews (
  review_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id UUID NOT NULL REFERENCES timesheets(timesheet_id) ON DELETE CASCADE,
  reviewer_id  UUID NOT NULL REFERENCES users(user_id),
  decision     VARCHAR(10) NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED')),
  comment      TEXT,
  review_date  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payments (one per approved timesheet)
CREATE TABLE payments (
  payment_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id  UUID NOT NULL UNIQUE REFERENCES timesheets(timesheet_id),
  processed_by  UUID NOT NULL REFERENCES users(user_id),
  daily_rate    NUMERIC(10,2) CHECK (daily_rate > 0),
  amount        NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  status        payment_status NOT NULL DEFAULT 'PENDING',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_breakdowns (
  breakdown_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id    UUID NOT NULL REFERENCES payments(payment_id) ON DELETE CASCADE,
  entry_kind    VARCHAR(16) NOT NULL CHECK (entry_kind IN ('CLIENT', 'INTERNAL')),
  assignment_id UUID REFERENCES client_assignments(assignment_id) ON DELETE SET NULL,
  bucket_label  VARCHAR(255) NOT NULL,
  hours_worked  NUMERIC(6,2) NOT NULL CHECK (hours_worked >= 0),
  hourly_rate   NUMERIC(10,2) NOT NULL CHECK (hourly_rate > 0),
  amount        NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  UNIQUE (payment_id, entry_kind, assignment_id)
);

-- Financial notes (finance staff notes on timesheets)
CREATE TABLE financial_notes (
  note_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id UUID NOT NULL REFERENCES timesheets(timesheet_id) ON DELETE CASCADE,
  authored_by  UUID NOT NULL REFERENCES users(user_id),
  note         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log (append-only; SET NULL preserves history if user/timesheet deleted)
CREATE TABLE audit_reports (
  audit_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action       audit_action NOT NULL,
  performed_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  timesheet_id UUID REFERENCES timesheets(timesheet_id) ON DELETE SET NULL,
  detail       JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
