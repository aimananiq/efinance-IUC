import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useIucAuth } from "@/hooks/use-iuc-auth";
import { PortalShell } from "@/components/iuc/PortalShell";
import { LayoutDashboard, Users, ListChecks, CheckCircle2, Receipt, Bell, History, Settings, FileSpreadsheet, GraduationCap, FileBarChart } from "lucide-react";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

function AdminLayout() {
  const { session, role, loading } = useIucAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/login/admin", replace: true });
    } else if (role !== "ADMIN") {
      navigate({ to: role === "STUDENT" ? "/student/dashboard" : "/payment", replace: true });
    }
  }, [session, role, loading, navigate]);
  if (loading || !session || role !== "ADMIN") return <div className="min-h-screen flex items-center justify-center text-sm text-[var(--slate-text)]">Loading…</div>;
  return (
    <PortalShell title="Admin Portal" items={[
      { to: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
      { to: "/admin/students", label: "Students", icon: <Users className="w-4 h-4" /> },
      { to: "/admin/fee-structure", label: "Fee Structure", icon: <FileSpreadsheet className="w-4 h-4" /> },
      { to: "/admin/fees", label: "Fee Management", icon: <ListChecks className="w-4 h-4" /> },
      { to: "/admin/ptptn", label: "PTPTN", icon: <GraduationCap className="w-4 h-4" /> },
      { to: "/admin/payments", label: "Verify Payments", icon: <CheckCircle2 className="w-4 h-4" /> },
      { to: "/admin/receipts", label: "Receipts", icon: <Receipt className="w-4 h-4" /> },
      { to: "/admin/notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
      { to: "/admin/reports", label: "Reports", icon: <FileBarChart className="w-4 h-4" /> },
      { to: "/admin/history", label: "Audit History", icon: <History className="w-4 h-4" /> },
      { to: "/admin/settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
    ]}><Outlet /></PortalShell>
  );
}