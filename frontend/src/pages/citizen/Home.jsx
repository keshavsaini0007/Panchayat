import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Inbox } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { getComplaints, upvoteComplaint } from "@/services/complaintService";
import useAuthStore from "@/store/authStore";
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES } from "@/utils/constants";
import ComplaintCard from "@/components/complaints/ComplaintCard";
import { PageTransition, containerVariants } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

function Home() {
  const user = useAuthStore((s) => s.user);
  const [complaints, setComplaints] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    search: "",
    category: "",
    status: "",
    village: "",
  });

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;
      if (filters.village) params.village = filters.village;

      const res = await getComplaints(params);
      let data = res.data.complaints;
      if (filters.search) {
        data = data.filter((c) =>
          c.title.toLowerCase().includes(filters.search.toLowerCase())
        );
      }
      setComplaints(data);
      setTotalCount(filters.search ? data.length : res.data.totalCount);
      setPages(filters.search ? 1 : res.data.pages);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load complaints",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleUpvote = async (id) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to upvote",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await upvoteComplaint(id);
      setComplaints((prev) =>
        prev.map((c) =>
          c._id === id
            ? { ...c, upvoteCount: res.data.upvoteCount, upvotes: c.upvotes }
            : c
        )
      );
    } catch {
      toast({
        title: "Error",
        description: "Failed to upvote",
        variant: "destructive",
      });
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  return (
    <PageTransition className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Community Complaints
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Showing {complaints.length} of {totalCount} complaints
          </p>
        </div>
        {user && (
          <Link to="/submit">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Submit a Complaint
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by title..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filters.category}
          onValueChange={(v) => handleFilterChange("category", v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {COMPLAINT_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status}
          onValueChange={(v) => handleFilterChange("status", v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {COMPLAINT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="text"
          placeholder="Village..."
          value={filters.village}
          onChange={(e) => handleFilterChange("village", e.target.value)}
          className="w-32"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-3 p-5 border border-border rounded-lg">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : complaints.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Inbox className="h-16 w-16" />
          <p className="mt-4 text-lg font-medium">No complaints found</p>
          <p className="text-sm">
            Try adjusting your filters or submit a new complaint.
          </p>
        </div>
      ) : (
        <>
          <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {complaints.map((c) => (
              <ComplaintCard key={c._id} complaint={c} onUpvote={handleUpvote} />
            ))}
          </motion.div>

          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(p)}
                  className="min-w-[36px]"
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                disabled={page === pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </PageTransition>
  );
}

export default Home;
