import { redirect } from "next/navigation";

// Login is disabled — the app opens straight into the archive.
export default function RootPage() {
  redirect("/home");
}
