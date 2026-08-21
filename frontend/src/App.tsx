import { ReportPage } from "./pages/ReportPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminMonitoringPage } from "./pages/AdminMonitoringPage";
import { AgencyDashboardPage } from "./pages/AgencyDashboardPage";
import { AnalysisResultPage } from "./pages/AnalysisResultPage";
import { CitizenIncidentPage } from "./pages/CitizenIncidentPage";
import { AuthPage } from "./pages/AuthPage";
import { MyReportsPage } from "./pages/MyReportsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { GuidePage } from "./pages/GuidePage";

export default function App() {
  const { pathname } = window.location;

  if (/^\/(login|register)\/?$/.test(pathname)) {
    return <AuthPage />;
  }

  if (/^\/reports\/me\/?$/.test(pathname)) {
    return <MyReportsPage />;
  }

  if (/^\/guide\/?$/.test(pathname)) {
    return <GuidePage />;
  }

  if (/^\/report\/analysis\/?$/.test(pathname)) {
    return <AnalysisResultPage />;
  }

  if (/^\/incidents\/\d+\/?$/.test(pathname)) {
    return <CitizenIncidentPage />;
  }

  if (/^\/admin\/monitoring\/?$/.test(pathname)) {
    return <AdminMonitoringPage />;
  }

  if (/^\/admin\/?$/.test(pathname)) {
    return <AdminDashboardPage />;
  }

  if (/^\/agency\/(police|fire|kepco|road|gas|local-gov)\/?$/.test(pathname)) {
    return <AgencyDashboardPage />;
  }

  if (pathname === "/") {
    return <ReportPage />;
  }

  return <NotFoundPage />;
}
