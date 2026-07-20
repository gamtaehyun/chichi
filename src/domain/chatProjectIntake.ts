import { normalizeShotCode } from "./feedbackParser";

const spreadsheetUrlPattern = /https?:\/\/docs\.google\.com\/spreadsheets\/d\/[^\s)\]]+/gi;
const slidesUrlPattern = /https?:\/\/docs\.google\.com\/presentation\/d\/[^\s)\]]+/gi;
const urlPattern = /https?:\/\/[^\s)\]]+/gi;

export interface ParsedShotListItem {
  code: string;
  dueDate?: string;
  workNote?: string;
}

function cleanUrl(url: string): string {
  return url.replace(/[\]),.]+$/g, "");
}

export function extractNewProjectName(text: string): string | undefined {
  const patterns = [
    /(?:새로운|새|신규)\s*프로젝트\s+([A-Z0-9][A-Z0-9_-]{1,})/i,
    /([A-Z0-9][A-Z0-9_-]{1,})\s*(?:이라는|라는)\s*프로젝트/i,
    /프로젝트(?:명|이름)?\s*[:：]\s*([A-Z0-9][A-Z0-9_-]{1,})/i,
    /([A-Z0-9][A-Z0-9_-]{1,})\s*프로젝트/i,
    /([A-Z0-9][A-Z0-9_-]{1,})\s*(?:샷\s*리스트|샷리스트|shot\s*list|shotlist)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim().toUpperCase();
  }

  return undefined;
}

export function extractSpreadsheetUrls(text: string): string[] {
  return [...new Set((text.match(spreadsheetUrlPattern) ?? []).map(cleanUrl))];
}

export function extractSlideUrls(text: string): string[] {
  return [...new Set((text.match(slidesUrlPattern) ?? []).map(cleanUrl))];
}

export function isShotListRequest(text: string): boolean {
  const normalizedText = text.toLowerCase();
  const intentWords = [
    "샷 리스트",
    "샷리스트",
    "샷 목록",
    "컷 리스트",
    "컷리스트",
    "컷 목록",
    "shot list",
    "shotlist",
    "제작 붙여넣기",
    "제작팀",
    "카톡",
    "카카오톡",
    "복붙",
    "붙여넣기",
    "google slides",
    "구글 슬라이드",
    "google sheets",
    "구글 시트"
  ];

  return intentWords.some((word) => normalizedText.includes(word));
}

export function googleSheetCsvUrl(url: string): string | undefined {
  const sheetId = url.match(/\/spreadsheets\/d\/([^/]+)/)?.[1];
  if (!sheetId) return undefined;
  const gid = url.match(/[?&]gid=(\d+)/)?.[1] ?? "0";
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
}

