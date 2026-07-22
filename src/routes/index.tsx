import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { IucLogo } from "@/components/iuc/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "E-Pay IUC Information System" }, { name: "description", content: "Innovative University College student & admin finance portal." }] }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--surface-blue)] px-6">
      <IucLogo className="h-20 mb-8" />
      <h1 className="text-4xl md:text-5xl font-semibold text-primary text-center max-w-2xl">E-Pay IUC Information System</h1>
      <p className="text-[var(--slate-text)] mt-4 text-center max-w-md">Manage tuition fees, payments and receipts for students and finance administrators.</p>
      <div className="flex flex-col sm:flex-row gap-4 mt-10">
        <Button asChild className="h-12 px-8 rounded-2xl bg-primary hover:bg-[var(--primary-hover)]"><Link to="/login/student">Student Login</Link></Button>
        <Button asChild variant="outline" className="h-12 px-8 rounded-2xl"><Link to="/login/admin">Admin Login</Link></Button>
      </div>
      <p className="text-xs text-[var(--slate-text)] mt-12 text-center">First-time setup: visit <code className="font-mono">/api/public/seed</code> to create demo accounts.</p>
    </div>
  );
}

