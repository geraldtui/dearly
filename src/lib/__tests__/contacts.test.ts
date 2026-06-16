import { describe, expect, it } from "vitest";
import { buildContacts, contactKey, notesForContact, resolveSelectedKey } from "@/lib/contacts";
import type { VoiceNote } from "@/lib/db/types";

function note(partial: Partial<VoiceNote>): VoiceNote {
  return {
    id: crypto.randomUUID(),
    sender_id: null,
    recipient_id: null,
    sender_name: "",
    recipient_name: "",
    subject: null,
    storage_path: "x.mp3",
    duration_seconds: 5,
    listened_at: null,
    created_at: "2026-06-01T00:00:00.000Z",
    ...partial,
  };
}

describe("contactKey", () => {
  it("uses the counterpart account id when present", () => {
    const n = note({ sender_id: "abc", sender_name: "Mae" });
    expect(contactKey(n, "received")).toBe("abc");
  });

  it("falls back to a normalized name key when the id is null", () => {
    const n = note({ recipient_id: null, recipient_name: "Lee Ann" });
    expect(contactKey(n, "sent")).toBe("name:lee ann");
  });
});

describe("buildContacts", () => {
  it("groups received notes by sender, newest activity first", () => {
    const notes = [
      note({ sender_id: "a", sender_name: "Ada", created_at: "2026-06-03T00:00:00Z" }),
      note({ sender_id: "b", sender_name: "Bo", created_at: "2026-06-05T00:00:00Z" }),
      note({ sender_id: "a", sender_name: "Ada", created_at: "2026-06-01T00:00:00Z" }),
    ];
    const contacts = buildContacts(notes, "received");
    expect(contacts.map((c) => c.name)).toEqual(["Bo", "Ada"]);
    expect(contacts.find((c) => c.key === "a")?.count).toBe(2);
  });

  it("groups email-fallback recipients by name and flags viaEmail", () => {
    const notes = [note({ recipient_id: null, recipient_name: "Pat", sender_id: "me" })];
    const contacts = buildContacts(notes, "sent");
    expect(contacts[0].key).toBe("name:pat");
    expect(contacts[0].viaEmail).toBe(true);
  });

  it("does not flag account recipients as viaEmail", () => {
    const notes = [note({ recipient_id: "r1", recipient_name: "Sam", sender_id: "me" })];
    expect(buildContacts(notes, "sent")[0].viaEmail).toBe(false);
  });

  it("falls back to 'Someone' for nameless counterparts", () => {
    expect(buildContacts([note({ sender_id: "x", sender_name: "" })], "received")[0].name).toBe("Someone");
  });
});

describe("notesForContact", () => {
  it("returns only notes with the given contact key", () => {
    const notes = [
      note({ sender_id: "a", sender_name: "Ada" }),
      note({ sender_id: "b", sender_name: "Bo" }),
    ];
    expect(notesForContact(notes, "received", "a")).toHaveLength(1);
  });
});

describe("resolveSelectedKey", () => {
  const contacts = buildContacts(
    [
      note({ sender_id: "a", sender_name: "Ada", created_at: "2026-06-05Z" }),
      note({ sender_id: "b", sender_name: "Bo", created_at: "2026-06-01Z" }),
    ],
    "received"
  );

  it("keeps a requested key that matches a contact", () => {
    expect(resolveSelectedKey(contacts, "b")).toBe("b");
  });

  it("defaults to the first contact when the request is missing or stale", () => {
    expect(resolveSelectedKey(contacts, undefined)).toBe("a");
    expect(resolveSelectedKey(contacts, "ghost")).toBe("a");
  });

  it("returns null when there are no contacts", () => {
    expect(resolveSelectedKey([], undefined)).toBeNull();
  });
});
