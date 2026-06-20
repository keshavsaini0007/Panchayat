import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ThumbsUp, MapPin, Calendar, User, X, ChevronLeft, Send, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { getComplaintById, upvoteComplaint, addComment, updateStatus } from '../../services/complaintService';
import useAuthStore from '../../store/authStore';
import { COMPLAINT_STATUSES } from '../../utils/constants';
import StatusBadge from '../../components/complaints/StatusBadge';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const STATUS_FLOW = ['pending', 'approved', 'rejected', 'in_progress', 'resolved', 'closed'];

function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [complaint, setComplaint] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await getComplaintById(id);
      setComplaint(res.data.complaint);
      setComments(res.data.comments);
    } catch {
      toast.error('Complaint not found');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpvote = async () => {
    if (!user) return toast.error('Please login to upvote');
    try {
      const res = await upvoteComplaint(id);
      setComplaint((prev) => ({ ...prev, upvoteCount: res.data.upvoteCount }));
      toast.success(res.data.message);
    } catch {
      toast.error('Failed to upvote');
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await addComment(id, commentText);
      setComments((prev) => [...prev, res.data]);
      setCommentText('');
      toast.success('Comment added');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) return toast.error('Select a status');
    setUpdatingStatus(true);
    try {
      const payload = { status: newStatus };
      if (newStatus === 'rejected') payload.rejectionReason = reason;
      const res = await updateStatus(id, payload);
      setComplaint(res.data);
      setNewStatus('');
      setReason('');
      toast.success('Status updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCloseByOwner = async () => {
    setUpdatingStatus(true);
    try {
      const res = await updateStatus(id, { status: 'closed' });
      setComplaint(res.data);
      toast.success('Complaint closed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to close');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-32 bg-gray-200 rounded" />
        <div className="h-48 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!complaint) return null;

  const isOwner = user && complaint.createdBy?._id === user._id;
  const canManage = user && ['ward_member', 'gram_pradhan', 'admin'].includes(user.role);
  const statusIndex = STATUS_FLOW.indexOf(complaint.status);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-green-600 transition">
        <ChevronLeft size={16} /> Back
      </button>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <h1 className="text-2xl font-bold text-gray-800 mr-auto">{complaint.title}</h1>
          <StatusBadge status={complaint.status} />
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PRIORITY_COLORS[complaint.priority] || 'bg-gray-100'}`}>
            {complaint.priority}
          </span>
          <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full capitalize">
            {complaint.category?.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mb-4">
          <span className="flex items-center gap-1"><MapPin size={14} /> {complaint.village}{complaint.ward ? `, Ward ${complaint.ward}` : ''}</span>
          <span className="flex items-center gap-1"><Calendar size={14} /> {format(new Date(complaint.createdAt), 'dd MMM yyyy')}</span>
        </div>

        <p className="text-gray-700 whitespace-pre-wrap">{complaint.description}</p>

        {complaint.images?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {complaint.images.map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className="w-24 h-24 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition"
                onClick={() => setLightbox(url)}
              />
            ))}
          </div>
        )}

        {lightbox && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
            <button className="absolute top-4 right-4 text-white" onClick={() => setLightbox(null)}><X size={28} /></button>
            <img src={lightbox} alt="" className="max-w-full max-h-[90vh] rounded-lg" />
          </div>
        )}

        {complaint.location?.lat && complaint.location?.lng && (
          <div className="mt-4">
            <div className="h-48 rounded-lg overflow-hidden border">
              <MapContainer center={[complaint.location.lat, complaint.location.lng]} zoom={14} className="h-full w-full" zoomControl={false} dragging={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[complaint.location.lat, complaint.location.lng]} />
              </MapContainer>
            </div>
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border text-sm space-y-1">
              <p className="font-medium text-gray-700 flex items-center gap-1">
                <MapPin size={14} /> Location Details
              </p>
              <p className="text-gray-500">
                Latitude: <span className="font-mono text-gray-700">{complaint.location.lat}</span>
              </p>
              <p className="text-gray-500">
                Longitude: <span className="font-mono text-gray-700">{complaint.location.lng}</span>
              </p>
              {complaint.location.address && (
                <p className="text-gray-500">
                  Address: <span className="text-gray-700">{complaint.location.address}</span>
                </p>
              )}
              {complaint.location.plusCode && (
                <p className="text-gray-400 text-xs">
                  Plus Code: {complaint.location.plusCode}
                </p>
              )}
              <a
                href={`https://www.google.com/maps?q=${complaint.location.lat},${complaint.location.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-1 text-green-600 hover:text-green-700 font-medium text-xs"
              >
                <ExternalLink size={14} /> Open in Google Maps
              </a>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <button
            onClick={handleUpvote}
            className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm hover:bg-green-50 hover:text-green-600 hover:border-green-300 transition"
          >
            <ThumbsUp size={16} /> {complaint.upvoteCount || 0}
          </button>
          <div className="text-sm text-gray-500 text-right">
            <p className="font-medium text-gray-700">{complaint.createdBy?.name}</p>
            <p>{format(new Date(complaint.createdAt), 'dd MMM yyyy')}</p>
          </div>
        </div>

        {complaint.assignedTo && (
          <p className="text-sm text-gray-500 mt-2">Assigned to: <span className="font-medium text-gray-700">{complaint.assignedTo.name}</span> ({complaint.assignedTo.role?.replace('_', ' ')})</p>
        )}

        {complaint.rejectionReason && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <strong>Rejection reason:</strong> {complaint.rejectionReason}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Timeline</h2>
        <div className="space-y-0">
          {STATUS_FLOW.map((s, i) => {
            const reached = i <= statusIndex;
            return (
              <div key={s} className="flex items-start gap-3 pb-1 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full mt-1.5 ${reached ? 'bg-green-600' : 'bg-gray-300'}`} />
                  {i < STATUS_FLOW.length - 1 && <div className={`w-0.5 h-6 ${i < statusIndex ? 'bg-green-600' : 'bg-gray-200'}`} />}
                </div>
                <div className={`text-sm ${reached ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                  {s === 'resolved' && complaint.resolvedAt
                    ? `Resolved — ${format(new Date(complaint.resolvedAt), 'dd MMM yyyy')}`
                    : s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isOwner && complaint.status === 'resolved' && (
        <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">Your complaint has been resolved. You can close it to mark it complete.</p>
          <button
            onClick={handleCloseByOwner}
            disabled={updatingStatus}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition"
          >
            {updatingStatus ? 'Closing...' : 'Mark as Closed'}
          </button>
        </div>
      )}

      {canManage && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Update Status</h2>
          <div className="flex flex-wrap gap-3">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select status</option>
              {COMPLAINT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {newStatus === 'rejected' && (
              <input
                type="text"
                placeholder="Rejection reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            )}
            <button
              onClick={handleStatusUpdate}
              disabled={updatingStatus}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              {updatingStatus ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Comments ({comments.length})</h2>

        <div className="space-y-4 mb-6">
          {comments.length === 0 && <p className="text-sm text-gray-400">No comments yet.</p>}
          {comments.map((c) => (
            <div
              key={c._id}
              className={`p-3 rounded-lg text-sm ${c.isOfficial ? 'border-l-4 border-green-500 bg-green-50' : 'bg-gray-50'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <User size={14} className="text-gray-400" />
                <span className="font-medium text-gray-700">{c.userId?.name}</span>
                <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded capitalize">{c.userId?.role?.replace('_', ' ')}</span>
                {c.isOfficial && <span className="text-xs text-green-600 font-medium">Official</span>}
                <span className="text-xs text-gray-400 ml-auto">{format(new Date(c.createdAt), 'dd MMM yyyy, h:mm a')}</span>
              </div>
              <p className="text-gray-600">{c.message}</p>
            </div>
          ))}
        </div>

        {user && (
          <div className="flex gap-2">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={2}
              className="flex-1 border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Write a comment..."
            />
            <button
              onClick={handleAddComment}
              disabled={submittingComment || !commentText.trim()}
              className="self-end bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-3 py-2 rounded-lg transition"
            >
              {submittingComment ? '...' : <Send size={18} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ComplaintDetail;
