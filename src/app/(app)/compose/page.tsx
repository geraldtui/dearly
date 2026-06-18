import { redirect } from "next/navigation";

/** Standalone compose is superseded by "New chat" in the Chats view. */
export default function ComposePage() {
  redirect("/chats?new=1");
}
