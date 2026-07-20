import { describe, expect, it } from "vitest";
import { ChatPanel } from "./ChatPanel";

describe("ChatPanel confirmation flow", () => {
  it("keeps chat intake results as a pending change before applying them", () => {
    const source = ChatPanel.toString();

    expect(source).toContain("pendingChange");
    expect(source).toContain("setPendingChange");
    expect(source).not.toContain("onStateChange(result.state);");
  });
});
