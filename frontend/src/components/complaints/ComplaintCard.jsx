import { useNavigate } from 'react-router-dom';
import { ThumbsUp, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import StatusBadge from './StatusBadge';
import useAuthStore from '../../store/authStore';

const CATEGORY_LABELS = {
  roads: 'Roads', bridges: 'Bridges', buildings: 'Buildings',
  water_supply: 'Water Supply', electricity: 'Electricity', street_lights: 'Street Lights',
  garbage: 'Garbage', sewage: 'Sewage', drainage: 'Drainage',
  dangerous_structures: 'Dangerous Structures', open_manholes: 'Open Manholes',
  scheme_delays: 'Scheme Delays', other: 'Other',
};

function ComplaintCard({ complaint, onUpvote }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const hasUpvoted = user && complaint.upvotes?.some((id) => id === user._id || id?.toString() === user._id);

  return (
    <div
      className="bg-white rounded-xl shadow-sm border hover:shadow-md transition cursor-pointer"
      onClick={() => navigate(`/complaints/${complaint._id}`)}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-gray-800 line-clamp-1">{complaint.title}</h3>
          <StatusBadge status={complaint.status} />
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">
            {CATEGORY_LABELS[complaint.category] || complaint.category}
          </span>
          <span className="flex items-center gap-1 text-gray-500 text-xs">
            <MapPin size={12} /> {complaint.village}{complaint.ward ? ` / Ward ${complaint.ward}` : ''}
          </span>
        </div>

        <p className="text-gray-600 text-sm mt-3 line-clamp-2">{complaint.description}</p>

        <div className="flex items-center justify-between mt-4 pt-3 border-t text-sm text-gray-500">
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); onUpvote?.(complaint._id); }}
              className={`flex items-center gap-1 px-2 py-1 rounded transition ${hasUpvoted ? 'text-green-600 bg-green-50' : 'hover:text-green-600 hover:bg-green-50'}`}
            >
              <ThumbsUp size={14} fill={hasUpvoted ? 'currentColor' : 'none'} /> {complaint.upvoteCount || 0}
            </button>
            <span className="flex items-center gap-1">
              <Calendar size={12} /> {format(new Date(complaint.createdAt), 'dd MMM yyyy')}
            </span>
          </div>
          <span className="text-xs truncate max-w-[120px]">{complaint.createdBy?.name || 'Anonymous'}</span>
        </div>
      </div>
    </div>
  );
}

export default ComplaintCard;
