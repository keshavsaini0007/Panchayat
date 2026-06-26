import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, UsersRound, Clock, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { toast } from "@/hooks/use-toast";
import { getAnalytics } from "@/services/adminService";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_COLORS = {
  pending: "hsl(var(--muted-foreground))", approved: "hsl(var(--muted-foreground))", in_progress: "hsl(var(--muted-foreground))",
  resolved: "hsl(var(--primary))", rejected: "hsl(var(--destructive))", citizen_verification_pending: "hsl(var(--muted-foreground))",
  awaiting_citizen_response: "hsl(var(--muted-foreground))", reopened: "hsl(var(--destructive))", closed: "hsl(var(--muted-foreground))",
};

function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getAnalytics();
        setData(res.data);
      } catch {
        toast({ title: "Failed to load analytics", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const resolvedCount = data.byStatus?.find((s) => s._id === "resolved")?.count || 0;
  const pendingCount = data.byStatus?.find((s) => s._id === "pending")?.count || 0;
  const rejectedCount = data.byStatus?.find((s) => s._id === "rejected")?.count || 0;
  const resolvedRate = data.totalComplaints ? ((resolvedCount / data.totalComplaints) * 100).toFixed(1) : 0;
  const avgHours = data.avgResolutionHours ? Number(data.avgResolutionHours).toFixed(1) : 0;

  const sortedByCategory = [...(data.byCategory || [])].sort((a, b) => b.count - a.count);
  const sortedByVillage = [...(data.byVillage || [])].sort((a, b) => b.count - a.count);

  return (
    <PageTransition className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <Link to="/admin/users">
          <Button variant="outline" className="gap-2">
            <Users className="h-4 w-4" /> Manage Users
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { icon: AlertTriangle, label: "Total Complaints", value: data.totalComplaints, color: "" },
          { icon: UsersRound, label: "Total Users", value: data.usersByRole?.reduce((a, b) => a + b.count, 0) || 0, color: "" },
          { icon: CheckCircle, label: "Resolved Rate", value: `${resolvedRate}%`, color: "" },
          { icon: Clock, label: "Avg Resolution", value: `${avgHours}h`, color: "" },
          { icon: AlertTriangle, label: "Pending", value: pendingCount, color: "" },
          { icon: XCircle, label: "Rejected", value: rejectedCount, color: "" },
        ].map((s) => (
          <Card key={s.label} className={s.color}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className="h-4 w-4" />
                <p className="text-xs">{s.label}</p>
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Complaints by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data.byStatus || []} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={90} label>
                  {(data.byStatus || []).map((entry) => (
                    <Cell key={entry._id} fill={STATUS_COLORS[entry._id] || "#6B7280"} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Complaints by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={sortedByCategory} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="_id" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Users by Role</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data.usersByRole || []} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={90} label>
                  {(data.usersByRole || []).map((entry, i) => (
                    <Cell key={entry._id} fill={["hsl(var(--primary))", "hsl(var(--muted-foreground))", "hsl(var(--accent-foreground))", "hsl(var(--destructive))"][i % 4]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Complaints by Village</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={sortedByVillage} margin={{ bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}

export default AdminDashboard;
