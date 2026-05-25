import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useIucAuth } from "@/hooks/use-iuc-auth";
import { PortalShell } from "@/components/iuc/PortalShell";
import { LayoutDashboard, CreditCard, ScrollText, History, Receipt, User } from "lucide-react";

export const Route = createFileRoute("/student")({ component: StudentLayout });

function StudentLayout() {
  const { session, role, loading } = useIucAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/login/student" });
    else if (role && role !== "STUDENT") navigate({ to: "/admin/dashboard" });
  }, [session, role, loading, navigate]);
  if (loading || !session) return <div className="min-h-screen flex items-center justify-center text-sm text-[var(--slate-text)]">Loading…</div>;
  return (
    <PortalShell title="Student Portal" items={[
      { to: "/student/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
      { to: "/student/payment", label: "Make Payment", icon: <CreditCard className="w-4 h-4" /> },
      { to: "/student/ledger", label: "Ledger", icon: <ScrollText className="w-4 h-4" /> },
      { to: "/student/history", label: "Payment History", icon: <History className="w-4 h-4" /> },
      { to: "/student/receipt", label: "Receipts", icon: <Receipt className="w-4 h-4" /> },
      { to: "/student/profile", label: "Profile", icon: <User className="w-4 h-4" /> },
    ]}><Outlet /></PortalShell>
  );
}