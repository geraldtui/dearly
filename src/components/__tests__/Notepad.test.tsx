// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Notepad from "@/components/Notepad";

const STORAGE_KEY = "dearly:notepad";
const HINT_KEY = "dearly:notepad-hint";

beforeEach(() => {
  localStorage.clear();
});

describe("Notepad", () => {
  it("is closed by default and opens from the floating button", async () => {
    const user = userEvent.setup();
    render(<Notepad />);

    expect(screen.queryByRole("dialog", { name: "Notepad" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open notepad" }));
    const dialog = screen.getByRole("dialog", { name: "Notepad" });
    expect(dialog).toBeInTheDocument();

    // The floating button is also labeled "Close notepad" while open, so
    // target the close button inside the panel.
    await user.click(within(dialog).getByRole("button", { name: "Close notepad" }));
    expect(screen.queryByRole("dialog", { name: "Notepad" })).not.toBeInTheDocument();
  });

  it("persists text to localStorage and restores it on mount", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Notepad />);

    await user.click(screen.getByRole("button", { name: "Open notepad" }));
    await user.type(screen.getByRole("textbox"), "remember the cake");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("remember the cake");

    unmount();
    render(<Notepad />);
    await user.click(screen.getByRole("button", { name: "Open notepad" }));
    expect(screen.getByRole("textbox")).toHaveValue("remember the cake");
  });

  it("clears the text and removes it from storage", async () => {
    const user = userEvent.setup();
    render(<Notepad />);

    await user.click(screen.getByRole("button", { name: "Open notepad" }));
    await user.type(screen.getByRole("textbox"), "scratch this");
    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("shows the first-time hint and dismisses it permanently", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Notepad />);

    expect(await screen.findByRole("status")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dismiss notepad tip" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(localStorage.getItem(HINT_KEY)).toBe("1");

    unmount();
    render(<Notepad />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("dismisses the hint when the notepad is opened", async () => {
    const user = userEvent.setup();
    render(<Notepad />);

    expect(await screen.findByRole("status")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open notepad" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(localStorage.getItem(HINT_KEY)).toBe("1");
  });
});
