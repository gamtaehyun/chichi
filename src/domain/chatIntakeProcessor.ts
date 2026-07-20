import { addFeedback, addFinanceEntry, addProject, addProjectLink, addShot, addSourceFiles, addTask, updateProject, updateShot, updateShotSourceCheck, updateTask } from "./stateActions";
import {
  extractNewProjectName,
  extractSlideUrls,
  extractSpreadsheetUrls,
  googleSheetCsvUrl,
  googleSlideTextUrl,
  isShotListRequest,
  parseSlideShotListText,
  parseShotListCsv,
  parseShotListText,
  type ParsedShotListItem
} from "./chatProjectIntake";
import { normalizeShotCode, parseFeedbackText, type ParsedFeedback } from "./feedbackParser";
import { parseSourceIntake } from "./sourceIntake";
import type { ChichiState, FeedbackAttachment, FinanceEntry, Project, Shot, SourceCheckKey, SourceCheckStatus, WorkStatus } from "./types";

const urlPattern = /https?:\/\/[^\s)\]]+/gi;

export interface ChatIntakeResult {
  state: ChichiState;
  message: string;
}

interface ProcessChatIntakeOptions {
  attachments?: FeedbackAttachment[];
  contextProjectId?: string;
  now?: Date;
  readCsv?: (url: string) => Promise<string | undefined>;
  readPresentationText?: (url: string) => Promise<string | undefined>;
}

function today(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function formatWon(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

function sourceCheckKeyLabel(key: SourceCheckKey): string {
  if (key === "plate-original") return "원본 플레이트";
  if (key === "plate-beauty") return "뷰티 보정";
  if (key === "3d") return "3D";
  if (key === "fx") return "FX";
  return "로토";
}

function sourceCheckStatusLabel(status: SourceCheckStatus): string {
  if (status === "confirmed") return "확인";
  if (status === "issue") return "문제";
  if (status === "not-needed") return "없음";
  return "미전달";
}

function cleanUrl(url: string): string {
  return url.replace(/[\]),.]+$/g, "");
}

function findProject(projects: Project[], message: string): Project | undefined {
  const normalizedMessage = message.toLowerCase();
  const matchedProject = projects.find((project) => {
    const names = [project.name, project.client].filter(Boolean).map((value) => value.toLowerCase());
    return names.some((name) => normalizedMessage.includes(name));
  });

  return matchedProject ?? (projects.length === 1 ? projects[0] : undefined);
}

