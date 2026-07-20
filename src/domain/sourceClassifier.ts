import type { PlateStatus, SourceType } from "./types";

export function classifySourceType(fileName: string): SourceType {
  const name = fileName.toLowerCase();
  if (name.includes("roto") || name.includes("alpha") || name.includes("mask") || name.includes("\ub85c\ud1a0") || name.includes("\ub9c8\uc2a4\ud06c")) return "roto";
  if (name.includes("fx") || name.includes("smoke") || name.includes("fire") || name.includes("debris") || name.includes("\uc5f0\uae30") || name.includes("\ubd88") || name.includes("\ud30c\ud2f0\ud074")) return "fx";
  if (name.includes("3d") || name.includes("cg") || name.includes("aov") || name.includes("renderlayer") || name.includes("\ub80c\ub354")) return "3d";
  if (
    name.includes("plate") ||
    name.includes("cleanplate") ||
    name.includes("beauty") ||
    name.includes("denoise") ||
    name.includes("\ud50c\ub808\uc774\ud2b8") ||
    name.includes("\ubdf0\ud2f0") ||
    name.includes("\ud074\ub9b0\ud50c\ub808\uc774\ud2b8")
  )
    return "plate";
  if (name.includes("ref") || name.includes("reference")) return "reference";
  if (name.includes("delivery") || name.includes("deliver")) return "delivery";
  return "other";
}

export function extractVersion(fileName: string): number | undefined {
  const versionMatch = fileName.match(/(?:^|[_\-.])v(\d{1,4})(?:[_\-.]|$)/i);
  if (versionMatch) return Number(versionMatch[1]);

  const revisionMatch = fileName.match(/(?:^|[_\-.])rev(\d{1,4})(?:[_\-.]|$)/i);
  if (revisionMatch) return Number(revisionMatch[1]);

  return undefined;
}

export function classifyPlateStatus(fileName: string): PlateStatus {
  const name = fileName.toLowerCase();
  if (name.includes("final") || name.includes("\ucd5c\uc885")) return "final";
  if (name.includes("beauty") || name.includes("cleanplate") || name.includes("denoise") || name.includes("retime") || name.includes("\ubdf0\ud2f0") || name.includes("\ubcf4\uc815")) {
    return "beauty-corrected";
  }
  if (name.includes("raw") || name.includes("original") || name.includes("\uc6d0\ubcf8")) return "original";
  return "uncertain";
}
