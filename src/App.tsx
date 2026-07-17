import { useEffect } from "react";
import { Provider } from "react-redux";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { store } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { hydrateAuth } from "@/store/slices/authSlice";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { UsersPage } from "@/pages/UsersPage";
import { ExpertsPage } from "@/pages/ExpertsPage";
import { CallsPage } from "@/pages/CallsPage";
import { TransactionsPage } from "@/pages/TransactionsPage";
import { PayoutsPage } from "@/pages/PayoutsPage";
import { CommunityPage } from "@/pages/CommunityPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { CmsPage } from "@/pages/CmsPage";
import { SettingsPage } from "@/pages/SettingsPage";

function AppRoutes() {
  const dispatch = useAppDispatch();
  const hydrated = useAppSelector((s) => s.auth.hydrated);

  useEffect(() => {
    dispatch(hydrateAuth());
  }, [dispatch]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/experts" element={<ExpertsPage />} />
          <Route path="/calls" element={<CallsPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/payouts" element={<PayoutsPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/cms" element={<CmsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </Provider>
  );
}