function classifyLink(url: string): "driveFolders" | "dropboxFolders" | "feedbackLinks" {
  const normalizedUrl = url.toLowerCase();

  if (normalizedUrl.includes("dropbox.com")) return "dropboxFolders";
  if (normalizedUrl.includes("docs.google.com/spreadsheets") || normalizedUrl.includes("docs.google.com/presentation")) return "feedbackLinks";
  return "driveFolders";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractInstruction(message: string, project: Project, urls: string[]): string {
  let instruction = message;

  urls.forEach((url) => {
    instruction = instruction.replace(url, "");
  });

  instruction = instruction.replace(new RegExp(escapeRegExp(project.name), "gi"), "");
  if (project.client) {
    instruction = instruction.replace(new RegExp(escapeRegExp(project.client), "gi"), "");
  }
  return instruction.replace(/\s+/g, " ").trim();
}

function findShot(project: Project, shots: Shot[], shotCode?: string): Shot | undefined {
  if (!shotCode) return undefined;
  return shots.find((shot) => shot.projectId === project.id && shot.code.toLowerCase() === shotCode.toLowerCase());
}

function parseNaturalDate(message: string, now: Date): string | undefined {
  const isoDate = message.match(/\b(20\d{2})[-./](\d{1,2})[-./](\d{1,2})\b/);
  if (isoDate) return `${isoDate[1]}-${isoDate[2].padStart(2, "0")}-${isoDate[3].padStart(2, "0")}`;

  const koreanDate = message.match(/(?:(20\d{2})\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (koreanDate) {
    const year = koreanDate[1] ?? String(now.getFullYear());
    return `${year}-${koreanDate[2].padStart(2, "0")}-${koreanDate[3].padStart(2, "0")}`;
  }

  return undefined;
}

function findMentionedShot(project: Project, shots: Shot[], message: string): Shot | undefined {
  const projectShots = shots.filter((shot) => shot.projectId === project.id).sort((a, b) => b.code.length - a.code.length);
  const normalizedMessage = message.toLowerCase();

  return projectShots.find((shot) => normalizedMessage.includes(shot.code.toLowerCase()));
}

function stripMentionedShotCode(message: string, shot?: Shot): string {
  if (!shot) return message.trim();
  return message.replace(new RegExp(`\\b${escapeRegExp(shot.code)}(?:\\s*번)?\\b`, "gi"), "").replace(/\s+/g, " ").trim();
}

function splitChatClauses(message: string): string[] {
  return message
    .split(/[\n.。]+/)
    .map((clause) => clause.trim())
    .filter(Boolean);
}

function isOperationalClause(message: string): boolean {
  return Boolean(
    hasReadableDateIntent(message) ||
      readablePriorityFromText(message) ||
      readableStatusFromText(message) ||
      parseAssigneeCommand(message) ||
      parseSourceChecklistCommands(message).length > 0 ||
      parseFinanceCommand(message)
  );
}

function extractFeedbackInstructionFromMixedCommand(message: string, shot?: Shot): string {
  const baseInstruction = stripMentionedShotCode(message, shot);
  if (!isOperationalClause(baseInstruction)) return baseInstruction;

  return splitChatClauses(baseInstruction)
    .map((clause) => stripMentionedShotCode(clause, shot))
    .filter((clause) => clause.length >= 4 && !isOperationalClause(clause))
    .join(". ");
}

function detectTaskStatus(message: string): WorkStatus | undefined {
  if (/작업\s*(종료|완료|끝)/.test(message)) return "done";
  if (/작업\s*(중|시작|진행)/.test(message)) return "in-progress";
  if (/작업\s*(예정|등록|추가)/.test(message)) return "not-started";
  return undefined;
}

function parseCommandDate(message: string, now: Date): string | undefined {
  const isoDate = message.match(/\b(20\d{2})[-./](\d{1,2})[-./](\d{1,2})\b/);
  if (isoDate) return `${isoDate[1]}-${isoDate[2].padStart(2, "0")}-${isoDate[3].padStart(2, "0")}`;

  const slashDate = message.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (slashDate) return `${now.getFullYear()}-${slashDate[1].padStart(2, "0")}-${slashDate[2].padStart(2, "0")}`;

  const koreanDate = message.match(/(?:(20\d{2})\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일?/);
  if (koreanDate) {
    const year = koreanDate[1] ?? String(now.getFullYear());
    return `${year}-${koreanDate[2].padStart(2, "0")}-${koreanDate[3].padStart(2, "0")}`;
  }

  if (message.includes("내일")) {
    const date = new Date(now);
    date.setDate(date.getDate() + 1);
    return today(date);
  }

  if (message.includes("오늘")) return today(now);
  return undefined;
}

function hasDateIntent(message: string): boolean {
  return /마감|납품|일자|due|deadline/i.test(message);
}

function hasReadableDateIntent(message: string): boolean {
  return /(\uB9C8\uAC10|\uB0A9\uD488|\uC77C\uC790|due|deadline)/i.test(message) || hasDateIntent(message);
}

function hasProjectDeliveryDateIntent(message: string): boolean {
  return /(\uCD5C\uC885\s*)?\uB0A9\uD488\s*\uC77C|\uB0A9\uD488\s*\uB9C8\uAC10/i.test(message);
}

function parseReadableCommandDate(message: string, now: Date): string | undefined {
  const isoDate = message.match(/\b(20\d{2})[-./](\d{1,2})[-./](\d{1,2})\b/);
  if (isoDate) return `${isoDate[1]}-${isoDate[2].padStart(2, "0")}-${isoDate[3].padStart(2, "0")}`;

  const slashDate = message.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (slashDate) return `${now.getFullYear()}-${slashDate[1].padStart(2, "0")}-${slashDate[2].padStart(2, "0")}`;

  const koreanDate = message.match(/(?:(20\d{2})\s*\uB144\s*)?(\d{1,2})\s*\uC6D4\s*(\d{1,2})\s*\uC77C/);
  if (koreanDate) {
    const year = koreanDate[1] ?? String(now.getFullYear());
    return `${year}-${koreanDate[2].padStart(2, "0")}-${koreanDate[3].padStart(2, "0")}`;
  }

  if (message.includes("\uB0B4\uC77C")) {
    const date = new Date(now);
    date.setDate(date.getDate() + 1);
    return today(date);
  }

  if (message.includes("\uC624\uB298")) return today(now);
  return parseCommandDate(message, now);
}

function priorityFromText(message: string): number | undefined {
  const explicitPriority = message.match(/\bp\s*([1-5])\b/i);
  if (explicitPriority) return Number(explicitPriority[1]);
  if (/티저|최우선|급해|급한|먼저|중요/.test(message)) return 5;
  if (/우선/.test(message)) return 4;
  return undefined;
}

function statusFromText(message: string): WorkStatus | undefined {
  if (/완료|끝났|납품/.test(message)) return "done";
  if (/진행중|작업중|시작/.test(message)) return "in-progress";
  if (/리뷰|검수|확인\s*중/.test(message)) return "review";
  if (/막힘|홀드|보류|확인\s*필요|이슈/.test(message)) return "blocked";
  if (/대기|예정/.test(message)) return "not-started";
  return detectTaskStatus(message);
}

function isOperationalCommand(message: string): boolean {
  return Boolean(
    hasReadableDateIntent(message) ||
      readablePriorityFromText(message) ||
      readableStatusFromText(message) ||
      parseAssigneeCommand(message) ||
      parseSourceChecklistCommand(message).length > 0 ||
      parseFinanceCommand(message)
  );
}

function readablePriorityFromText(message: string): number | undefined {
  const explicitPriority = message.match(/\bp\s*([1-5])\b/i);
  if (explicitPriority) return Number(explicitPriority[1]);
  if (/(\uD2F0\uC800|\uCD5C\uC6B0\uC120|\uAE09\uD574|\uAE09\uD55C|\uBA3C\uC800|\uC911\uC694)/.test(message)) return 5;
  if (/\uC6B0\uC120/.test(message)) return 4;
  return priorityFromText(message);
}

function readableStatusFromText(message: string): WorkStatus | undefined {
  if (/(\uC791\uC5C5\s*\uC885\uB8CC|\uD504\uB85C\uC81D\uD2B8\s*\uC885\uB8CC|\uC885\uB8CC\uB410|\uC644\uB8CC|\uB05D\uB0AC|\uB0A9\uD488)/.test(message)) return "done";
  if (/(\uC791\uC5C5\s*\uC911|\uC9C4\uD589\s*\uC911|\uC2DC\uC791)/.test(message)) return "in-progress";
  if (/(\uB9AC\uBDF0|\uAC80\uC218|\uD655\uC778\s*\uC911)/.test(message)) return "review";
  if (/(\uB9C9\uD798|\uD640\uB4DC|\uBCF4\uB958|\uD655\uC778\s*\uD544\uC694|\uC774\uC288)/.test(message)) return "blocked";
  if (/(\uC608\uC815|\uB300\uAE30)/.test(message)) return "not-started";
  return statusFromText(message);
}

function parseAssigneeCommand(message: string): string | undefined {
  if (!/(\uB2F4\uB2F9|\uC678\uC8FC|\uB0B4\uAC00|\uB0B4\s*\uC791\uC5C5|\uD560\uAC8C|\uB9E1)/.test(message)) return undefined;
  if (/(\uB0B4\uAC00|\uB0B4\s*\uC791\uC5C5|\uB098\s*(?:\uAC00)?\s*(?:\uD560|\uB2F4\uB2F9)|\uD560\uAC8C)/.test(message)) return "\uB098";

  const candidate =
    message.match(/([가-힣A-Za-z0-9_]{2,20})\s*(?:\uC5D0\uAC8C|\uD55C\uD14C)?\s*(?:\uC678\uC8FC|\uB9E1|\uB2F4\uB2F9)/)?.[1] ??
    message.match(/(?:\uB2F4\uB2F9|\uC678\uC8FC(?:\uC791\uC5C5\uC790)?)\s*(?:\uC740|\uB294|:)?\s*([가-힣A-Za-z0-9_]{2,20})/)?.[1];

  if (!candidate) return undefined;
  if (/^(?:\uD504\uB85C\uC81D\uD2B8|\uC791\uC5C5|\uB0B4\uAC00|\uB0B4|\uC678\uC8FC)$/.test(candidate)) return undefined;
  return candidate;
}

function keyMatchesText(message: string, key: SourceCheckKey): boolean {
  if (key === "plate-original") return /(\uC6D0\uBCF8\s*\uD50C\uB808\uC774\uD2B8|\uC6D0\uBCF8)/.test(message);
  if (key === "plate-beauty") return /(\uBDF0\uD2F0|\uBCF4\uC815|\uCD5C\uC885\uBCF8|\uD50C\uB808\uC774\uD2B8\s*\uCD5C\uC885)/.test(message);
  if (key === "3d") return /\b(?:3d|cg)\b/i.test(message);
  if (key === "fx") return /\bfx\b/i.test(message);
  return /(\uB85C\uD1A0|roto)/i.test(message);
}

function checklistStatusFromText(message: string): SourceCheckStatus | undefined {
  if (/(\uBBF8\uC804\uB2EC|\uC544\uC9C1|\uC548\s*\uC654|\uBABB\s*\uBC1B|\uC804\uB2EC\s*\uC548)/.test(message)) return "pending";
  if (/(\uBB38\uC81C|\uC774\uC288|\uC624\uB958|\uD655\uC778\s*\uD544\uC694|\uC548\s*\uB9DE|\uB204\uB77D)/.test(message)) return "issue";
  if (/(\uD655\uC778|\uC644\uB8CC|\uCD5C\uC2E0|\uCD5C\uC885|\uB4E4\uC5B4\uC654|\uBC1B\uC558)/.test(message)) return "confirmed";
  return undefined;
}

function parseSourceChecklistCommands(message: string): Array<{ key: SourceCheckKey; status: SourceCheckStatus; note: string }> {
  const keys: SourceCheckKey[] = ["plate-original", "plate-beauty", "3d", "fx", "roto"];
  const clauses = message.split(/[\n.,。]|(?:\uADF8\uB9AC\uACE0)|(?:\uD558?[\uACE0]\s*)/).map((clause) => clause.trim()).filter(Boolean);
  const updates: Array<{ key: SourceCheckKey; status: SourceCheckStatus; note: string }> = [];

  keys.forEach((key) => {
    const clause = clauses.find((item) => keyMatchesText(item, key)) ?? (keyMatchesText(message, key) ? message : "");
    if (!clause) return;

    const status = checklistStatusFromText(clause);
    if (!status) return;
    updates.push({ key, status, note: status === "confirmed" ? "채팅으로 확인" : status === "issue" ? "채팅에서 문제로 표시" : "채팅에서 미전달로 표시" });
  });

  return updates;
}

function parseSourceChecklistCommand(message: string): SourceCheckKey[] {
  return parseSourceChecklistCommands(message).map((item) => item.key);
}

function parseMoneyAmount(message: string): number | undefined {
  const matches = [...message.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(\uC5B5|\uCC9C\uB9CC|\uBC31\uB9CC|\uB9CC)?\s*(\uC6D0)?/g)];
  const match =
    matches.find((item) => Boolean(item[2] || item[3])) ??
    matches.find((item) => item[1].includes(",") || item[1].replace(/,/g, "").length >= 5);
  if (!match) return undefined;

  const base = Number(match[1].replace(/,/g, ""));
  const unit = match[2];
  if (!Number.isFinite(base)) return undefined;
  if (unit === "\uC5B5") return base * 100000000;
  if (unit === "\uCC9C\uB9CC") return base * 10000000;
  if (unit === "\uBC31\uB9CC") return base * 1000000;
  if (unit === "\uB9CC") return base * 10000;
  return base;
}

function parseFinanceCommand(message: string): Pick<FinanceEntry, "label" | "kind" | "amount"> | undefined {
  const amount = parseMoneyAmount(message);
  if (!amount) return undefined;

  if (/(\uACC4\uC57D\uAE08|\uC794\uAE08|\uBC1B|\uC785\uAE08|\uC218\uAE08)/.test(message)) {
    const label = message.includes("\uCD1D\uC561") ? "\uCD1D\uC561" : message.includes("\uC794\uAE08") ? "\uC794\uAE08" : message.includes("\uACC4\uC57D\uAE08") ? "\uACC4\uC57D\uAE08" : "\uBC1B\uC740 \uAE08\uC561";
    return { label, kind: "income", amount };
  }

  if (/(\uBBF8\uC218|\uC544\uC9C1\s*\uBABB\s*\uBC1B)/.test(message)) return { label: "\uBBF8\uC218\uAE08", kind: "unpaid", amount };
  if (/(\uD504\uB9AC\uB79C\uC11C|\uC678\uC8FC)/.test(message)) return { label: "\uC678\uC8FC\uBE44", kind: "freelancer-cost", amount };
  if (/(\uC0AC\uC5C5\uC790|\uC5C5\uCCB4)/.test(message)) return { label: "\uC0AC\uC5C5\uC790 \uBE44\uC6A9", kind: "contractor-cost", amount };
  if (/\bai\b/i.test(message) || /\uC778\uACF5\uC9C0\uB2A5/.test(message)) return { label: "AI \uBE44\uC6A9", kind: "ai-cost", amount };
  if (/(\uC18C\uC2A4\s*\uAD6C\uB9E4|\uC18C\uC2A4\uBE44|\uC5D0\uC14B|\uC5D0\uC14B)/.test(message)) return { label: "\uC18C\uC2A4 \uAD6C\uB9E4", kind: "source-purchase", amount };
  if (/(\uBE44\uC6A9|\uC9C0\uCD9C)/.test(message)) return { label: "\uAE30\uD0C0 \uBE44\uC6A9", kind: "other-cost", amount };

  return undefined;
}

async function readSpreadsheetCsvs(urls: string[], readCsv?: (url: string) => Promise<string | undefined>): Promise<Array<{ url: string; csv?: string }>> {
  const results: Array<{ url: string; csv?: string }> = [];

  for (const url of urls) {
    const csvUrl = googleSheetCsvUrl(url);
    if (!csvUrl) {
      results.push({ url });
      continue;
    }

    try {
      const csv = readCsv ? await readCsv(csvUrl) : undefined;
      results.push({ url, csv });
    } catch {
      results.push({ url });
    }
  }

  return results;
}

async function readPresentationTexts(urls: string[], readPresentationText?: (url: string) => Promise<string | undefined>): Promise<Array<{ url: string; text?: string }>> {
  const results: Array<{ url: string; text?: string }> = [];

  for (const url of urls) {
    const textUrl = googleSlideTextUrl(url);
    if (!textUrl) {
      results.push({ url });
      continue;
    }

    try {
      const text = readPresentationText ? await readPresentationText(textUrl) : undefined;
      results.push({ url, text });
    } catch {
      results.push({ url });
    }
  }

  return results;
}

function uniqueShotItems(items: ParsedShotListItem[]): ParsedShotListItem[] {
  const byCode = new Map<string, ParsedShotListItem>();

  items.forEach((item) => {
    if (!byCode.has(item.code)) byCode.set(item.code, item);
  });

  return [...byCode.values()];
}

function buildProjectNotFoundMessage(hasNewProjectIntent: boolean): string {
  if (hasNewProjectIntent) return "새 프로젝트 이름을 찾지 못했어요. `새로운 프로젝트 BND_BBB`처럼 프로젝트 코드를 같이 적어주세요.";
  return "프로젝트명을 찾지 못했어요. 새 프로젝트라면 `새로운 프로젝트 BND_BBB`처럼 말해주세요.";
}

export async function processChatIntake(state: ChichiState, rawMessage: string, options: ProcessChatIntakeOptions = {}): Promise<ChatIntakeResult> {
  const trimmedMessage = rawMessage.trim();
  const attachments = options.attachments ?? [];
  const attachmentText = attachments.map((attachment) => attachment.fileName).join("\n");
  const intakeText = [trimmedMessage, attachmentText].filter(Boolean).join("\n");
  const now = options.now ?? new Date();
  const urls = [...new Set((intakeText.match(urlPattern) ?? []).map(cleanUrl))];
  const spreadsheetUrls = extractSpreadsheetUrls(intakeText);
  const slideUrls = extractSlideUrls(intakeText);
  const shotListIntent = isShotListRequest(intakeText);
  const newProjectName = extractNewProjectName(intakeText);
  const hasNewProjectIntent = /새로운\s*프로젝트|새\s*프로젝트|신규\s*프로젝트/i.test(intakeText);
  let nextState = state;
  let createdProjectCount = 0;

  let project: Project | undefined;

  if (newProjectName) {
    project = nextState.projects.find((item) => item.name.toLowerCase() === newProjectName.toLowerCase());

    if (!project) {
      nextState = addProject(nextState, {
        name: newProjectName,
        client: "",
        startDate: today(now),
        deliveryDate: today(now)
      });
      project = nextState.projects.find((item) => item.name.toLowerCase() === newProjectName.toLowerCase());
      createdProjectCount = project ? 1 : 0;
    }
  } else if (!hasNewProjectIntent) {
    project = findProject(nextState.projects, intakeText) ?? (options.contextProjectId ? nextState.projects.find((item) => item.id === options.contextProjectId) : undefined);
  }

  if (!project) {
    return { state, message: buildProjectNotFoundMessage(hasNewProjectIntent) };
  }

  urls.forEach((url) => {
    nextState = addProjectLink(nextState, project.id, classifyLink(url), url);
  });

  const csvResults = shotListIntent || newProjectName ? await readSpreadsheetCsvs(spreadsheetUrls, options.readCsv) : [];
  const presentationResults = shotListIntent || newProjectName ? await readPresentationTexts(slideUrls, options.readPresentationText) : [];
  const parsedCsvShotItems = csvResults.flatMap((result) => (result.csv ? parseShotListCsv(result.csv, project.name) : []));
  const parsedPresentationShotItems = presentationResults.flatMap((result) => (result.text ? parseSlideShotListText(result.text, project.name) : []));
  const shotItems = uniqueShotItems([...parseShotListText(intakeText, project.name), ...parsedCsvShotItems, ...parsedPresentationShotItems]);
  let createdShotCount = 0;
  let createdShotWorkCount = 0;

  shotItems.forEach((item) => {
    const existingShot = nextState.shots.find((shot) => shot.projectId === project.id && shot.code.toLowerCase() === item.code.toLowerCase());
    let shotId = existingShot?.id;

    if (!existingShot) {
      nextState = addShot(nextState, {
        projectId: project.id,
        code: item.code,
        dueDate: item.dueDate ?? project.deliveryDate,
        deliveryDate: item.dueDate ?? project.deliveryDate,
        priority: 3
      });
      shotId = nextState.shots.find((shot) => shot.projectId === project.id && shot.code.toLowerCase() === item.code.toLowerCase())?.id;
      createdShotCount += 1;
    }

    if (shotId && item.workNote) {
      const hasSameTask = nextState.tasks.some((task) => task.projectId === project.id && task.shotId === shotId && task.title === item.workNote);
      if (!hasSameTask) {
        nextState = addTask(nextState, {
          projectId: project.id,
          shotId,
          title: item.workNote,
          type: "comp-work",
          dueDate: item.dueDate ?? project.deliveryDate,
          priority: 3,
          status: "not-started"
        });
        createdShotWorkCount += 1;
      }
    }
  });

  const instruction = extractInstruction(trimmedMessage, project, urls);
  const fallbackShotCode = normalizeShotCode(intakeText);
  const explicitlyMentionedShot = findMentionedShot(project, nextState.shots, intakeText);
  const fallbackShot = findShot(project, nextState.shots, fallbackShotCode) ?? explicitlyMentionedShot;
  const taskStatus = readableStatusFromText(intakeText);
  let taskChangeCount = 0;
  let shotDateChangeCount = 0;
  let projectDeliveryDateChangeCount = 0;
  let priorityChangeCount = 0;
  let shotStatusChangeCount = 0;
  let assigneeChangeCount = 0;
  let checklistChangeCount = 0;
  let financeChangeCount = 0;
  const summaryDetails: string[] = [];

  const requestedDate = /마감|납품|일자|due/i.test(intakeText) ? parseNaturalDate(intakeText, now) : undefined;
  const mentionedShot = requestedDate ? findMentionedShot(project, nextState.shots, intakeText) : undefined;

  if (requestedDate && mentionedShot) {
    nextState = updateShot(nextState, mentionedShot.id, { dueDate: requestedDate, deliveryDate: requestedDate });
    shotDateChangeCount = 1;
    summaryDetails.push(`${mentionedShot.code} 마감 ${requestedDate}`);
  }

  const commandDate = hasReadableDateIntent(intakeText) ? parseReadableCommandDate(intakeText, now) : undefined;
  if (commandDate && hasProjectDeliveryDateIntent(intakeText) && !explicitlyMentionedShot) {
    nextState = updateProject(nextState, project.id, { deliveryDate: commandDate });
    projectDeliveryDateChangeCount = 1;
    summaryDetails.push(`최종 납품일 ${commandDate}`);
  } else if (commandDate && explicitlyMentionedShot) {
    nextState = updateShot(nextState, explicitlyMentionedShot.id, { dueDate: commandDate, deliveryDate: commandDate });
    shotDateChangeCount = 1;
    if (!summaryDetails.includes(`${explicitlyMentionedShot.code} 마감 ${commandDate}`)) {
      summaryDetails.push(`${explicitlyMentionedShot.code} 마감 ${commandDate}`);
    }
  }

  const requestedPriority = readablePriorityFromText(intakeText);
  if (requestedPriority && explicitlyMentionedShot) {
    nextState = updateShot(nextState, explicitlyMentionedShot.id, { priority: requestedPriority });
    priorityChangeCount = 1;
    summaryDetails.push(`${explicitlyMentionedShot.code} 우선순위 ${requestedPriority}`);
  }

  const requestedAssignee = parseAssigneeCommand(intakeText);
  if (requestedAssignee && fallbackShot) {
    nextState = updateShot(nextState, fallbackShot.id, { assignedTo: requestedAssignee });
    assigneeChangeCount = 1;
    summaryDetails.push(`${fallbackShot.code} 담당 ${requestedAssignee}`);
  }

  const requestedChecklistUpdates = parseSourceChecklistCommands(intakeText);
  if (requestedChecklistUpdates.length > 0 && fallbackShot) {
    requestedChecklistUpdates.forEach((item) => {
      nextState = updateShotSourceCheck(nextState, fallbackShot.id, item.key, { status: item.status, note: item.note });
      summaryDetails.push(`${fallbackShot.code} ${sourceCheckKeyLabel(item.key)} ${sourceCheckStatusLabel(item.status)}`);
    });
    checklistChangeCount = requestedChecklistUpdates.length;
  }

  const financeCommand = parseFinanceCommand(intakeText);
  if (financeCommand) {
    nextState = addFinanceEntry(nextState, {
      projectId: project.id,
      label: financeCommand.label,
      kind: financeCommand.kind,
      amount: financeCommand.amount,
      date: today(now)
    });
    financeChangeCount = 1;
    summaryDetails.push(`${financeCommand.label} ${formatWon(financeCommand.amount)}`);
  }

  const sourceItems = parseSourceIntake(intakeText, project, nextState.shots, now.toISOString());
  nextState = addSourceFiles(nextState, sourceItems);
  if (requestedChecklistUpdates.length > 0 && fallbackShot) {
    requestedChecklistUpdates.forEach((item) => {
      nextState = updateShotSourceCheck(nextState, fallbackShot.id, item.key, { status: item.status, note: item.note });
    });
  }

  const feedbackInstruction = extractFeedbackInstructionFromMixedCommand(instruction, fallbackShot);
  const parsedFeedback = parseFeedbackText([feedbackInstruction, attachmentText].filter(Boolean).join("\n"), "chichi-chat");
  const handledOperationalCommand =
    isOperationalCommand(intakeText) ||
    sourceItems.length > 0 ||
    shotDateChangeCount > 0 ||
    projectDeliveryDateChangeCount > 0 ||
    priorityChangeCount > 0 ||
    assigneeChangeCount > 0 ||
    checklistChangeCount > 0 ||
    financeChangeCount > 0;
  const hasFeedbackInstruction = feedbackInstruction.length >= 4;
  const shouldCreateFeedback = (!shotListIntent && !newProjectName && (!handledOperationalCommand || hasFeedbackInstruction)) || attachments.length > 0;
  const feedbackItems: ParsedFeedback[] = shouldCreateFeedback
    ? parsedFeedback.length
      ? parsedFeedback
      : feedbackInstruction.length >= 4 || attachments.length > 0
        ? [
            {
              originalSource: "chichi-chat",
              originalText: feedbackInstruction || "이미지 첨부 피드백",
              instruction: feedbackInstruction || "이미지 첨부 피드백",
              shotCode: fallbackShotCode,
              confidence: fallbackShotCode ? 0.7 : attachments.length > 0 ? 0.5 : 0.65
            }
          ]
        : []
    : [];

  if (feedbackItems.length > 0) {
    const nextNote = [project.kakaoFeedbackNotes, instruction].filter(Boolean).join("\n");
    nextState = updateProject(nextState, project.id, { kakaoFeedbackNotes: nextNote });

    feedbackItems.forEach((item) => {
      const shot = findShot(project, nextState.shots, item.shotCode) ?? fallbackShot;
      nextState = addFeedback(nextState, {
        projectId: project.id,
        shotId: shot?.id,
        originalSource: item.originalSource,
        originalText: item.originalText,
        instruction: item.instruction,
        attachments,
        confidence: item.confidence
      });
      summaryDetails.push(`${shot?.code ?? project.name} 피드백 1개`);
    });
  }

  if (taskStatus) {
    const isProjectStatusCommand = /프로젝트|작품|전체/.test(intakeText) || !fallbackShot;

    if (isProjectStatusCommand) {
      nextState = updateProject(nextState, project.id, { status: taskStatus });
      taskChangeCount = 1;
    } else if (isOperationalCommand(intakeText) && fallbackShot) {
      nextState = updateShot(nextState, fallbackShot.id, { status: taskStatus });
      shotStatusChangeCount = 1;
    } else if (taskStatus === "done" && fallbackShot) {
      const targetTask = nextState.tasks.find((task) => {
        if (task.projectId !== project.id || task.status === "done") return false;
        return task.shotId === fallbackShot.id || task.title.includes(fallbackShot.code);
      });

      if (targetTask) {
        nextState = updateTask(nextState, targetTask.id, { status: "done" });
        taskChangeCount = 1;
      }
    } else {
      nextState = addTask(nextState, {
        projectId: project.id,
        shotId: fallbackShot?.id,
        title: instruction || `${fallbackShot?.code ?? project.name} 작업`,
        type: "comp-work",
        dueDate: today(now),
        priority: 3,
        status: taskStatus
      });
      taskChangeCount = 1;
    }
  }

  const successfulSheetReads = csvResults.filter((result) => result.csv).length;
  const successfulSlideReads = presentationResults.filter((result) => result.text).length;
  const sheetShotCount = parsedCsvShotItems.length;
  const slideShotCount = parsedPresentationShotItems.length;
  const sheetWarning =
    spreadsheetUrls.length > 0 && sheetShotCount === 0
      ? " 시트에서 샷을 읽지 못했어요. 시트 권한을 공개하거나 샷 목록을 채팅에 붙여넣어 주세요."
      : "";
  const slideWarning =
    slideUrls.length > 0 && slideShotCount === 0
      ? " 슬라이드에서 샷을 읽지 못했어요. 슬라이드 권한을 확인하거나 텍스트를 붙여넣어 주세요."
      : "";

  const countSummary = [
    `새 프로젝트 ${createdProjectCount}개`,
    `샷 ${createdShotCount}개`,
    `컷별 작업 ${createdShotWorkCount}개`,
    `링크 ${urls.length}개`,
    `시트 읽기 ${successfulSheetReads}개`,
    `슬라이드 읽기 ${successfulSlideReads}개`,
    `마감 변경 ${shotDateChangeCount}개`,
    `우선순위 변경 ${priorityChangeCount}개`,
    `상태 변경 ${shotStatusChangeCount}개`,
    `소스 ${sourceItems.length}개`,
    `피드백 ${feedbackItems.length}개`,
    `작업 ${taskChangeCount}개`,
    `정산 ${financeChangeCount}개`
  ];
  const detailSummary = [...new Set(summaryDetails)].join(", ");
  const summaryText = detailSummary ? `${detailSummary} (${countSummary.join(", ")})` : countSummary.join(", ");

  return {
    state: nextState,
    message: `${project.name} 정리 완료: ${summaryText}을 반영했어요.${sheetWarning}${slideWarning}`
  };
}
