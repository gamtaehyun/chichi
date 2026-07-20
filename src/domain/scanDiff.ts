import type { SourceFile } from "./types";

function sourceGroupKey(source: SourceFile): string {
  const shotKey = source.shotId ?? source.pathOrUrl.split("/").find((part) => /^SH\d+/i.test(part)) ?? "unknown-shot";
  return `${source.projectId ?? "unknown-project"}:${shotKey}:${source.sourceType}`;
}

export function diffSources(previous: SourceFile[], current: SourceFile[]): SourceFile[] {
  const previousByPath = new Map(previous.map((source) => [source.pathOrUrl, source]));
  const result = current.map((source) => {
    const before = previousByPath.get(source.pathOrUrl);
    const changeStatus = !before ? "new" : before.modifiedAt !== source.modifiedAt ? "modified" : "unchanged";
    return { ...source, changeStatus } satisfies SourceFile;
  });

  const byGroup = new Map<string, SourceFile[]>();
  for (const source of result) {
    const key = sourceGroupKey(source);
    byGroup.set(key, [...(byGroup.get(key) ?? []), source]);
  }

  return result.map((source) => {
    const group = byGroup.get(sourceGroupKey(source)) ?? [];
    const versioned = group.filter((item) => typeof item.version === "number");
    const maxVersion = Math.max(...versioned.map((item) => item.version ?? 0));

    if (typeof source.version === "number" && source.version < maxVersion) {
      return { ...source, latestStatus: "superseded" };
    }

    if (typeof source.version === "number" && source.version === maxVersion) {
      return { ...source, latestStatus: "likely-latest" };
    }

    return source;
  });
}
