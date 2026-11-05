import { lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute, { RequirePerm } from "./components/ProtectedRoute";
import MainLayout from "./components/layout/MainLayout";
import { pageLoaders } from "./lib/routePreload";

import LoginPage from "./pages/LoginPage";
const DashboardPage = lazy(pageLoaders["/dashboard"]);
const CustomersPage = lazy(pageLoaders["/customers"]);
const VehiclesPage = lazy(pageLoaders["/vehicles"]);
const PolicyPlansPage = lazy(pageLoaders["/plans"]);
const NewPolicyPage = lazy(pageLoaders["/policies/new"]);
const PoliciesPage = lazy(pageLoaders["/policies"]);
const RenewalsPage = lazy(pageLoaders["/renewals"]);
const ClaimsPage = lazy(pageLoaders["/claims"]);
const PaymentsPage = lazy(pageLoaders["/payments"]);
const ReportsPage = lazy(pageLoaders["/reports"]);
const ProfilePage = lazy(pageLoaders["/profile"]);
const SettingsPage = lazy(pageLoaders["/settings"]);
const StaffPage = lazy(pageLoaders["/staff"]);
const ChatPage = lazy(pageLoaders["/chat"]);
const ActivityPage = lazy(pageLoaders["/activity"]);
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFoundPage from "./pages/NotFoundPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/vehicles" element={<VehiclesPage />} />
            <Route path="/plans" element={<PolicyPlansPage />} />
            <Route path="/policies" element={<PoliciesPage />} />
            <Route element={<RequirePerm need="canWrite" />}>
              <Route path="/policies/new" element={<NewPolicyPage />} />
            </Route>
            <Route path="/renewals" element={<RenewalsPage />} />
            <Route path="/claims" element={<ClaimsPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route element={<RequirePerm need="canSeeStaff" />}>
              <Route path="/staff" element={<StaffPage />} />
            </Route>
            <Route element={<RequirePerm need="canSeeActivity" />}>
              <Route path="/activity" element={<ActivityPage />} />
            </Route>
            <Route element={<RequirePerm need="canConfigure" />}>
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;