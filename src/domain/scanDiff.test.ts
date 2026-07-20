import { describe, expect, it } from "vitest";
import type { SourceFile } from "./types";
import { diffSources } from "./scanDiff";

const base: SourceFile = {
  id: "a",
  fileName: "SH030_FX_v003.exr",
  pathOrUrl: "/Project/SH030/FX/SH030_FX_v003.exr",
  provider: "dropbox",
  sourceType: "fx",
  version: 3,
  modifiedAt: "2026-07-02T10:00:00+09:00",
  firstSeenAt: "2026-07-02T10:00:00+09:00",
  latestStatus: "likely-latest",
  changeStatus: "unchanged"
};

describe("diffSources", () => {
  it("detects a new higher version and supersedes the old one", () => {
    const next: SourceFile = {
      ...base,
      id: "b",
      fileName: "SH030_FX_v004.exr",
      pathOrUrl: "/Project/SH030/FX/SH030_FX_v004.exr",
      version: 4,
      firstSeenAt: "2026-07-03T10:00:00+09:00"
    };

    const result = diffSources([base], [base, next]);

    expect(result.find((source) => source.id === "b")?.changeStatus).toBe("new");
    expect(result.find((source) => source.id === "b")?.latestStatus).toBe("likely-latest");
    expect(result.find((source) => source.id === "a")?.latestStatus).toBe("superseded");
  });

  it("marks modified files", () => {
    const modified = { ...base, modifiedAt: "2026-07-03T11:00:00+09:00" };
    const result = diffSources([base], [modified]);
    expect(result[0].changeStatus).toBe("modified");
  });
});
