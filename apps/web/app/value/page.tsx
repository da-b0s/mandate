import { redirect } from "next/navigation";

// The nav says "Value"; keep the guessable URL working.
export default function Value() {
  redirect("/dashboard");
}
