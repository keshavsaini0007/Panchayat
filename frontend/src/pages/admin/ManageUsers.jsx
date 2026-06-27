import { useState, useEffect, useCallback } from "react";
import { Search, Trash2, Inbox, Loader2, Shield, ShieldAlert, UserCheck, UserCog } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { getAllUsers, updateUserRole, deleteUser } from "@/services/adminService";
import useAuthStore from "@/store/authStore";
import { USER_ROLES } from "@/utils/constants";
import { PageTransition } from "@/components/page-transition";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ROLE_CONFIG = {
  citizen: { label: "Citizen", variant: "secondary" },
  ward_member: { label: "Ward Member", variant: "outline" },
  gram_pradhan: { label: "Gram Pradhan", variant: "default" },
  admin: { label: "Admin", variant: "destructive" },
};

const TABS = [
  { label: "All", value: "all" },
  ...USER_ROLES.map((r) => ({
    label: r.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    value: r,
  })),
];

function getInitials(name) {
  return (name || "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function DeleteDialog({ userId, userName, currentUserId, onDelete }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(userId);
      setOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={userId === currentUserId}
          className={`h-8 w-8 ${userId === currentUserId ? "opacity-40 cursor-not-allowed" : "text-destructive hover:text-destructive hover:bg-destructive/10"}`}
          aria-label="Delete user"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <span className="font-medium text-foreground">{userName}</span>?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
          u._id === userId
            ? { ...u, role, isVerified: ["ward_member", "gram_pradhan"].includes(role) ? true : u.isVerified }
            : u
        )
      );
      toast({ title: "Role updated" });
    } catch (err) {
      toast({ title: err.response?.data?.message || "Failed to update role", variant: "destructive" });
    }
  };

  const handleDelete = async (userId) => {
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-px w-full" />
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <Skeleton className="h-10 w-full lg:w-72 xl:w-80" />
          <Skeleton className="h-10 w-full lg:w-auto max-w-md" />
        </div>
        <div className="hidden md:block space-y-1 rounded-lg border">
          <Skeleton className="h-12 w-full rounded-t-lg" />
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[73px] w-full" />)}
        </div>
        <div className="block md:hidden space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <PageTransition className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Users</h1>
        <p className="text-sm text-slate-200 mt-1">
          {users.length} user{users.length !== 1 ? "s" : ""} on the platform
        </p>
      </div>

      <Separator />

      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="relative w-full lg:w-72 xl:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-200" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto overflow-x-auto pb-1">
          <TabsList className="inline-flex w-max">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="whitespace-nowrap">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-200">
              <Inbox className="h-16 w-16 mb-4" />
              <p className="text-lg font-medium">No users found</p>
              <p className="text-sm">Try adjusting your search or filter.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead className="hidden lg:table-cell">Email</TableHead>
                      <TableHead className="hidden xl:table-cell">Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="hidden xl:table-cell">Village</TableHead>
                      <TableHead className="hidden xl:table-cell">Ward</TableHead>
                      <TableHead className="hidden sm:table-cell">Status</TableHead>
                      <TableHead className="hidden 2xl:table-cell">Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((u) => (
                      <TableRow key={u._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="text-xs bg-muted">
                                {getInitials(u.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{u.name}</p>
                              {u.role === "admin" && (
                                <p className="text-xs text-slate-200 flex items-center gap-1">
                                  <Shield className="h-3 w-3 shrink-0" /> Admin
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-slate-200 max-w-[160px] truncate">{u.email}</TableCell>
                        <TableCell className="hidden xl:table-cell text-slate-200">{u.phone}</TableCell>
                        <TableCell>
                          <Badge variant={ROLE_CONFIG[u.role]?.variant || "outline"} className="capitalize whitespace-nowrap">
                            {ROLE_CONFIG[u.role]?.label || u.role.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-slate-200">{u.village}</TableCell>
                        <TableCell className="hidden xl:table-cell text-slate-200">{u.ward}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={u.isVerified ? "default" : "outline"} className={`whitespace-nowrap ${u.isVerified ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : ""}`}>
                            {u.isVerified ? "Verified" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden 2xl:table-cell text-slate-200 text-xs whitespace-nowrap">
                          {u.createdAt ? format(new Date(u.createdAt), "dd MMM yyyy") : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Select value={u.role} onValueChange={(v) => handleRoleChange(u._id, v)}>
                              <SelectTrigger className="w-[130px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {USER_ROLES.map((r) => (
                                  <SelectItem key={r} value={r}>
                                    {r.replace("_", " ")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <DeleteDialog
                              userId={u._id}
                              userName={u.name}
                              currentUserId={currentUser?._id}
                              onDelete={handleDelete}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="block md:hidden divide-y divide-border">
                {filtered.map((u) => (
                  <div key={u._id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="text-xs bg-muted">
                            {getInitials(u.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{u.name}</p>
                          <p className="text-xs text-slate-200 truncate">{u.email}</p>
                        </div>
                      </div>
                      <Badge variant={ROLE_CONFIG[u.role]?.variant || "outline"} className="capitalize shrink-0">
                        {ROLE_CONFIG[u.role]?.label || u.role.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-200">
                      {u.phone && <span>{u.phone}</span>}
                      {u.village && <span>Village: {u.village}</span>}
                      {u.ward && <span>Ward: {u.ward}</span>}
                      <Badge variant={u.isVerified ? "default" : "outline"} className={`text-xs ${u.isVerified ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : ""}`}>
                        {u.isVerified ? "Verified" : "Pending"}
                      </Badge>
                      {u.createdAt && (
                        <span className="text-slate-200">{format(new Date(u.createdAt), "dd MMM yyyy")}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Select value={u.role} onValueChange={(v) => handleRoleChange(u._id, v)}>
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {USER_ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <DeleteDialog
                        userId={u._id}
                        userName={u.name}
                        currentUserId={currentUser?._id}
                        onDelete={handleDelete}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </PageTransition>
  );
}

export default ManageUsers;
