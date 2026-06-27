import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, Trash2, ThumbsUp, Calendar, Inbox } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { getMyComplaints, deleteComplaint } from "@/services/complaintService";
import StatusBadge from "@/components/complaints/StatusBadge";
import { PageTransition, containerVariants, itemVariants } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const CATEGORY_LABELS = {
  roads: "Roads", bridges: "Bridges", buildings: "Buildings",
  water_supply: "Water Supply", electricity: "Electricity", street_lights: "Street Lights",
  garbage: "Garbage", sewage: "Sewage", drainage: "Drainage",
  dangerous_structures: "Dangerous Structures", open_manholes: "Open Manholes",
  scheme_delays: "Scheme Delays", other: "Other",
};

function MyComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");

  const fetchComplaints = useCallback(async () => {
    try {
      const res = await getMyComplaints();
      setComplaints(res.data.complaints);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load complaints",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this complaint?")) return;
    try {
      await deleteComplaint(id);
      setComplaints((prev) => prev.filter((c) => c._id !== id));
      toast({ title: "Complaint deleted" });
    } catch (err) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to delete",
        variant: "destructive",
      });
    }
  };

  const statusCounts = {
    pending: complaints.filter((c) => c.status === "pending").length,
    in_progress: complaints.filter((c) => c.status === "in_progress").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
    closed: complaints.filter((c) => c.status === "closed").length,
  };

  const filtered =
    activeTab === "all"
      ? complaints
      : complaints.filter((c) => c.status === activeTab);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="hidden md:block space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
        <div className="block md:hidden space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <PageTransition className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-6">My Complaints</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{complaints.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{statusCounts.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{statusCounts.in_progress}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{statusCounts.resolved}</p>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All ({complaints.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({statusCounts.pending})</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress ({statusCounts.in_progress})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({statusCounts.resolved})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({statusCounts.closed})</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Inbox className="h-16 w-16" />
          <p className="mt-4 text-lg font-medium">No complaints found</p>
          <span>

          <Link to="/submit">
            <Button variant="link" className="mt-2">
              Submit a complaint
            </Button>
          </Link>
          </span>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Ward</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <ThumbsUp className="inline h-3 w-3" />
                  </TableHead>
                  <TableHead>
                    <Calendar className="inline h-3 w-3" />
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c, i) => (
                  <TableRow key={c._id} className="transition-colors hover:bg-muted/50">
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {c.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground capitalize">
                      {CATEGORY_LABELS[c.category] || c.category}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.ward}</TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.upvoteCount || 0}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {format(new Date(c.createdAt), "dd MMM yy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          className="h-8 w-8 text-primary"
                        >
                          <Link to={`/complaints/${c._id}`} aria-label="View complaint">
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(c._id)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          aria-label="Delete complaint"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className="md:hidden space-y-3"
          >
            {filtered.map((c) => (
              <motion.div key={c._id} variants={itemVariants}>
                <Card className="cursor-pointer" onClick={() => navigate(`/complaints/${c._id}`)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold line-clamp-1">{c.title}</h3>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                      <span className="capitalize">
                        {CATEGORY_LABELS[c.category] || c.category}
                      </span>
                      <span>Ward {c.ward}</span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" /> {c.upvoteCount || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />{" "}
                        {format(new Date(c.createdAt), "dd MMM yy")}
                      </span>
                    </div>
                    <div className="flex gap-3 mt-3 pt-2 border-t border-border">
                      <Link
                        to={`/complaints/${c._id}`}
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </Link>
                      <button
                        onClick={() => handleDelete(c._id)}
                        className="flex items-center gap-1 text-sm text-destructive hover:underline"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </>
      )}
    </PageTransition>
  );
}

export default MyComplaints;
