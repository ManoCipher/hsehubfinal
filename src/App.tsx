import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import EmployeeProfile from "./pages/EmployeeProfile";
import ActivityGroups from "./pages/ActivityGroups";
import RiskAssessments from "./pages/RiskAssessments";
import Measures from "./pages/Measures";
import Audits from "./pages/Audits";
import AuditDetails from "./pages/AuditDetails";
import Tasks from "./pages/Tasks";
import Training from "./pages/Training";
import LessonEditor from "./pages/LessonEditor";
import LessonViewer from "./pages/LessonViewer";
import Incidents from "./pages/Incidents";
import Investigations from "./pages/Investigations";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Invoices from "./pages/Invoices";
import SetupCompany from "./pages/SetupCompany";
import Messages from "./pages/Messages";
import Documents from "./pages/Documents";
import Reports from "./pages/Reports";
import CompanyRegistration from "./pages/CompanyRegistration";
import SuperAdminDashboard from "./pages/SuperAdmin/Dashboard";
import SuperAdminCompanies from "./pages/SuperAdmin/Companies";
import AuthDebug from "./pages/AuthDebug";
import NotFound from "./pages/NotFound";
import PublicNotes from "./pages/PublicNotes";
import MainLayout from "./components/MainLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/register" element={<CompanyRegistration />} />
              <Route path="/auth-debug" element={<AuthDebug />} />

              {/* Super Admin Pages */}
              <Route
                path="/super-admin/dashboard"
                element={
                  <MainLayout>
                    <SuperAdminDashboard />
                  </MainLayout>
                }
              />
              <Route
                path="/super-admin/companies"
                element={
                  <MainLayout>
                    <SuperAdminCompanies />
                  </MainLayout>
                }
              />

              {/* Authenticated pages wrapped with shared MainLayout (sidebar) */}
              <Route
                path="/dashboard"
                element={
                  <MainLayout>
                    <Dashboard />
                  </MainLayout>
                }
              />
              <Route
                path="/setup-company"
                element={
                  <MainLayout>
                    <SetupCompany />
                  </MainLayout>
                }
              />
              <Route
                path="/employees"
                element={
                  <MainLayout>
                    <Employees />
                  </MainLayout>
                }
              />
              <Route
                path="/employees/:id"
                element={
                  <MainLayout>
                    <EmployeeProfile />
                  </MainLayout>
                }
              />
              <Route
                path="/activity-groups"
                element={
                  <MainLayout>
                    <ActivityGroups />
                  </MainLayout>
                }
              />
              <Route
                path="/risk-assessments"
                element={
                  <MainLayout>
                    <RiskAssessments />
                  </MainLayout>
                }
              />
              <Route
                path="/measures"
                element={
                  <MainLayout>
                    <Measures />
                  </MainLayout>
                }
              />
              <Route
                path="/audits"
                element={
                  <MainLayout>
                    <Audits />
                  </MainLayout>
                }
              />
              <Route
                path="/audits/:id"
                element={
                  <MainLayout>
                    <AuditDetails />
                  </MainLayout>
                }
              />
              <Route
                path="/tasks"
                element={
                  <MainLayout>
                    <Tasks />
                  </MainLayout>
                }
              />
              <Route
                path="/training"
                element={
                  <MainLayout>
                    <Training />
                  </MainLayout>
                }
              />
              <Route
                path="/training/:courseId"
                element={
                  <MainLayout>
                    <Training />
                  </MainLayout>
                }
              />
              <Route
                path="/training/:courseId/lesson/:lessonId"
                element={
                  <MainLayout>
                    <LessonEditor />
                  </MainLayout>
                }
              />
              <Route
                path="/training/:courseId/lesson/:lessonId/view"
                element={
                  <MainLayout>
                    <LessonViewer />
                  </MainLayout>
                }
              />
              <Route
                path="/incidents"
                element={
                  <MainLayout>
                    <Incidents />
                  </MainLayout>
                }
              />
              <Route
                path="/investigations"
                element={
                  <MainLayout>
                    <Investigations />
                  </MainLayout>
                }
              />
              <Route
                path="/messages"
                element={
                  <MainLayout>
                    <Messages />
                  </MainLayout>
                }
              />
              <Route
                path="/documents"
                element={
                  <MainLayout>
                    <Documents />
                  </MainLayout>
                }
              />
              <Route
                path="/reports"
                element={
                  <MainLayout>
                    <Reports />
                  </MainLayout>
                }
              />
              <Route
                path="/settings"
                element={
                  <MainLayout>
                    <Settings />
                  </MainLayout>
                }
              />
              <Route
                path="/profile"
                element={
                  <MainLayout>
                    <Profile />
                  </MainLayout>
                }
              />
              <Route
                path="/invoices"
                element={
                  <MainLayout>
                    <Invoices />
                  </MainLayout>
                }
              />

              {/* Public Routes (no authentication required) */}
              <Route path="/notes/:token" element={<PublicNotes />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
