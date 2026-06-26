import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, LogOut, Home, Plus, List, LayoutDashboard, Shield, Users } from "lucide-react";
import useAuthStore from "@/store/authStore";
import NotificationBell from "./NotificationBell";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeSwitch } from "@/components/ui/ThemeSwitch";

const NAV_ICONS = {
  Home: Home,
  "Submit Complaint": Plus,
  "My Complaints": List,
  "Ward Dashboard": LayoutDashboard,
  "Admin Dashboard": Shield,
  "Manage Users": Users,
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

  const roleLinks = () => {
    if (!user) return [];
    switch (user.role) {
      case "citizen":
        return [
          { label: "Home", path: "/" },
          { label: "Submit Complaint", path: "/submit" },
          { label: "My Complaints", path: "/my-complaints" },
        ];
      case "ward_member":
      case "gram_pradhan":
        return [
          { label: "Home", path: "/" },
          { label: "Ward Dashboard", path: "/ward-dashboard" },
        ];
      case "admin":
        return [
          { label: "Home", path: "/" },
          { label: "Admin Dashboard", path: "/admin" },
          { label: "Manage Users", path: "/admin/users" },
        ];
      default:
        return [{ label: "Home", path: "/" }];
    }
  };

  const links = roleLinks();
  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <nav className="sticky top-0 min-h-[10vh] z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link
            to="/"
            className="flex items-center gap-2 text-xl font-bold tracking-tight hover:text-primary/80 transition-colors"
          >
            <img src="../../../public/favicon.png" alt="" className="h-8 w-8" />
            Panchayat
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => {
              const Icon = NAV_ICONS[l.label];
              return (
                <Link key={l.path} to={l.path}>
                  <Button variant="ghost" size="sm" className="gap-2">
                    {Icon && <Icon className="h-4 w-4" />}
                    {l.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-1">
            

            <ThemeSwitch />
            {user ? (
              <>
                <NotificationBell />
                <div className="flex items-center gap-2 ml-1">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary/20 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-sm leading-tight">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user.role.replace("_", " ")}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="mr-1 h-4 w-4" /> Logout
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                {location.pathname !== "/login" && (
                  <Link to="/login">
                    <Button variant="ghost" size="sm">
                      Login
                    </Button>
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

          {/* Mobile menu trigger */}
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
                  {links.map((l) => {
                    const Icon = NAV_ICONS[l.label];
                    return (
                      <Link
                        key={l.path}
                        to={l.path}
                        onClick={() => setMenuOpen(false)}
                      >
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-3"
                        >
                          {Icon && <Icon className="h-4 w-4" />}
                          {l.label}
                        </Button>
                      </Link>
                    );
                  })}
                </div>

                <Separator />

                {user ? (
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
                ) : (
                  <div className="flex flex-col gap-2">
                    {location.pathname !== "/login" && (
                      <Link to="/login" onClick={() => setMenuOpen(false)}>
                        <Button variant="outline" className="w-full">
                          Login
                        </Button>
                      </Link>
                    )}
                    {location.pathname !== "/register" && (
                      <Link to="/register" onClick={() => setMenuOpen(false)}>
                        <Button className="w-full">Register</Button>
                      </Link>
                    )}
                  </div>
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
