import { redirect } from "next/navigation";

/** @deprecated Usar /dashboard/terminal */
export default function VirtualTerminalRedirectPage() {
 redirect("/dashboard/terminal");
}
