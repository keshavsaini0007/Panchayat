const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  in_progress: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
  citizen_verification_pending: 'bg-purple-100 text-purple-800',
  awaiting_citizen_response: 'bg-orange-100 text-orange-800',
  reopened: 'bg-red-100 text-red-800',
  closed: 'bg-gray-100 text-gray-800',
};

function StatusBadge({ status }) {
  const label = status
    ?.replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-800'}`}>
      {label}
    </span>
  );
}

export default StatusBadge;
