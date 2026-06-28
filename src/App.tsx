import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactElement } from "react";
import LoginPage from "./pages/LoginPage";
import LoginClassicPage from "./pages/LoginClassicPage";
import MapWorkbenchPage from "./pages/MapWorkbenchPage";
import NilamMobilePage from "./pages/NilamMobilePage";
import NilAiPage from "./pages/NilAiPage";
import AdminPage from "./pages/AdminPage";
import CitizenPortalPage from "./pages/CitizenPortalPage";
import MonitorPage from "./pages/MonitorPage";
import MoreToolsPage from "./pages/MoreToolsPage";
import ReportsPage from "./pages/ReportsPage";
import DatabaseExplorerPage from "./pages/DatabaseExplorerPage";
import AuditLogPage from "./pages/workflows/AuditLogPage";
import FmbAutomationPage from "./pages/workflows/FmbAutomationPage";
import WarpPage from "./pages/WarpPage";
import TransformationPage from "./pages/TransformationPage";
import ToolsPage from "./pages/ToolsPage";
import SwipeComparePage from "./pages/SwipeComparePage";
import MutationHeatmapPage from "./pages/MutationHeatmapPage";
import ScalableArchitecturePage from "./pages/ScalableArchitecturePage";
import WorkflowDemoPage from "./pages/workflows/WorkflowDemoPage";
import NotFoundPage from "./pages/NotFoundPage";
import { isAuthenticated } from "./lib/auth";

function ProtectedRoute({ children }: { children: ReactElement }) {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login-classic" element={<LoginClassicPage />} />
      <Route path="/login-alt" element={<LoginPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <MapWorkbenchPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/database"
        element={
          <ProtectedRoute>
            <DatabaseExplorerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mobile"
        element={
          <ProtectedRoute>
            <NilamMobilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/nil-ai"
        element={
          <ProtectedRoute>
            <NilAiPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/citizen"
        element={
          <ProtectedRoute>
            <CitizenPortalPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/monitor"
        element={
          <ProtectedRoute>
            <MonitorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/architecture"
        element={
          <ProtectedRoute>
            <ScalableArchitecturePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scale"
        element={
          <ProtectedRoute>
            <ScalableArchitecturePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/infrastructure"
        element={
          <ProtectedRoute>
            <ScalableArchitecturePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/more-tools"
        element={
          <ProtectedRoute>
            <MoreToolsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tools/spatial"
        element={
          <ProtectedRoute>
            <MoreToolsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/monitor"
        element={
          <ProtectedRoute>
            <MonitorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workflows/audit-log"
        element={
          <ProtectedRoute>
            <AuditLogPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/fmb-automation"
        element={
          <ProtectedRoute>
            <FmbAutomationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/warp"
        element={
          <ProtectedRoute>
            <WarpPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/georeferencing"
        element={
          <ProtectedRoute>
            <WarpPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tools"
        element={
          <ProtectedRoute>
            <ToolsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transformation"
        element={
          <ProtectedRoute>
            <TransformationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/georeference/transform"
        element={
          <ProtectedRoute>
            <TransformationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/swipe"
        element={
          <ProtectedRoute>
            <SwipeComparePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/compare"
        element={
          <ProtectedRoute>
            <SwipeComparePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/heatmap"
        element={
          <ProtectedRoute>
            <MutationHeatmapPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mutation-heatmap"
        element={
          <ProtectedRoute>
            <MutationHeatmapPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workflows/:id"
        element={
          <ProtectedRoute>
            <WorkflowDemoPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
