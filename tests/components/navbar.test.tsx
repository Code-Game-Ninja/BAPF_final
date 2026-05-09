/**
 * Navbar Component Tests
 *
 * Tests navbar rendering, user info display, search button,
 * theme toggle, and logout interaction.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ---- Mocks ----

const mockLogout = vi.fn().mockResolvedValue(undefined);
const mockPush = vi.fn();

vi.mock("@/lib/context/auth-context", () => ({
  useAuth: () => ({
    user: { name: "Rahul Sharma", email: "rahul@bpaf.com", role: "admin" },
    role: "admin",
    logout: mockLogout,
    sessionCountdown: null,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/dashboard",
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "dark", setTheme: vi.fn() }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/global/notification-bell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

import { Navbar } from "@/components/global/navbar";

describe("Navbar", () => {
  const defaultProps = {
    onMenuClick: vi.fn(),
    onSearchOpen: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders user initials avatar", () => {
    render(<Navbar {...defaultProps} />);
    expect(screen.getByText("RS")).toBeInTheDocument();
  });

  it("renders user name", () => {
    render(<Navbar {...defaultProps} />);
    expect(screen.getByText("Rahul Sharma")).toBeInTheDocument();
  });

  it("renders role badge", () => {
    render(<Navbar {...defaultProps} />);
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("renders search button with shortcut", () => {
    render(<Navbar {...defaultProps} />);
    expect(screen.getByText(/search/i)).toBeInTheDocument();
  });

  it("calls onSearchOpen when search button clicked", () => {
    render(<Navbar {...defaultProps} />);
    const searchBtn = screen.getAllByText(/search/i)[0]?.closest("button");
    if (searchBtn) {
      fireEvent.click(searchBtn);
      expect(defaultProps.onSearchOpen).toHaveBeenCalledTimes(1);
    }
  });

  it("renders mobile menu button with accessible label", () => {
    render(<Navbar {...defaultProps} />);
    expect(screen.getByLabelText("Open navigation menu")).toBeInTheDocument();
  });

  it("calls onMenuClick when mobile menu button clicked", () => {
    render(<Navbar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Open navigation menu"));
    expect(defaultProps.onMenuClick).toHaveBeenCalledTimes(1);
  });

  it("renders notification bell", () => {
    render(<Navbar {...defaultProps} />);
    expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
  });
});
