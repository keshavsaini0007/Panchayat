import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { PageTransition } from "@/components/page-transition";
import Navbar from "@/components/common/Navbar";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import Home from "@/pages/citizen/Home";
import SubmitComplaint from "@/pages/citizen/SubmitComplaint";
import MyComplaints from "@/pages/citizen/MyComplaints";
import ComplaintDetail from "@/pages/citizen/ComplaintDetail";
import WardDashboard from "@/pages/ward/WardDashboard";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import ManageUsers from "@/pages/admin/ManageUsers";

function NotFound() {
  return (
    <PageTransition className="flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-4xl font-bold tracking-tight">404</h1>
      <p className="mt-2 text-muted-foreground">Page not found</p>
      <Link
        to="/"
        className="mt-4 text-primary hover:underline transition-colors"
      >
        Go Home
      </Link>
    </PageTransition>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="dark">
        <div className="relative min-h-screen">
          <Navbar />
          <main className="min-h-screen relative z-[1]">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/complaints/:id" element={<ComplaintDetail />} />
                <Route
                  path="/submit"
                  element={
                    <ProtectedRoute roles={["citizen", "ward_member", "gram_pradhan"]}>
                      <SubmitComplaint />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-complaints"
                  element={
                    <ProtectedRoute roles={["citizen"]}>
                      <MyComplaints />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ward-dashboard"
                  element={
                    <ProtectedRoute roles={["ward_member", "gram_pradhan"]}>
                      <WardDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute roles={["admin", "gram_pradhan"]}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <ManageUsers />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AnimatePresence>
          </main>
          <Toaster />
        </div>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
