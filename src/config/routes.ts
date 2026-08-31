/**
 * Every route path in the product, built here.
 * Screens link through these helpers so a path change is one edit, and a typo
 * in a link becomes a type error rather than a dead route.
 */
export const routes = {
  landing: '/',
  signIn: '/sign-in',
  signUp: '/sign-up',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  acceptInvite: '/accept-invite',

  company: '/company',
  companySettings: '/company/settings',
  companyUsers: '/company/users',

  projects: '/projects',
  projectNew: '/projects/new',
  project: (id: string) => `/projects/${id}`,
  projectDashboard: (id: string) => `/projects/${id}/dashboard`,
  projectEdit: (id: string) => `/projects/${id}/edit`,

  tasks: (projectId: string) => `/projects/${projectId}/tasks`,
  task: (projectId: string, taskId: string) => `/projects/${projectId}/tasks/${taskId}`,

  dpr: (projectId: string) => `/projects/${projectId}/dpr`,
  dprNew: (projectId: string) => `/projects/${projectId}/dpr/new`,
  dprDetail: (projectId: string, dprId: string) => `/projects/${projectId}/dpr/${dprId}`,

  labour: (projectId: string) => `/projects/${projectId}/labour`,
  materials: (projectId: string) => `/projects/${projectId}/materials`,
  procurement: (projectId: string) => `/projects/${projectId}/procurement`,
  equipment: (projectId: string) => `/projects/${projectId}/equipment`,
  asset: (projectId: string, assetId: string) => `/projects/${projectId}/equipment/${assetId}`,
  issues: (projectId: string) => `/projects/${projectId}/issues`,
  issue: (projectId: string, issueId: string) => `/projects/${projectId}/issues/${issueId}`,
  expenses: (projectId: string) => `/projects/${projectId}/expenses`,
  documents: (projectId: string) => `/projects/${projectId}/documents`,
  reports: (projectId: string) => `/projects/${projectId}/reports`,

  site: '/site',
  siteAttendance: '/site/attendance',
  siteDpr: '/site/dpr',
  siteIssue: '/site/issue',
  siteMaterialRequest: '/site/material-request',
  siteTasks: '/site/tasks',

  notifications: '/notifications',
  profile: '/profile',
} as const;