export function googleSlideTextUrl(url: string): string | undefined {
  const presentationId = url.match(/\/presentation\/d\/([^/]+)/)?.[1];
  if (!presentationId) return undefined;
  return `https://docs.google.com/presentation/d/${presentationId}/export/txt`;
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const nextChar = csv[index + 1];

    if (char === '"' && nextChar === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function normalizeDate(value: string): string | undefined {
  const yyyyMmDd = value.match(/\b(20\d{2})[-./](\d{1,2})[-./](\d{1,2})\b/);
  if (yyyyMmDd) {
    return `${yyyyMmDd[1]}-${yyyyMmDd[2].padStart(2, "0")}-${yyyyMmDd[3].padStart(2, "0")}`;
  }

  return undefined;
}

function normalizeShotCandidate(value: string, projectName?: string): string | undefined {
  const tcMatch = value.match(/\b\d{4}_[A-Z0-9]+_TC\d{6,}(?:\s*[-_]\s*\d+)?\b/i);
  if (tcMatch) return tcMatch[0].replace(/\s+/g, "").toUpperCase();

  const normalizedShotCode = normalizeShotCode(value);
  if (normalizedShotCode) return normalizedShotCode;

  const normalizedValue = value.toUpperCase();
  const projectKey = projectName?.trim().toUpperCase();
  const candidates = normalizedValue.match(/\b[A-Z][A-Z0-9]*(?:[_-][A-Z0-9]+)+\b|\b[A-Z]{1,}\d{2,4}(?:-\d{1,3})?[A-Z]?\b/g) ?? [];

  for (const candidate of candidates) {
    const normalized = candidate.trim().replace(/\s+/g, "_").toUpperCase();
    if (!/\d/.test(normalized)) continue;
    if (projectKey && normalized === projectKey) continue;
    if (normalized.length < 3) continue;
    return normalized;
  }

  const labeledNumber = value.match(/(?:샷|컷|cut|shot)\s*[:#_-]?\s*(\d{1,4}[A-Z]?)/i);
  if (labeledNumber) return `SH${labeledNumber[1].toUpperCase().padStart(3, "0")}`;

  if (projectKey) {
    const projectNumber = value.match(/\b(\d{2,4}[A-Z]?)\b/);
    if (projectNumber && !normalizeDate(value)) return `${projectKey}_${projectNumber[1].toUpperCase().padStart(3, "0")}`;
  }

  return undefined;
}

function cleanSlideInstruction(value: string): string | undefined {
  const cleaned = value
    .replace(/\b\d{4}_[A-Z0-9]+_TC\d{6,}(?:\s*[-_]\s*\d+)?\b/gi, "")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return looksLikeWorkNote(cleaned) ? cleaned : undefined;
}

function isSlideMetadataLine(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (/^LSF[-_ ]?VCR/i.test(trimmed)) return true;
  if (/^vcr\d*$/i.test(trimmed)) return true;
  if (/^(ai|2d|3d|fx|roto)$/i.test(trimmed)) return true;
  if (/^\d+\s*컷$/.test(trimmed)) return true;
  if (/^애니매틱\s*타임코드/i.test(trimmed)) return true;
  if (/^\d{2}:\d{2}(?:\s*,\s*\d{2}:\d{2})*\s*$/.test(trimmed)) return true;
  if (/^(김태현|태현|yss studio)$/i.test(trimmed)) return true;
  return false;
}

function isLikelySlideTitle(value: string): boolean {
  const trimmed = value.trim();
  if (isSlideMetadataLine(trimmed)) return false;
  if (normalizeShotCandidate(trimmed)) return false;
  if (trimmed.includes("해주세요") || trimmed.includes("지워")) return false;
  return /[가-힣A-Za-z]/.test(trimmed) && trimmed.length <= 60;
}

export function parseSlideShotListText(text: string, projectName?: string): ParsedShotListItem[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const byCode = new Map<string, ParsedShotListItem>();
  let currentTitle = "";
  let currentInstruction = "";
  let hasCodeInCurrentBlock = false;

  lines.forEach((line) => {
    const codeMatches = line.match(/\b\d{4}_[A-Z0-9]+_TC\d{6,}(?:\s*[-_]\s*\d+)?\b/gi) ?? [];

    if (codeMatches.length > 0) {
      const inlineInstruction = cleanSlideInstruction(line);
      const fallbackInstruction = [currentTitle, currentInstruction].filter(Boolean).join(" / ").trim();
      const workNote = inlineInstruction ?? (fallbackInstruction || undefined);

      codeMatches.forEach((match) => {
        const code = match.replace(/\s+/g, "").toUpperCase();
        if (!byCode.has(code)) byCode.set(code, { code, dueDate: undefined, workNote });
      });
      hasCodeInCurrentBlock = true;
      return;
    }

    if (isLikelySlideTitle(line)) {
      if (!currentTitle || hasCodeInCurrentBlock || /\d+\s*컷\s*$/.test(line)) {
        currentTitle = line.replace(/\s*\d+\s*컷\s*$/, "").trim();
        currentInstruction = "";
        hasCodeInCurrentBlock = false;
      } else {
        currentInstruction = [currentInstruction, line].filter(Boolean).join(" ");
      }
      return;
    }

    if (!isSlideMetadataLine(line) && looksLikeWorkNote(line)) {
      currentInstruction = [currentInstruction, line].filter(Boolean).join(" ");
    }
  });

  if (byCode.size > 0) return [...byCode.values()];
  return parseShotListText(text, projectName);
}

function looksLikeHeader(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("cut name") ||
    normalized.includes("src name") ||
    normalized.includes("shot no") ||
    normalized.includes("preview") ||
    normalized.includes("scene")
  );
}

function looksLikeWorkNote(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (looksLikeHeader(trimmed)) return false;
  if (normalizeDate(trimmed)) return false;
  if (normalizeShotCandidate(trimmed)) return false;
  if (/^\d+$/.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed)) return false;
  return /[가-힣A-Za-z]/.test(trimmed);
}

function findHeaderIndex(rows: string[][]): number {
  return rows.findIndex((row) => row.some((cell) => /cut\s*name|src\s*name/i.test(cell)));
}

function findCutNameColumn(headerRow: string[]): number | undefined {
  const index = headerRow.findIndex((cell) => /cut\s*name|src\s*name/i.test(cell));
  return index >= 0 ? index : undefined;
}

function findWorkNote(row: string[], codeIndex?: number): string | undefined {
  const startIndex = typeof codeIndex === "number" ? codeIndex + 1 : 0;
  return row.slice(startIndex).find(looksLikeWorkNote) ?? row.find(looksLikeWorkNote);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function workNoteFromLine(line: string, code: string, dueDate?: string): string | undefined {
  let note = line.replace(urlPattern, " ");
  note = note.replace(new RegExp(escapeRegExp(code), "gi"), " ");

  const shMatch = code.match(/^SH0*(\d{1,4}[A-Z]?)$/i);
  if (shMatch) {
    note = note.replace(new RegExp(`(?:샷|컷|cut|shot)\\s*[:#_-]?\\s*0*${escapeRegExp(shMatch[1])}`, "gi"), " ");
  }

  if (dueDate) note = note.replace(new RegExp(escapeRegExp(dueDate), "g"), " ");
  note = note.replace(/\b20\d{2}[-./]\d{1,2}[-./]\d{1,2}\b/g, " ");
  note = note.replace(/^\s*\[[^\]]+\]\s*/, " ");
  note = note.replace(/\s*[-:|,]\s*$/g, " ");
  note = note.replace(/\s+/g, " ").trim();

  return looksLikeWorkNote(note) ? note : undefined;
}

function parseShotRowsFromRows(rows: string[][], projectName?: string): ParsedShotListItem[] {
  const byCode = new Map<string, ParsedShotListItem>();
  const headerIndex = findHeaderIndex(rows);
  const cutNameColumn = headerIndex >= 0 ? findCutNameColumn(rows[headerIndex]) : undefined;

  for (const [rowIndex, row] of rows.entries()) {
    if (rowIndex === headerIndex) continue;
    const line = row.join(" ");
    if (urlPattern.test(line)) {
      urlPattern.lastIndex = 0;
      continue;
    }
    urlPattern.lastIndex = 0;

    const codeFromCutColumn = typeof cutNameColumn === "number" ? normalizeShotCandidate(row[cutNameColumn] ?? "", projectName) : undefined;
    const code = codeFromCutColumn ?? row.map((cell) => normalizeShotCandidate(cell, projectName)).find(Boolean) ?? normalizeShotCandidate(line, projectName);
    if (!code) continue;

    const dueDate = row.map(normalizeDate).find(Boolean) ?? normalizeDate(line);
    const workNote =
      findWorkNote(row, typeof cutNameColumn === "number" ? cutNameColumn : row.findIndex((cell) => normalizeShotCandidate(cell, projectName) === code)) ??
      workNoteFromLine(line, code, dueDate);

    if (!byCode.has(code)) byCode.set(code, { code, dueDate, workNote });
  }

  return [...byCode.values()];
}

export function parseShotListText(text: string, projectName?: string): ParsedShotListItem[] {
  const textWithoutUrls = text.replace(urlPattern, " ");
  const rows = textWithoutUrls
    .split(/\r?\n/)
    .map((line) => line.split(/\t|,|\s{2,}| \| /).map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));

  return parseShotRowsFromRows(rows, projectName);
}

export function parseShotListCsv(csv: string, projectName?: string): ParsedShotListItem[] {
  return parseShotRowsFromRows(parseCsvRows(csv), projectName);
}
