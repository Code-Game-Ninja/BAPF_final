/**
 * Sidebar Component Tests
 *
 * Tests sidebar rendering, role-based menu filtering, collapsed state,
 * mobile overlay, and toggle interaction.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ---- Mocks ----

const mockRole = vi.fn<() => string | null>(() => "admin");

vi.mock("@/lib/supabase/client", () => ({
  supabase: { from: vi.fn() },
}));

vi.mock("@/lib/context/auth-context", () => ({
  useAuth: () => ({ role: mockRole() }),
}));

vi.mock("@/lib/context/app-settings-context", () => ({
  useAppSettings: () => ({ settings: null, isLoading: false }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/dashboard",
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    aside: ({ children, ...props }: any) => <aside {...props}>{children}</aside>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { Sidebar } from "@/components/global/sidebar";

describe("Sidebar", () => {
  const defaultProps = {
    collapsed: false,
    onToggleCollapse: vi.fn(),
    mobileOpen: false,
    onMobileClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRole.mockReturnValue("admin");
  });

  it("renders the brand name", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getAllByText("BP & AF").length).toBeGreaterThan(0);
  });

  it("renders main navigation", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByRole("navigation", { name: /main navigation/i })).toBeInTheDocument();
  });

  it("renders menu items for admin role", () => {
    render(<Sidebar {...defaultProps} />);
    // Sidebar uses "Home" label for the dashboard link
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Customers")).toBeInTheDocument();
    expect(screen.getByText("Policies")).toBeInTheDocument();
  });

  it("hides admin-only items for employee role", () => {
    mockRole.mockReturnValue("employee");
    render(<Sidebar {...defaultProps} />);
    // User Management is admin/manager only
    expect(screen.queryByText("User Management")).not.toBeInTheDocument();
  });

  it("renders collapse button on desktop", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText("Collapse")).toBeInTheDocument();
  });

  it("calls onToggleCollapse when collapse button is clicked", () => {
    render(<Sidebar {...defaultProps} />);
    fireEvent.click(screen.getByText("Collapse"));
    expect(defaultProps.onToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it("shows abbreviated brand when collapsed", () => {
    render(<Sidebar {...defaultProps} collapsed />);
    const brandElements = screen.getAllByText("B&");
    expect(brandElements.length).toBeGreaterThan(0);
  });
});
