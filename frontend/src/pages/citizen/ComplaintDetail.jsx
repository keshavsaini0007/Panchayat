import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ThumbsUp, MapPin, Calendar, User, X, ChevronLeft, Send, ExternalLink, CheckCircle, AlertTriangle, Clock, Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import { toast } from "@/hooks/use-toast";
import {
  getComplaintById, upvoteComplaint, addComment, updateStatus, verifyComplaint, reopenComplaint,
} from "@/services/complaintService";
import useAuthStore from "@/store/authStore";
import { COMPLAINT_STATUSES, CITIZEN_FEEDBACK_OPTIONS } from "@/utils/constants";
import StatusBadge from "@/components/complaints/StatusBadge";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow,
});

const PRIORITY_MAP = {
  low: "outline",
  medium: "secondary",
  high: "default",
  urgent: "destructive",
};

const STATUS_FLOW = ["pending", "approved", "rejected", "in_progress", "resolved", "citizen_verification_pending", "closed"];
const REOPENED_FLOW = ["pending", "approved", "rejected", "in_progress", "resolved", "citizen_verification_pending", "reopened"];

function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [complaint, setComplaint] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [reason, setReason] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [showReopenForm, setShowReopenForm] = useState(false);
  const [citizenFeedback, setCitizenFeedback] = useState("");
  const [customFeedback, setCustomFeedback] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await getComplaintById(id);
      setComplaint(res.data.complaint);
      setComments(res.data.comments);
    } catch {
      toast({ title: "Complaint not found", variant: "destructive" });
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpvote = async () => {
    if (!user) return toast({ title: "Login required", description: "Please login to upvote", variant: "destructive" });
    try {
      const res = await upvoteComplaint(id);
      setComplaint((prev) => ({ ...prev, upvoteCount: res.data.upvoteCount }));
      toast({ title: res.data.message });
    } catch {
      toast({ title: "Failed to upvote", variant: "destructive" });
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await addComment(id, commentText);
      setComments((prev) => [...prev, res.data]);
      setCommentText("");
      toast({ title: "Comment added" });
    } catch (err) {
      toast({ title: err.response?.data?.message || "Failed to add comment", variant: "destructive" });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) return toast({ title: "Select a status", variant: "destructive" });
    setUpdatingStatus(true);
    try {
      const payload = { status: newStatus };
      if (newStatus === "rejected") payload.rejectionReason = reason;
      if (newStatus === "resolved") payload.resolutionRemarks = reason;
      const res = await updateStatus(id, payload);
      setComplaint(res.data);
      setNewStatus("");
      setReason("");
      toast({ title: "Status updated" });
    } catch (err) {
      toast({ title: err.response?.data?.message || "Failed to update", variant: "destructive" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleVerifyResolved = async () => {
    setVerificationLoading(true);
    try {
      const res = await verifyComplaint(id);
      setComplaint(res.data.complaint);
      toast({ title: "Complaint closed. Thank you for your verification." });
    } catch (err) {
      toast({ title: err.response?.data?.message || "Failed to verify", variant: "destructive" });
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleReopenComplaint = async () => {
    if (!citizenFeedback && !customFeedback.trim()) {
      return toast({ title: "Please select or provide a reason", variant: "destructive" });
    }
    setVerificationLoading(true);
    try {
      const feedback = citizenFeedback === "Other" ? customFeedback.trim() : citizenFeedback;
      const res = await reopenComplaint(id, feedback);
      setComplaint(res.data.complaint);
      setShowReopenForm(false);
      setCitizenFeedback("");
      setCustomFeedback("");
      toast({ title: "Complaint reopened." });
    } catch (err) {
      toast({ title: err.response?.data?.message || "Failed to reopen", variant: "destructive" });
    } finally {
      setVerificationLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!complaint) return null;

  const isOwner = user && complaint.createdBy?._id === user._id;
  const canManage = user && ["ward_member", "gram_pradhan", "admin"].includes(user.role);
  const isVerificationPending = ["citizen_verification_pending", "awaiting_citizen_response"].includes(complaint.status);
  const flow = complaint.status === "reopened" ? REOPENED_FLOW : STATUS_FLOW;
  const statusIndex = flow.indexOf(complaint.status);

  return (
    <PageTransition className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
        <ChevronLeft className="h-4 w-4" /> Back
      </Button>

      {/* Main complaint card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h1 className="text-2xl font-bold tracking-tight mr-auto">{complaint.title}</h1>
            <StatusBadge status={complaint.status} />
            <Badge variant={PRIORITY_MAP[complaint.priority] || "outline"} className="capitalize">
              {complaint.priority}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {complaint.category?.replace(/_/g, " ")}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-4">
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {complaint.village}{complaint.ward ? `, Ward ${complaint.ward}` : ""}</span>
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {format(new Date(complaint.createdAt), "dd MMM yyyy")}</span>
          </div>

          <p className="whitespace-pre-wrap">{complaint.description}</p>

          {complaint.images?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {complaint.images.map((url, i) => (
                <img key={i} src={url} alt="" className="w-24 h-24 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80 transition" onClick={() => setLightbox(url)} />
              ))}
            </div>
          )}

          {lightbox && (
            <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
              <DialogContent className="max-w-4xl p-2">
                <img src={lightbox} alt="" className="w-full rounded-lg" />
              </DialogContent>
            </Dialog>
          )}

          {complaint.location?.lat && complaint.location?.lng && (
            <div className="mt-4">
              <div className="h-48 rounded-xl overflow-hidden border border-border">
                <MapContainer center={[complaint.location.lat, complaint.location.lng]} zoom={14} className="h-full w-full" zoomControl={false} dragging={false}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[complaint.location.lat, complaint.location.lng]} />
                </MapContainer>
              </div>
              <div className="mt-2 p-3 border border-border rounded-lg text-sm space-y-1">
                <p className="font-medium flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Location Details</p>
                <p className="text-muted-foreground">Lat: <span className="font-mono">{complaint.location.lat}</span></p>
                <p className="text-muted-foreground">Lng: <span className="font-mono">{complaint.location.lng}</span></p>
                {complaint.location.address && <p className="text-muted-foreground">Address: <span className="text-foreground">{complaint.location.address}</span></p>}
                <a href={`https://www.google.com/maps?q=${complaint.location.lat},${complaint.location.lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:text-accent text-xs font-medium">
                  <ExternalLink className="h-3.5 w-3.5" /> Open in Google Maps
                </a>
              </div>
            </div>
          )}

          <Separator className="my-4" />

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={handleUpvote} className="gap-1.5">
              <ThumbsUp className="h-4 w-4" /> {complaint.upvoteCount || 0}
            </Button>
            <div className="text-sm text-muted-foreground text-right">
              <p className="font-medium text-foreground">{complaint.createdBy?.name}</p>
              <p>{format(new Date(complaint.createdAt), "dd MMM yyyy")}</p>
            </div>
          </div>

          {complaint.assignedTo && (
            <p className="text-sm text-muted-foreground mt-2">Assigned to: <span className="font-medium text-foreground">{complaint.assignedTo.name}</span> ({complaint.assignedTo.role?.replace("_", " ")})</p>
          )}

          {complaint.rejectionReason && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
              <strong>Rejection reason:</strong> {complaint.rejectionReason}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolution details */}
      {complaint.resolvedBy && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><CheckCircle className="h-5 w-5 text-primary" /> Resolution Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="font-medium">Resolved by:</span> {complaint.resolvedBy.name} ({complaint.resolvedBy.role?.replace("_", " ")})</p>
            {complaint.resolvedAt && <p><span className="font-medium">Resolved on:</span> {format(new Date(complaint.resolvedAt), "dd MMM yyyy, h:mm a")}</p>}
            {complaint.resolutionRemarks && <p><span className="font-medium">Remarks:</span> {complaint.resolutionRemarks}</p>}
          </CardContent>
        </Card>
      )}

      {/* Citizen verification */}
      {isOwner && isVerificationPending && (
        <Card className="border-primary/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <Clock className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-lg font-semibold text-primary">Please verify whether this issue has been resolved.</h2>
                <p className="text-sm text-muted-foreground mt-1">Your feedback helps ensure accountability.</p>
              </div>
            </div>

            {!showReopenForm ? (
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <Button onClick={handleVerifyResolved} disabled={verificationLoading} className="flex-1">
                  {verificationLoading ? "Processing..." : <><CheckCircle className="mr-2 h-5 w-5" /> Confirm Resolution</>}
                </Button>
                <Button variant="outline" onClick={() => setShowReopenForm(true)} disabled={verificationLoading} className="flex-1 border-destructive/50 text-destructive hover:text-destructive">
                  <AlertTriangle className="mr-2 h-5 w-5" /> Issue Still Exists
                </Button>
              </div>
            ) : (
              <div className="space-y-4 mt-2">
                <p className="text-sm font-medium">What issue still exists?</p>
                <div className="flex flex-wrap gap-2">
                  {CITIZEN_FEEDBACK_OPTIONS.map((opt) => (
                    <Button key={opt.value} variant={citizenFeedback === opt.value ? "default" : "outline"} size="sm" onClick={() => setCitizenFeedback(opt.value)}>
                      {opt.label}
                    </Button>
                  ))}
                </div>
                {citizenFeedback === "Other" && (
                  <Textarea value={customFeedback} onChange={(e) => setCustomFeedback(e.target.value)} rows={2} placeholder="Describe the issue..." />
                )}
                <div className="flex gap-3">
                  <Button onClick={handleReopenComplaint} disabled={verificationLoading || (!citizenFeedback && !customFeedback.trim())} variant="destructive">
                    {verificationLoading ? "Submitting..." : "Submit Feedback & Reopen"}
                  </Button>
                  <Button variant="outline" onClick={() => { setShowReopenForm(false); setCitizenFeedback(""); setCustomFeedback(""); }}>Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Timeline</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-0">
            {flow.map((s, i) => {
              const reached = i <= statusIndex;
              return (
                <div key={s} className="flex items-start gap-3 pb-1 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full mt-1.5 ${reached ? "bg-primary" : "bg-muted"}`} />
                    {i < flow.length - 1 && <div className={`w-0.5 h-6 ${i < statusIndex ? "bg-primary" : "bg-border"}`} />}
                  </div>
                  <div className={`text-sm ${reached ? "font-medium" : "text-muted-foreground"}`}>
                    {s === "resolved" && complaint.resolvedAt
                      ? `Resolved — ${format(new Date(complaint.resolvedAt), "dd MMM yyyy")}`
                      : s === "citizen_verification_pending"
                        ? "Citizen Verification Pending"
                        : s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Status update */}
      {canManage && !["closed", "citizen_verification_pending", "awaiting_citizen_response"].includes(complaint.status) && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Update Status</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {COMPLAINT_STATUSES.filter((s) => !["citizen_verification_pending", "awaiting_citizen_response", "closed"].includes(s.value) || s.value === "resolved").map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(newStatus === "rejected" || newStatus === "resolved") && (
                <Input
                  type="text"
                  placeholder={newStatus === "rejected" ? "Rejection reason" : "Resolution remarks"}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="flex-1 min-w-[200px]"
                />
              )}
              <Button onClick={handleStatusUpdate} disabled={updatingStatus}>
                {updatingStatus ? "Updating..." : "Update Status"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comments */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Comments ({comments.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            {comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
            {comments.map((c) => (
              <div key={c._id} className={`p-3 rounded-lg text-sm ${c.isOfficial ? "border-l-4 border-primary bg-primary/10" : "bg-muted/30"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{c.userId?.name}</span>
                  <Badge variant="outline" className="text-xs capitalize">{c.userId?.role?.replace("_", " ")}</Badge>
                  {c.isOfficial && <Badge variant="secondary" className="text-xs">Official</Badge>}
                  <span className="text-xs text-muted-foreground ml-auto">{format(new Date(c.createdAt), "dd MMM yyyy, h:mm a")}</span>
                </div>
                <p className="text-muted-foreground">{c.message}</p>
              </div>
            ))}
          </div>

          {user && (
            <div className="flex gap-2">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={2}
                className="flex-1"
                placeholder="Write a comment..."
              />
              <Button onClick={handleAddComment} disabled={submittingComment || !commentText.trim()} className="self-end">
                {submittingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </PageTransition>
  );
}

export default ComplaintDetail;
