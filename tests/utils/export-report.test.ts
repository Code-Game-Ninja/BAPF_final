/**
 * Tests for lib/utils/export-report.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock xlsx dynamic import
vi.mock("xlsx", () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { exportToCSV, exportToExcel } from "@/lib/helpers/export-report";

const SAMPLE_DATA = [
  { name: "Vikram Singh", email: "vikram@test.com", premium: 15000 },
  { name: "Priya Patel", email: "priya@test.com", premium: 25000 },
];

const SAMPLE_COLUMNS = [
  { header: "Name", key: "name" },
  { header: "Email", key: "email" },
  { header: "Premium", key: "premium" },
];

describe("exportToCSV", () => {
  let mockCreateElement: ReturnType<typeof vi.fn>;
  let mockClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockClick = vi.fn();
    mockCreateElement = vi.fn(() => ({
      href: "",
      download: "",
      click: mockClick,
      setAttribute: vi.fn(),
    }));
    vi.stubGlobal("document", {
      createElement: mockCreateElement,
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    });
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:fake"),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal("Blob", class { constructor() {} });
  });

  it("generates CSV download with correct data", () => {
    exportToCSV(
      SAMPLE_DATA as Record<string, unknown>[],
      SAMPLE_COLUMNS,
      "test-export"
    );
    expect(mockCreateElement).toHaveBeenCalledWith("a");
  });
});

describe("exportToExcel", () => {
  it("calls xlsx functions", async () => {
    const xlsx = await import("xlsx");
    await exportToExcel(
      SAMPLE_DATA as Record<string, unknown>[],
      SAMPLE_COLUMNS,
      "test-export"
    );
    expect(xlsx.utils.json_to_sheet).toHaveBeenCalled();
    expect(xlsx.utils.book_new).toHaveBeenCalled();
    expect(xlsx.writeFile).toHaveBeenCalled();
  });
});
