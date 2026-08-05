import { redirect } from "next/navigation";

// Login has been removed — this route just forwards into the app.
export default function LoginPage() {
  redirect("/home");
}
