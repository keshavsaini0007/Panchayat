import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, ThumbsUp, Calendar, ChevronDown, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { getWardComplaints, updateStatus } from "@/services/complaintService";
import { COMPLAINT_STATUSES } from "@/utils/constants";
import StatusBadge from "@/components/complaints/StatusBadge";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { FloatingLabelInput } from "@/components/ui/FloatingLabelInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PRIORITY_TINT = {
  urgent: "",
  high: "",
  medium: "",
  low: "",
};

const CATEGORY_LABELS = {
  roads: "Roads", bridges: "Bridges", buildings: "Buildings",
  water_supply: "Water Supply", electricity: "Electricity", street_lights: "Street Lights",
  garbage: "Garbage", sewage: "Sewage", drainage: "Drainage",
  dangerous_structures: "Dangerous Structures", open_manholes: "Open Manholes",
  scheme_delays: "Scheme Delays", other: "Other",
};

function WardDashboard() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [modal, setModal] = useState(null);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      const res = await getWardComplaints(params);
      let data = res.data.complaints;
      if (sortBy === "upvotes") data.sort((a, b) => b.upvoteCount - a.upvoteCount);
      setComplaints(data);
      setTotalCount(res.data.totalCount);
      setPages(res.data.pages);
    } catch {
      toast({ title: "Failed to load ward complaints", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, sortBy]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  const stats = {
    total: totalCount,
    pending: complaints.filter((c) => c.status === "pending").length,
    inProgress: complaints.filter((c) => c.status === "in_progress").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
    verificationPending: complaints.filter((c) => ["citizen_verification_pending", "awaiting_citizen_response"].includes(c.status)).length,
    reopened: complaints.filter((c) => c.status === "reopened").length,
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = { status: form.status.value };
    if (payload.status === "rejected") payload.rejectionReason = form.reason.value;
    if (payload.status === "resolved") payload.resolutionRemarks = form.resolutionRemarks.value;
    if (form.assign.value) payload.assignedTo = form.assign.value;
    try {
      const res = await updateStatus(modal._id, payload);
      setComplaints((prev) => prev.map((c) => (c._id === modal._id ? res.data : c)));
      setModal(null);
      toast({ title: "Status updated" });
    } catch (err) {
      toast({ title: err.response?.data?.message || "Failed to update", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-[180px]" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <PageTransition className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Ward Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[
          { label: "Total", value: stats.total, color: "" },
          { label: "Pending", value: stats.pending, color: "" },
          { label: "In Progress", value: stats.inProgress, color: "" },
          { label: "Verification", value: stats.verificationPending, color: "" },
          { label: "Reopened", value: stats.reopened, color: "" },
          { label: "Resolved", value: stats.resolved, color: "" },
        ].map((s) => (
          <Card key={s.label} className={s.color}>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {COMPLAINT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Sort by Date</SelectItem>
            <SelectItem value="upvotes">Sort by Upvotes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead><ThumbsUp className="inline h-3 w-3" /></TableHead>
              <TableHead><Calendar className="inline h-3 w-3" /></TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {complaints.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No complaints in your ward</TableCell></TableRow>
            ) : (
              complaints.map((c) => (
                <TableRow key={c._id} className={`transition-colors hover:bg-muted/50 ${PRIORITY_TINT[c.priority] || ""}`}>
                  <TableCell className="font-medium max-w-[200px] truncate">{c.title}</TableCell>
                  <TableCell className="text-muted-foreground capitalize whitespace-nowrap">{CATEGORY_LABELS[c.category] || c.category}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="capitalize text-sm">{c.priority}</TableCell>
                  <TableCell className="text-muted-foreground">{c.upvoteCount || 0}</TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{format(new Date(c.createdAt), "dd MMM yyyy")}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">Actions <ChevronDown className="ml-1 h-3 w-3" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/complaints/${c._id}`)}>
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setModal(c)}>
                          Update Status
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Button key={p} variant={p === page ? "default" : "outline"} size="sm" onClick={() => setPage(p)} className="min-w-[36px]">
              {p}
            </Button>
          ))}
          <Button variant="outline" size="sm" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <Dialog open={!!modal} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Status</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select name="status" defaultValue={modal?.status}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {COMPLAINT_STATUSES.filter((s) => !["citizen_verification_pending", "awaiting_citizen_response", "closed"].includes(s.value)).map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <FloatingLabelInput name="assign" label="Assign To (User ID)" type="text" defaultValue={modal?.assignedTo?._id || ""} />
            </div>
            <div className="space-y-2">
              <Label>Resolution Remarks</Label>
              <Textarea name="resolutionRemarks" rows={2} placeholder="Describe the resolution" />
            </div>
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Textarea name="reason" rows={2} placeholder="Required if rejecting" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}

export default WardDashboard;
