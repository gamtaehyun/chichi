export interface ParsedFeedback {
  originalSource: string;
  originalText: string;
  instruction: string;
  shotCode?: string;
  confidence: number;
}

const actionWords = ["확인", "수정", "부탁", "올려", "낮춰", "강해", "약해", "밝", "어둡", "edge", "smoke", "roto", "plate", "fx"];

export function normalizeShotCode(line: string): string | undefined {
  const directMatch = line.match(/\b(SH)\s*[-_ ]?(\d{1,4}[A-Z]?)\b/i);
  if (directMatch) {
    return `SH${directMatch[2].toUpperCase().padStart(3, "0")}`;
  }

  const cutMatch = line.match(/(?:^|[^\d])(\d{1,4})\s*(?:컷|번\s*컷|shot|샷)/i);
  if (cutMatch) {
    return `SH${cutMatch[1].padStart(3, "0")}`;
  }

  return undefined;
}

export function parseFeedbackText(text: string, originalSource: string): ParsedFeedback[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => actionWords.some((word) => line.toLowerCase().includes(word.toLowerCase())))
    .map((line) => {
      const shotCode = normalizeShotCode(line);

      return {
        originalSource,
        originalText: line,
        instruction: shotCode ? line.replace(/\bSH\s*[-_ ]?\d{1,4}[A-Z]?\b/i, "").replace(/(?:^|[^\d])\d{1,4}\s*(?:컷|번\s*컷|shot|샷)/i, "").trim() : line,
        shotCode,
        confidence: shotCode ? 0.9 : 0.55
      };
    });
}
