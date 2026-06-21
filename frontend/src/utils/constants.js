export const COMPLAINT_CATEGORIES = [
  { label: 'Roads', value: 'roads' },
  { label: 'Bridges', value: 'bridges' },
  { label: 'Buildings', value: 'buildings' },
  { label: 'Water Supply', value: 'water_supply' },
  { label: 'Electricity', value: 'electricity' },
  { label: 'Street Lights', value: 'street_lights' },
  { label: 'Garbage', value: 'garbage' },
  { label: 'Sewage', value: 'sewage' },
  { label: 'Drainage', value: 'drainage' },
  { label: 'Dangerous Structures', value: 'dangerous_structures' },
  { label: 'Open Manholes', value: 'open_manholes' },
  { label: 'Scheme Delays', value: 'scheme_delays' },
  { label: 'Other', value: 'other' },
];

export const COMPLAINT_STATUSES = [
  { label: 'Pending', value: 'pending', color: 'text-yellow-500' },
  { label: 'Approved', value: 'approved', color: 'text-green-500' },
  { label: 'Rejected', value: 'rejected', color: 'text-red-500' },
  { label: 'In Progress', value: 'in_progress', color: 'text-blue-500' },
  { label: 'Resolved', value: 'resolved', color: 'text-green-700' },
  { label: 'Citizen Verification Pending', value: 'citizen_verification_pending', color: 'text-purple-600' },
  { label: 'Awaiting Citizen Response', value: 'awaiting_citizen_response', color: 'text-orange-500' },
  { label: 'Reopened', value: 'reopened', color: 'text-red-600' },
  { label: 'Closed', value: 'closed', color: 'text-gray-500' },
];

export const CITIZEN_FEEDBACK_OPTIONS = [
  { label: 'Road still damaged', value: 'Road still damaged' },
  { label: 'Water issue not fixed', value: 'Water issue not fixed' },
  { label: 'Work incomplete', value: 'Work incomplete' },
  { label: 'Wrong resolution', value: 'Wrong resolution' },
  { label: 'Other', value: 'Other' },
];

export const USER_ROLES = ['citizen', 'ward_member', 'gram_pradhan', 'admin'];

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
