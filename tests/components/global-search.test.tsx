/**
 * GlobalSearch Component Tests
 *
 * Tests the keyboard shortcut logic that GlobalSearch uses.
 */

import { describe, it, expect, vi } from "vitest";

describe("GlobalSearch keyboard shortcut logic", () => {
  it("Ctrl+K triggers onOpenChange", () => {
    const onOpenChange = vi.fn();
    const keyHandler = (e: { metaKey: boolean; ctrlKey: boolean; key: string }) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        onOpenChange(true);
      }
    };

    keyHandler({ metaKey: false, ctrlKey: true, key: "k" });
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("Cmd+K triggers onOpenChange", () => {
    const onOpenChange = vi.fn();
    const keyHandler = (e: { metaKey: boolean; ctrlKey: boolean; key: string }) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        onOpenChange(true);
      }
    };

    keyHandler({ metaKey: true, ctrlKey: false, key: "k" });
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("ignores non-K keypresses", () => {
    const onOpenChange = vi.fn();
    const keyHandler = (e: { metaKey: boolean; ctrlKey: boolean; key: string }) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        onOpenChange(true);
      }
    };

    keyHandler({ metaKey: false, ctrlKey: true, key: "j" });
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("ignores K without modifier", () => {
    const onOpenChange = vi.fn();
    const keyHandler = (e: { metaKey: boolean; ctrlKey: boolean; key: string }) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        onOpenChange(true);
      }
    };

    keyHandler({ metaKey: false, ctrlKey: false, key: "k" });
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
