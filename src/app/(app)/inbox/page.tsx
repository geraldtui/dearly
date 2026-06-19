import { redirect } from "next/navigation";

/** Inbox is superseded by the unified Chats view. */
export default function InboxPage() {
  redirect("/voicenotes");
}
