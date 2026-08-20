import { ReportPage } from "./pages/ReportPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";

export default function App() {
  if (window.location.pathname.startsWith("/admin")) {
    return <AdminDashboardPage />;
  }

  return <ReportPage />;
}
