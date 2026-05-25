import logo from "@/assets/iuc-logo.png";
export function IucLogo({ className = "h-12" }: { className?: string }) {
  return <img src={logo} alt="Innovative University College" className={className} />;
}