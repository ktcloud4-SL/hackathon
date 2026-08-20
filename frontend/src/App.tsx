import { ReportPage } from "./pages/ReportPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AgencyDashboardPage } from "./pages/AgencyDashboardPage";

export default function App() {
  if (window.location.pathname.startsWith("/admin")) {
    return <AdminDashboardPage />;
  }

  if (window.location.pathname.startsWith("/agency")) {
    return <AgencyDashboardPage />;
  }

  return <ReportPage />;
}
