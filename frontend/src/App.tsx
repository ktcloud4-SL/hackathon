import { ReportPage } from "./pages/ReportPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AgencyDashboardPage } from "./pages/AgencyDashboardPage";
import { AnalysisResultPage } from "./pages/AnalysisResultPage";
import { CitizenIncidentPage } from "./pages/CitizenIncidentPage";
import { AuthPage } from "./pages/AuthPage";
import { MyReportsPage } from "./pages/MyReportsPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App() {
  const { pathname } = window.location;

  if (/^\/(login|register)\/?$/.test(pathname)) {
    return <AuthPage />;
  }

  if (/^\/reports\/me\/?$/.test(pathname)) {
    return <MyReportsPage />;
  }

  if (/^\/report\/analysis\/?$/.test(pathname)) {
    return <AnalysisResultPage />;
  }

  if (/^\/incidents\/\d+\/?$/.test(pathname)) {
    return <CitizenIncidentPage />;
  }

  if (/^\/admin\/?$/.test(pathname)) {
    return <AdminDashboardPage />;
  }

  if (/^\/agency\/(police|fire|kepco|road|gas)\/?$/.test(pathname)) {
    return <AgencyDashboardPage />;
  }

  if (pathname === "/") {
    return <ReportPage />;
  }

  return <NotFoundPage />;
}
