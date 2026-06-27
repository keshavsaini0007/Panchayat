import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { NotFound } from "@/components/ui/not-found";
import Navbar from "@/components/common/Navbar";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Loader2 } from "lucide-react";

const Home = lazy(() => import("@/pages/citizen/Home"));
const Login = lazy(() => import("@/pages/auth/Login"));
const Register = lazy(() => import("@/pages/auth/Register"));
const SubmitComplaint = lazy(() => import("@/pages/citizen/SubmitComplaint"));
const MyComplaints = lazy(() => import("@/pages/citizen/MyComplaints"));
const ComplaintDetail = lazy(() => import("@/pages/citizen/ComplaintDetail"));
const WardDashboard = lazy(() => import("@/pages/ward/WardDashboard"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const ManageUsers = lazy(() => import("@/pages/admin/ManageUsers"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

const Globe = lazy(() => import("@/components/ui/globe").then(m => ({ default: m.Globe })));

function AppContent() {
  return (
    <ErrorBoundary>
      <div className="relative min-h-screen">
        <Suspense fallback={null}><Globe /></Suspense>
        <Navbar />
        <main className="min-h-[90vh] relative z-[1]">
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/complaints/:id" element={<ProtectedRoute><ComplaintDetail /></ProtectedRoute>} />
                  <Route path="/submit" element={<ProtectedRoute roles={["citizen", "ward_member", "gram_pradhan"]}><SubmitComplaint /></ProtectedRoute>} />
                  <Route path="/my-complaints" element={<ProtectedRoute roles={["citizen"]}><MyComplaints /></ProtectedRoute>} />
                  <Route path="/ward-dashboard" element={<ProtectedRoute roles={["ward_member", "gram_pradhan"]}><WardDashboard /></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute roles={["admin", "gram_pradhan"]}><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/admin/users" element={<ProtectedRoute roles={["admin"]}><ManageUsers /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AnimatePresence>
            </Suspense>
          </ErrorBoundary>
        </main>
        <Toaster />
      </div>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="dark">
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
