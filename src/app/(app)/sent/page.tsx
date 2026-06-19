import { redirect } from "next/navigation";

/** Sent is superseded by the unified Chats view. */
export default function SentPage() {
  redirect("/voicenotes");
}
