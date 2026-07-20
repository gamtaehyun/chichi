import { normalizeShotCode } from "./feedbackParser";
import { classifyPlateStatus, classifySourceType, extractVersion } from "./sourceClassifier";
import type { Project, Shot, SourceFile, SourceProvider } from "./types";

const urlPattern = /https?:\/\/[^\s]+/gi;
const sourceIntentWords = [
  "source",
  "plate",
  "beauty",
  "3d",
  "cg",
  "fx",
  "roto",
  "\uc18c\uc2a4",
  "\ub4e4\uc5b4\uc654",
  "\uc804\ub2ec",
  "\uc5c5\ub85c\ub4dc",
  "\ub9c1\ud06c",
  "\ubc1b\uc558",
  "\ud50c\ub808\uc774\ud2b8",
  "\ubdf0\ud2f0",
  "\ub85c\ud1a0"
];

function providerFromText(value: string): SourceProvider {
  const normalizedValue = value.toLowerCase();
  if (normalizedValue.includes("dropbox")) return "dropbox";
  if (normalizedValue.includes("drive.google") || normalizedValue.includes("google")) return "google-drive";
  return "manual";
}

function findShotFromText(text: string, project: Project, shots: Shot[]): Shot | undefined {
  const normalizedShotCode = normalizeShotCode(text)?.toLowerCase();
  const projectShots = shots.filter((item) => item.projectId === project.id);

  if (normalizedShotCode) {
    const matchedShot = projectShots.find((item) => item.code.toLowerCase() === normalizedShotCode);
    if (matchedShot) return matchedShot;
  }

  const normalizedText = text.toLowerCase();
  return projectShots.sort((a, b) => b.code.length - a.code.length).find((item) => normalizedText.includes(item.code.toLowerCase()));
}

function fileNameFromText(text: string, url?: string, shotCode = "UNKNOWN"): string {
  if (url) {
    try {
      const parsedUrl = new URL(url);
      const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
      const lastPathPart = decodeURIComponent(pathParts[pathParts.length - 1] ?? "");
      if (lastPathPart && lastPathPart.includes(".")) return lastPathPart;
    } catch {
      // Fall through to text-based naming when the pasted URL is not parseable.
    }
  }

  const fileMatch = text.match(/[A-Z0-9_-]+(?:plate|beauty|cleanplate|3d|cg|aov|fx|smoke|roto|alpha|mask)[A-Z0-9_.-]*/i);
  if (fileMatch) return fileMatch[0];

  const type = classifySourceType(text);
  const version = extractVersion(text) ?? extractLooseVersion(text);
  const versionSuffix = typeof version === "number" ? `_v${String(version).padStart(3, "0")}` : "";

  return `${shotCode}_${type}${versionSuffix}`;
}

function extractLooseVersion(text: string): number | undefined {
  const strictVersion = extractVersion(text);
  if (typeof strictVersion === "number") return strictVersion;

  const looseVersion = Number(text.match(/\bv\s*(\d{1,4})\b/i)?.[1] ?? "");
  return Number.isFinite(looseVersion) && looseVersion > 0 ? looseVersion : undefined;
}

function latestStatusForText(text: string, fileName: string): SourceFile["latestStatus"] {
  const normalizedText = `${text} ${fileName}`.toLowerCase();
  if (normalizedText.includes("final") || normalizedText.includes("\ucd5c\uc885")) return "needs-confirmation";
  return typeof extractLooseVersion(`${text} ${fileName}`) === "number" ? "likely-latest" : "needs-confirmation";
}

export function parseSourceIntake(text: string, project: Project, shots: Shot[], nowIso: string): SourceFile[] {
  const urls = text.match(urlPattern) ?? [];
  const normalizedText = text.toLowerCase();
  const hasSourceIntent = sourceIntentWords.some((word) => normalizedText.includes(word.toLowerCase()));
  if (!hasSourceIntent && urls.length === 0) return [];

  const shot = findShotFromText(text, project, shots);
  const targets = urls.length ? urls : [undefined];

  const parsedSources = targets.map((url, index): SourceFile | undefined => {
    const fileName = fileNameFromText(text, url, shot?.code);
    const sourceType = classifySourceType(`${text} ${fileName}`);

    if (sourceType === "reference" || sourceType === "feedback-media" || sourceType === "delivery" || sourceType === "other") {
      return undefined;
    }

    return {
      id: `src-chat-${project.id}-${shot?.id ?? "project"}-${Date.now()}-${index}`,
      projectId: project.id,
      shotId: shot?.id,
      fileName,
      pathOrUrl: url ?? `chat://${project.name}/${shot?.code ?? "unknown-shot"}/${fileName}`,
      provider: providerFromText(url ?? text),
      sourceType,
      version: extractLooseVersion(`${text} ${fileName}`),
      modifiedAt: nowIso,
      firstSeenAt: nowIso,
      latestStatus: latestStatusForText(text, fileName),
      plateStatus: sourceType === "plate" ? classifyPlateStatus(`${text} ${fileName}`) : undefined,
      changeStatus: "new"
    } satisfies SourceFile;
  });

  return parsedSources.filter((source): source is SourceFile => Boolean(source));
}
