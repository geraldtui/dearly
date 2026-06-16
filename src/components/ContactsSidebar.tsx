"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Contact } from "@/lib/contacts";

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

/** Second sidebar: the people in the current view (senders for Inbox, recipients for Sent). */
export default function ContactsSidebar({
  contacts,
  selectedKey,
  heading,
}: {
  contacts: Contact[];
  selectedKey: string | null;
  heading: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="contacts-sidebar" aria-label={heading}>
      <h2 className="contacts-heading">{heading}</h2>

      {contacts.length === 0 ? (
        <p className="contacts-empty">No one here yet.</p>
      ) : (
        <ul className="contacts-list">
          {contacts.map((c) => (
            <li key={c.key}>
              <Link
                href={`${pathname}?c=${encodeURIComponent(c.key)}`}
                className={`contact-item${c.key === selectedKey ? " active" : ""}`}
                aria-current={c.key === selectedKey ? "true" : undefined}
              >
                <span className="contact-avatar" aria-hidden="true">
                  {initial(c.name)}
                </span>
                <span className="contact-text">
                  <span className="contact-name">{c.name}</span>
                  {c.viaEmail && <span className="contact-via">via email</span>}
                </span>
                <span className="contact-count">{c.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
