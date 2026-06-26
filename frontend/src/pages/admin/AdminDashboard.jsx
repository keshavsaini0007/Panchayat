import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, CheckCircle, Clock, Users, XCircle, FileText, TrendingUp, Activity,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { toast } from "@/hooks/use-toast";
import { getAnalytics } from "@/services/adminService";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--destructive))",
  "hsl(var(--accent-foreground))",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(262 83% 58%)",
  "hsl(190 95% 39%)",
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="text-sm font-medium">{label || payload[0].name}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm text-muted-foreground">
          {entry.name}: <span className="font-medium text-foreground">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <Skeleton className="h-px w-full" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-80" />)}
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
  const totalUsers = data.usersByRole?.reduce((a, b) => a + b.count, 0) || 0;

  const sortedByCategory = [...(data.byCategory || [])].sort((a, b) => b.count - a.count);
  const sortedByVillage = [...(data.byVillage || [])].sort((a, b) => b.count - a.count);

  const statCards = [
    { icon: FileText, label: "Total Complaints", value: data.totalComplaints, color: "bg-primary/10 text-primary" },
    { icon: Users, label: "Total Users", value: totalUsers, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    { icon: CheckCircle, label: "Resolved Rate", value: `${resolvedRate}%`, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    { icon: Clock, label: "Avg Resolution", value: `${avgHours}h`, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    { icon: AlertTriangle, label: "Pending", value: pendingCount, color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
    { icon: XCircle, label: "Rejected", value: rejectedCount, color: "bg-destructive/10 text-destructive" },
  ];

  return (
    <PageTransition className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of platform analytics and metrics
          </p>
        </div>
        <Link to="/admin/users">
          <Button variant="outline" className="gap-2">
            <Users className="h-4 w-4" /> Manage Users
          </Button>
        </Link>
      </div>

      <Separator />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-md ${s.color}`}>
                  <s.icon className="h-4 w-4" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold tracking-tight">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-4 w-4" /> Complaints by Status
            </CardTitle>
            <CardDescription>Distribution across all statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.byStatus || []}
                  dataKey="count"
                  nameKey="_id"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ _id, count }) => `${_id} (${count})`}
                >
                  {(data.byStatus || []).map((entry, i) => (
                    <Cell key={entry._id} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Complaints by Category
            </CardTitle>
            <CardDescription>Total complaints per category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sortedByCategory} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs text-muted-foreground" />
                <YAxis
                  type="category"
                  dataKey="_id"
                  tick={{ fontSize: 11 }}
                  width={100}
                  className="text-xs text-muted-foreground"
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-4 w-4" /> Users by Role
            </CardTitle>
            <CardDescription>Platform user distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.usersByRole || []}
                  dataKey="count"
                  nameKey="_id"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ _id, count }) => `${_id} (${count})`}
                >
                  {(data.usersByRole || []).map((entry, i) => (
                    <Cell key={entry._id} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-4 w-4" /> Complaints by Village
            </CardTitle>
            <CardDescription>Complaints originating per village</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sortedByVillage} margin={{ bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="_id"
                  tick={{ fontSize: 11 }}
                  angle={-30}
                  textAnchor="end"
                  className="text-xs text-muted-foreground"
                />
                <YAxis className="text-xs text-muted-foreground" />
                <Tooltip content={<CustomTooltip />} />
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
