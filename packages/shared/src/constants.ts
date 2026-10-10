export const CATEGORIES = [
  'roads',
  'lighting',
  'waste',
  'graffiti',
  'water',
  'parks',
  'traffic',
  'pavements',
  'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  roads: 'Roads & potholes',
  lighting: 'Street lighting',
  waste: 'Litter & fly-tipping',
  graffiti: 'Graffiti & vandalism',
  water: 'Flooding & drainage',
  parks: 'Parks & trees',
  traffic: 'Traffic & signs',
  pavements: 'Pavements & access',
  other: 'Other',
};

export const SEVERITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_LABELS: Record<Severity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const STATUSES = ['open', 'acknowledged', 'in_progress', 'resolved', 'duplicate'] as const;
export type ReportStatus = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<ReportStatus, string> = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  in_progress: 'In progress',
  resolved: 'Resolved',
  duplicate: 'Duplicate',
};

export const ROLES = ['resident', 'moderator'] as const;
export type Role = (typeof ROLES)[number];

export const LIMITS = {
  descriptionMin: 10,
  descriptionMax: 1000,
  addressMax: 200,
  commentMax: 500,
  statusNoteMax: 500,
  displayNameMax: 40,
  photoMaxBytes: 6 * 1024 * 1024,
  pageSizeMax: 50,
  nearbyRadiusKmMax: 25,
} as const;

export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
