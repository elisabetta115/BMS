import { redirect } from "next/navigation";

// Like the live site, signing in lands learners on "My Micro-credentials".
export default function DashboardPage() {
  redirect("/dashboard/my-credentials");
}
