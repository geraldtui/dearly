// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const useUserMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/use-user", () => ({ useUser: useUserMock }));

import SignupPopover from "@/components/SignupPopover";

const DISMISS_KEY = "dearly_signup_pop_dismissed";

beforeEach(() => {
  localStorage.clear();
  useUserMock.mockReturnValue({ user: null, loading: false });
});

describe("SignupPopover", () => {
  it("shows the signup pitch to logged-out visitors", () => {
    render(<SignupPopover />);
    expect(screen.getByText("Sign up to store your contacts")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign up free" })).toHaveAttribute("href", "/signup");
  });

  it("renders nothing while the session is loading", () => {
    useUserMock.mockReturnValue({ user: null, loading: true });
    const { container } = render(<SignupPopover />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for logged-in users", () => {
    useUserMock.mockReturnValue({ user: { id: "user-1" }, loading: false });
    const { container } = render(<SignupPopover />);
    expect(container).toBeEmptyDOMElement();
  });

  it("dismissal hides it and persists across renders", async () => {
    const user = userEvent.setup();
    const { container, unmount } = render(<SignupPopover />);

    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(container).toBeEmptyDOMElement();
    expect(localStorage.getItem(DISMISS_KEY)).toBe("1");

    unmount();
    const { container: second } = render(<SignupPopover />);
    expect(second).toBeEmptyDOMElement();
  });
});
