import { ReportPage } from "./pages/ReportPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AgencyDashboardPage } from "./pages/AgencyDashboardPage";
import { AnalysisResultPage } from "./pages/AnalysisResultPage";
import { CitizenIncidentPage } from "./pages/CitizenIncidentPage";

export default function App() {
  if (window.location.pathname === "/report/analysis") {
    return <AnalysisResultPage />;
  }

  if (/^\/incidents\/\d+\/?$/.test(window.location.pathname)) {
    return <CitizenIncidentPage />;
  }

  if (window.location.pathname.startsWith("/admin")) {
    return <AdminDashboardPage />;
  }

  if (window.location.pathname.startsWith("/agency")) {
    return <AgencyDashboardPage />;
  }

  return <ReportPage />;
}
