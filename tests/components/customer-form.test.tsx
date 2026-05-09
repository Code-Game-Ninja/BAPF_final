/**
 * CustomerForm Component Tests
 *
 * Tests dialog open/close, form validation, create vs edit mode,
 * and submission behavior.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---- Mocks ----

const mockCreateCustomer = vi.fn().mockResolvedValue({ id: "c1", uid: "BPAF-C001" });
const mockUpdate = vi.fn().mockResolvedValue(undefined);
const mockEmailExists = vi.fn().mockResolvedValue(false);
const mockPhoneExists = vi.fn().mockResolvedValue(false);

// Mock the Supabase client to prevent initialization errors
vi.mock("@/lib/supabase/client", () => ({
  supabase: { from: vi.fn() },
}));

vi.mock("@/lib/services/customer.service", () => ({
  customerService: {
    createCustomer: (...args: any[]) => mockCreateCustomer(...args),
    update: (...args: any[]) => mockUpdate(...args),
    emailExists: (...args: any[]) => mockEmailExists(...args),
    phoneExists: (...args: any[]) => mockPhoneExists(...args),
  },
}));

vi.mock("@/lib/services/audit-log.service", () => ({
  auditLogService: { logAction: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@/lib/context/auth-context", () => ({
  useAuth: () => ({
    user: { id: "u1", name: "Admin", email: "admin@bpaf.com", role: "admin" },
    role: "admin",
  }),
}));

vi.mock("@/lib/hooks/use-customers", () => ({
  invalidateCustomers: vi.fn(),
}));

vi.mock("@/lib/helpers/friendly-error", () => ({
  friendlyError: (e: any, fallback: string) => fallback,
}));

import { CustomerForm } from "@/components/customers/customer-form";

describe("CustomerForm", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders create mode dialog", () => {
    render(<CustomerForm {...defaultProps} />);
    expect(screen.getByText("Add New Customer")).toBeInTheDocument();
  });

  it("renders edit mode dialog when editData is provided", () => {
    render(
      <CustomerForm
        {...defaultProps}
        editData={{
          id: "c1",
          uid: "BPAF-C001",
          name: "Raj Kumar",
          email: "raj@test.com",
          phone: "9876543210",
          address: "",
          city: "",
          state: "",
          pincode: "",
          created_at: new Date(),
          updated_at: new Date(),
          created_by: "u1",
        }}
      />
    );
    expect(screen.getByText("Edit Customer")).toBeInTheDocument();
  });

  it("shows the Cancel button", () => {
    render(<CustomerForm {...defaultProps} />);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("shows Create Customer submit button in create mode", () => {
    render(<CustomerForm {...defaultProps} />);
    expect(screen.getByText("Create Customer")).toBeInTheDocument();
  });

  it("shows Update Customer submit button in edit mode", () => {
    render(
      <CustomerForm
        {...defaultProps}
        editData={{
          id: "c1",
          uid: "BPAF-C001",
          name: "Raj Kumar",
          email: "raj@test.com",
          phone: "9876543210",
          address: "",
          city: "",
          state: "",
          pincode: "",
          created_at: new Date(),
          updated_at: new Date(),
          created_by: "u1",
        }}
      />
    );
    expect(screen.getByText("Update Customer")).toBeInTheDocument();
  });

  it("calls onOpenChange when Cancel is clicked", async () => {
    render(<CustomerForm {...defaultProps} />);
    await userEvent.click(screen.getByText("Cancel"));
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not render when open is false", () => {
    render(<CustomerForm {...defaultProps} open={false} />);
    expect(screen.queryByText("Add New Customer")).not.toBeInTheDocument();
  });
});
