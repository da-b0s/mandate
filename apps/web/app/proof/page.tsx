import { redirect } from "next/navigation";

// Renamed to Explorer; keep old links working.
export default function Proof() {
  redirect("/explorer");
}
