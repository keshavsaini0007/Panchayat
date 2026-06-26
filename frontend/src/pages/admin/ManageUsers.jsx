import { useState, useEffect, useCallback } from "react";
import { Search, Trash2, Inbox, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { getAllUsers, updateUserRole, deleteUser } from "@/services/adminService";
import useAuthStore from "@/store/authStore";
import { USER_ROLES } from "@/utils/constants";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const ROLE_BADGE = {
  citizen: "",
  ward_member: "",
  gram_pradhan: "",
  admin: "",
};

const TABS = [
  { label: "All", value: "all" },
  ...USER_ROLES.map((r) => ({
    label: r.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    value: r,
  })),
];

function ManageUsers() {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      const params = {};
      if (activeTab !== "all") params.role = activeTab;
      const res = await getAllUsers(params);
      setUsers(res.data.users);
    } catch {
      toast({ title: "Failed to load users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => { setLoading(true); }, [activeTab]);

  const handleRoleChange = async (userId, role) => {
    try {
      await updateUserRole(userId, role);
      setUsers((prev) =>
        prev.map((u) =>
          u._id === userId ? { ...u, role, isVerified: ["ward_member", "gram_pradhan"].includes(role) ? true : u.isVerified } : u
        )
      );
      toast({ title: "Role updated" });
    } catch (err) {
      toast({ title: err.response?.data?.message || "Failed to update role", variant: "destructive" });
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      toast({ title: "User deleted" });
    } catch (err) {
      toast({ title: err.response?.data?.message || "Failed to delete", variant: "destructive" });
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  return (
    <PageTransition className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-1">Manage Users</h1>
      <p className="text-sm text-muted-foreground mb-6">{users.length} user(s)</p>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="overflow-x-auto">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Inbox className="h-16 w-16" />
          <p className="mt-4 text-lg font-medium">No users found</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Village</TableHead>
                <TableHead>Ward</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u._id} className="transition-colors hover:bg-muted/50">
                  <TableCell className="font-medium whitespace-nowrap">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell className="text-muted-foreground">{u.phone}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize ${ROLE_BADGE[u.role] || ""}`}>
                      {u.role.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.village}</TableCell>
                  <TableCell className="text-muted-foreground">{u.ward}</TableCell>
                  <TableCell>
                    <Badge variant={u.isVerified ? "default" : "outline"}>
                      {u.isVerified ? "Verified" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {u.createdAt ? format(new Date(u.createdAt), "dd MMM yyyy") : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select value={u.role} onValueChange={(v) => handleRoleChange(u._id, v)}>
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {USER_ROLES.map((r) => (
                            <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(u._id)}
                        disabled={u._id === currentUser?._id}
                        className={`h-8 w-8 ${u._id === currentUser?._id ? "opacity-40 cursor-not-allowed" : "text-destructive hover:text-destructive"}`}
                        aria-label="Delete user"
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
      )}
    </PageTransition>
  );
}

export default ManageUsers;
