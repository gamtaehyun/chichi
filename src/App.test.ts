import { describe, expect, it } from "vitest";
import App from "./App";

describe("App chrome", () => {
  it("does not expose manual backup and restore controls", () => {
    const source = App.toString();

    expect(source).not.toContain("handleExportBackup");
    expect(source).not.toContain("handleImportBackup");
    expect(source).not.toContain("dataTools");
  });
});
