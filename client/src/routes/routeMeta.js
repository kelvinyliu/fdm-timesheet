const STATIC_META = {
  '/consultant/dashboard': {
    title: 'Dashboard',
    mobileTitle: 'Dashboard',
    mobileSubtitle: 'Consultant workspace',
    breadcrumbs: ['Dashboard'],
  },
  '/consultant/timesheets': {
    title: 'My Timesheets',
    mobileTitle: 'My Timesheets',
    breadcrumbs: ['My Timesheets'],
  },
  '/consultant/timesheets/new': {
    title: 'New Timesheet',
    mobileTitle: 'New Timesheet',
    breadcrumbs: ['My Timesheets', 'New'],
  },
  '/manager/dashboard': {
    title: 'Dashboard',
    mobileTitle: 'Dashboard',
    mobileSubtitle: 'Line manager workspace',
    breadcrumbs: ['Dashboard'],
  },
  '/manager/timesheets': {
    title: 'Team Timesheets',
    mobileTitle: 'Team Timesheets',
    breadcrumbs: ['Team Timesheets'],
  },
  '/manager/my-timesheets': {
    title: 'My Timesheets',
    mobileTitle: 'My Timesheets',
    breadcrumbs: ['My Timesheets'],
  },
  '/manager/my-timesheets/new': {
    title: 'New Timesheet',
    mobileTitle: 'New Timesheet',
    breadcrumbs: ['My Timesheets', 'New'],
  },
  '/finance/dashboard': {
    title: 'Dashboard',
    mobileTitle: 'Dashboard',
    mobileSubtitle: 'Finance workspace',
    breadcrumbs: ['Dashboard'],
  },
  '/finance/timesheets': {
    title: 'Timesheets',
    mobileTitle: 'Timesheets',
    breadcrumbs: ['Timesheets'],
  },
  '/finance/pay-rates': {
    title: 'Pay Rates',
    mobileTitle: 'Pay Rates',
    breadcrumbs: ['Pay Rates'],
  },
  '/admin/dashboard': {
    title: 'Admin Dashboard',
    mobileTitle: 'Dashboard',
    mobileSubtitle: 'Admin workspace',
    breadcrumbs: ['Admin', 'Dashboard'],
  },
  '/admin/users': {
    title: 'Users',
    mobileTitle: 'Users',
    breadcrumbs: ['Admin', 'Users'],
  },
  '/admin/assignments': {
    title: 'Assignments',
    mobileTitle: 'Assignments',
    breadcrumbs: ['Admin', 'Assignments'],
  },
  '/admin/audit-log': {
    title: 'Audit Log',
    mobileTitle: 'Audit Log',
    breadcrumbs: ['Admin', 'Audit Log'],
  },
}

const PATTERN_META = [
  {
    test: /\/my-timesheets\/[^/]+\/edit$/,
    meta: { title: 'Edit Timesheet', mobileTitle: 'Edit', breadcrumbs: ['My Timesheets', 'Edit'] },
  },
  {
    test: /\/my-timesheets\/[^/]+$/,
    meta: {
      title: 'Timesheet Details',
      mobileTitle: 'Details',
      breadcrumbs: ['My Timesheets', 'Details'],
    },
  },
  {
    test: /\/consultant\/timesheets\/[^/]+\/edit$/,
    meta: { title: 'Edit Timesheet', mobileTitle: 'Edit', breadcrumbs: ['My Timesheets', 'Edit'] },
  },
  {
    test: /\/consultant\/timesheets\/[^/]+$/,
    meta: {
      title: 'Timesheet Details',
      mobileTitle: 'Details',
      breadcrumbs: ['My Timesheets', 'Details'],
    },
  },
  {
    test: /\/manager\/timesheets\/[^/]+$/,
    meta: {
      title: 'Review Timesheet',
      mobileTitle: 'Review',
      breadcrumbs: ['Team Timesheets', 'Review'],
    },
  },
  {
    test: /\/finance\/timesheets\/[^/]+$/,
    meta: {
      title: 'Process Payment',
      mobileTitle: 'Payment',
      breadcrumbs: ['Timesheets', 'Payment'],
    },
  },
]

export function getRouteMeta(pathname) {
  if (STATIC_META[pathname]) return STATIC_META[pathname]
  for (const { test, meta } of PATTERN_META) {
    if (test.test(pathname)) return meta
  }
  return { title: '', mobileTitle: '', breadcrumbs: [] }
}
