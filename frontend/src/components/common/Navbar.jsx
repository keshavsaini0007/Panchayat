import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, LogOut, Home, List, LayoutDashboard, Shield, Users } from "lucide-react";
import useAuthStore from "@/store/authStore";
import NotificationBell from "./NotificationBell";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeSwitch } from "@/components/ui/ThemeSwitch";

const NAV_ITEMS = {
  citizen: [
    { label: "Home", path: "/", icon: Home },
    { label: "My Complaints", path: "/my-complaints", icon: List },
  ],
  ward_member: [
    { label: "Home", path: "/", icon: Home },
    { label: "Ward Dashboard", path: "/ward-dashboard", icon: LayoutDashboard },
  ],
  gram_pradhan: [
    { label: "Home", path: "/", icon: Home },
    { label: "Ward Dashboard", path: "/ward-dashboard", icon: LayoutDashboard },
    { label: "Admin Dashboard", path: "/admin", icon: Shield },
  ],
  admin: [
    { label: "Home", path: "/", icon: Home },
    { label: "Admin Dashboard", path: "/admin", icon: Shield },
    { label: "Manage Users", path: "/admin/users", icon: Users },
  ],
};

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const links = user ? NAV_ITEMS[user.role] || NAV_ITEMS.citizen : [];
  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 shrink-0"
          >
            <img src="../../../public/favicon.png" alt="" className="h-8 w-8" />
            <span className="text-xl font-bold tracking-tight hover:text-primary/80 transition-colors">
              Panchayat
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link key={l.path} to={l.path}>
                <Button
                  variant={isActive(l.path) ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <l.icon className="h-4 w-4" />
                  {l.label}
                </Button>
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <ThemeSwitch />
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-border/60">
                <NotificationBell />
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary/20 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-sm leading-tight hidden lg:block">
                    <p className="font-medium truncate max-w-[120px]">{user.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user.role.replace("_", " ")}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-2 border-l border-border/60">
                {location.pathname !== "/login" && (
                  <Link to="/login">
                    <Button variant="ghost" size="sm">Login</Button>
                  </Link>
                )}
                {location.pathname !== "/register" && (
                  <Link to="/register">
                    <Button size="sm">Register</Button>
                  </Link>
                )}
              </div>
            )}
          </div>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" aria-label="Toggle menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px]">
              <div className="flex flex-col gap-4 mt-8">
                {user && (
                  <div className="flex items-center gap-3 pb-4 border-b border-border">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {user.role.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  {links.map((l) => (
                    <Link
                      key={l.path}
                      to={l.path}
                      onClick={() => setMenuOpen(false)}
                    >
                      <Button
                        variant={isActive(l.path) ? "secondary" : "ghost"}
                        className="w-full justify-start gap-3"
                      >
                        <l.icon className="h-4 w-4" />
                        {l.label}
                      </Button>
                    </Link>
                  ))}
                </div>

                {user && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-5 px-2">
                      <span className="text-sm text-muted-foreground">Theme</span>
                      <div>
                      <ThemeSwitch />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      className="justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        handleLogout();
                        setMenuOpen(false);
                      }}
                    >
                      <LogOut className="h-4 w-4" /> Logout
                    </Button>
                  </>
                )}

                {!user && (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-2">
                      {location.pathname !== "/login" && (
                        <Link to="/login" onClick={() => setMenuOpen(false)}>
                          <Button variant="outline" className="w-full">Login</Button>
                        </Link>
                      )}
                      {location.pathname !== "/register" && (
                        <Link to="/register" onClick={() => setMenuOpen(false)}>
                          <Button className="w-full">Register</Button>
                        </Link>
                      )}
                    </div>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
