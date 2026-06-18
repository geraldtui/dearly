import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { authGuardDisabled } from "@/lib/dev-auth";
import ChatList from "@/components/ChatList";
import ChatThread, { type ThreadCounterpart } from "@/components/ChatThread";
import {
  buildConversations,
  messagesForConversation,
  resolveSelectedKey,
  type ConversationMessage,
} from "@/lib/conversations";
import type { VoiceNote, ConversationLabel } from "@/lib/db/types";

export const metadata = { title: "Chats — Dearly" };

/** Resolve the email we can send to for the selected counterpart. */
async function resolveReplyEmail(
  storedEmail: string | null,
  accountId: string | null
): Promise<string | null> {
  if (storedEmail) return storedEmail;
  if (!accountId) return null;
  try {
    const service = createServiceClient();
    const { data } = await service
      .from("profiles")
      .select("email")
      .eq("id", accountId)
      .maybeSingle<{ email: string }>();
    return data?.email ?? null;
  } catch {
    return null;
  }
}

export default async function ChatsPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; new?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user && !authGuardDisabled()) redirect("/login");

  // RLS scopes rows to threads the user participates in; one query covers both
  // directions so each conversation merges sent + received.
  const { data } = user
    ? await supabase
        .from("voice_notes")
        .select("*")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
    : { data: [] };

  const notes = (data ?? []) as VoiceNote[];
  const userId = user?.id ?? "";

  // Owner's private labels (nickname override + sender alias), keyed by counterpart.
  const { data: labelRows } = user
    ? await supabase
        .from("conversation_labels")
        .select("counterpart_key, nickname, my_alias")
        .eq("owner_id", user.id)
    : { data: [] };
  const labels = new Map<string, Pick<ConversationLabel, "nickname" | "my_alias">>(
    (labelRows ?? []).map((l) => [l.counterpart_key, { nickname: l.nickname, my_alias: l.my_alias }])
  );

  const conversations = buildConversations(notes, userId).map((c) => {
    const label = labels.get(c.key);
    return {
      ...c,
      name: label?.nickname || c.name,
      nickname: label?.nickname ?? "",
      alias: label?.my_alias ?? "",
    };
  });

  const params = await searchParams;
  const newMode = params.new === "1";
  const selectedKey = newMode ? null : resolveSelectedKey(conversations, params.c);

  let mode: "conversation" | "new" | "empty" = "empty";
  let messages: ConversationMessage[] = [];
  let counterpart: ThreadCounterpart | null = null;

  if (newMode) {
    mode = "new";
  } else if (selectedKey) {
    const convo = conversations.find((c) => c.key === selectedKey)!;
    messages = messagesForConversation(notes, userId, selectedKey);
    const email = await resolveReplyEmail(convo.counterpartEmail, convo.counterpartId);
    mode = "conversation";
    counterpart = {
      key: selectedKey,
      name: convo.name,
      email,
      viaEmail: convo.viaEmail,
      canReply: Boolean(email),
    };
  }

  return (
    <div className="chat-layout">
      <ChatList conversations={conversations} selectedKey={selectedKey} newMode={newMode} />
      <ChatThread mode={mode} messages={messages} counterpart={counterpart} />
    </div>
  );
}
