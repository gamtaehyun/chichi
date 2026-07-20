# Chichi MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working Chichi MVP: a local web app with a production dashboard, source grouping, version-change intelligence, feedback import, finance tracking, and a chat-style PM panel.

**Architecture:** Use a Vite React TypeScript app. Keep business logic in pure TypeScript modules so it can be tested before UI work. The first MVP uses local sample data and local storage, while Drive/Dropbox are represented through connector interfaces that can later be wired to real OAuth APIs.

**Tech Stack:** Vite, React, TypeScript, Vitest, CSS modules or plain CSS, browser localStorage for MVP persistence.

---

## Scope Decision

This plan builds a usable local MVP first. It does not implement real Google Drive, Dropbox, Google Slides, Google Sheets, or KakaoTalk API authentication in the first pass. Instead, it creates the connector boundaries, local scan snapshot format, and sample import flows so the app can behave like Chichi before external credentials and API approval are handled.

Real external integrations should be a follow-up plan after the local MVP proves the workflow.

## File Structure

- Create: `package.json` - scripts and dependencies.
- Create: `index.html` - Vite entry HTML.
- Create: `tsconfig.json` - TypeScript configuration.
- Create: `vite.config.ts` - Vite and Vitest configuration.
- Create: `src/main.tsx` - React app entry.
- Create: `src/App.tsx` - app shell, navigation, dashboard, chat panel.
- Create: `src/styles.css` - production-focused UI styles.
- Create: `src/domain/types.ts` - project, shot, source, feedback, task, finance types.
- Create: `src/domain/sourceClassifier.ts` - source type, version, plate status, latest status logic.
- Create: `src/domain/sourceClassifier.test.ts` - source classification tests.
- Create: `src/domain/scanDiff.ts` - compare scan snapshots and create source change events.
- Create: `src/domain/scanDiff.test.ts` - scan comparison tests.
- Create: `src/domain/feedbackParser.ts` - parse mixed feedback text into actionable feedback.
- Create: `src/domain/feedbackParser.test.ts` - feedback parser tests.
- Create: `src/domain/taskPrioritizer.ts` - build today's task list across projects.
- Create: `src/domain/taskPrioritizer.test.ts` - priority tests.
- Create: `src/domain/finance.ts` - project profit calculation.
- Create: `src/domain/finance.test.ts` - finance tests.
- Create: `src/data/sampleData.ts` - realistic sample projects, shots, sources, feedback, and finance data.
- Create: `src/storage/localStore.ts` - localStorage load/save for MVP state.
- Create: `src/components/Dashboard.tsx` - first screen with Today, Project Status, New/Changed Sources.
- Create: `src/components/TodayList.tsx` - today task list.
- Create: `src/components/ProjectStatusCards.tsx` - project cards.
- Create: `src/components/SourceChanges.tsx` - source update list.
- Create: `src/components/ChatPanel.tsx` - Chichi chat interaction.
- Create: `src/components/FinancePanel.tsx` - separate finance tab.

## Task 1: Create App Skeleton

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`

- [ ] **Step 1: Create dependency and script configuration**

Create `package.json`:

```json
{
  "name": "chichi-vfx-pm",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^6.0.0",
    "typescript": "^5.7.2",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.468.0"
  },
  "devDependencies": {
    "vitest": "^2.1.8",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0"
  }
}
```

- [ ] **Step 2: Create TypeScript and Vite config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "references": []
}
```

Create `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true
  }
});
```

- [ ] **Step 3: Create React entry files**

Create `index.html`:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>치치</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Create `src/App.tsx`:

```tsx
export default function App() {
  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1>치치</h1>
          <p>VFX 합성 작업을 챙기는 PM 에이전트</p>
        </div>
      </header>
      <section className="emptyState">대시보드 준비 중</section>
    </main>
  );
}
```

Create `src/styles.css`:

```css
:root {
  font-family: Inter, "Pretendard", "Segoe UI", system-ui, sans-serif;
  color: #172026;
  background: #f5f7f8;
}

body {
  margin: 0;
}

.app {
  min-height: 100vh;
}

.topbar {
  background: #102027;
  color: white;
  padding: 20px 28px;
}

.topbar h1 {
  margin: 0;
  font-size: 28px;
}

.topbar p {
  margin: 6px 0 0;
  color: #c9d6dc;
}

.emptyState {
  padding: 28px;
}
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 5: Verify build**

Run: `npm run build`

Expected: TypeScript and Vite build complete without errors.

## Task 2: Define Domain Types

**Files:**
- Create: `src/domain/types.ts`

- [ ] **Step 1: Create shared production types**

Create `src/domain/types.ts`:

```ts
export type SourceProvider = "google-drive" | "dropbox" | "manual" | "local";
export type SourceType = "plate" | "3d" | "fx" | "roto" | "reference" | "feedback-media" | "delivery" | "other";
export type LatestStatus = "confirmed-latest" | "likely-latest" | "superseded" | "needs-confirmation";
export type PlateStatus = "original" | "beauty-corrected" | "final" | "uncertain";
export type ChangeStatus = "new" | "modified" | "moved" | "deleted" | "unchanged";
export type WorkStatus = "not-started" | "in-progress" | "review" | "delivered" | "blocked" | "done";
export type FeedbackStatus = "new" | "accepted" | "in-progress" | "done" | "rejected" | "needs-clarification";

export interface Project {
  id: string;
  name: string;
  client: string;
  status: WorkStatus;
  startDate: string;
  deliveryDate: string;
  driveFolders: string[];
  dropboxFolders: string[];
  feedbackLinks: string[];
}

export interface Shot {
  id: string;
  projectId: string;
  code: string;
  status: WorkStatus;
  priority: number;
  dueDate: string;
  deliveryDate: string;
  assignedTo?: string;
  currentDeliveryVersion?: string;
}

export interface SourceFile {
  id: string;
  projectId?: string;
  shotId?: string;
  fileName: string;
  pathOrUrl: string;
  provider: SourceProvider;
  sourceType: SourceType;
  version?: number;
  modifiedAt: string;
  firstSeenAt: string;
  latestStatus: LatestStatus;
  plateStatus?: PlateStatus;
  changeStatus: ChangeStatus;
}

export interface Feedback {
  id: string;
  projectId?: string;
  shotId?: string;
  originalSource: string;
  originalText: string;
  instruction: string;
  confidence: number;
  status: FeedbackStatus;
  relation: "new-request" | "duplicate" | "changed-request";
}

export interface TaskItem {
  id: string;
  projectId: string;
  shotId?: string;
  title: string;
  type: "comp-work" | "source-check" | "feedback-response" | "delivery" | "client-reply" | "finance-follow-up";
  dueDate: string;
  priority: number;
  status: WorkStatus;
  blockerReason?: string;
}

export interface FinanceEntry {
  id: string;
  projectId: string;
  label: string;
  kind: "income" | "unpaid" | "freelancer-cost" | "contractor-cost" | "ai-cost" | "source-purchase" | "other-cost";
  amount: number;
  date: string;
}

export interface ChichiState {
  projects: Project[];
  shots: Shot[];
  sources: SourceFile[];
  feedback: Feedback[];
  tasks: TaskItem[];
  finance: FinanceEntry[];
}
```

- [ ] **Step 2: Verify types compile**

Run: `npm run build`

Expected: build passes with no TypeScript errors.

## Task 3: Implement Source Classification

**Files:**
- Create: `src/domain/sourceClassifier.ts`
- Create: `src/domain/sourceClassifier.test.ts`

- [ ] **Step 1: Write source classification tests**

Create `src/domain/sourceClassifier.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { classifyPlateStatus, classifySourceType, extractVersion } from "./sourceClassifier";

describe("sourceClassifier", () => {
  it("classifies the four core source groups", () => {
    expect(classifySourceType("SH010_plate_beauty_v002.exr")).toBe("plate");
    expect(classifySourceType("SH010_CG_AOV_diffuse_v003.exr")).toBe("3d");
    expect(classifySourceType("SH010_FX_smoke_v004.exr")).toBe("fx");
    expect(classifySourceType("SH010_roto_alpha_v001.exr")).toBe("roto");
  });

  it("extracts common version patterns", () => {
    expect(extractVersion("SH010_FX_v004.exr")).toBe(4);
    expect(extractVersion("SH010_plate_rev03.exr")).toBe(3);
    expect(extractVersion("SH010_final.exr")).toBeUndefined();
  });

  it("marks final-looking plates as uncertain until confirmed", () => {
    expect(classifyPlateStatus("SH010_plate_beauty_final.exr")).toBe("final");
    expect(classifyPlateStatus("SH010_plate_cleanplate_v002.exr")).toBe("beauty-corrected");
    expect(classifyPlateStatus("SH010_plate_raw_v001.exr")).toBe("original");
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm run test -- src/domain/sourceClassifier.test.ts`

Expected: FAIL because `sourceClassifier.ts` does not exist.

- [ ] **Step 3: Implement source classifier**

Create `src/domain/sourceClassifier.ts`:

```ts
import type { PlateStatus, SourceType } from "./types";

export function classifySourceType(fileName: string): SourceType {
  const name = fileName.toLowerCase();
  if (name.includes("roto") || name.includes("alpha") || name.includes("mask")) return "roto";
  if (name.includes("fx") || name.includes("smoke") || name.includes("fire") || name.includes("debris")) return "fx";
  if (name.includes("3d") || name.includes("cg") || name.includes("aov") || name.includes("renderlayer")) return "3d";
  if (name.includes("plate") || name.includes("cleanplate") || name.includes("beauty") || name.includes("denoise")) return "plate";
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
  if (name.includes("final")) return "final";
  if (name.includes("beauty") || name.includes("cleanplate") || name.includes("denoise") || name.includes("retime")) {
    return "beauty-corrected";
  }
  if (name.includes("raw") || name.includes("original")) return "original";
  return "uncertain";
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `npm run test -- src/domain/sourceClassifier.test.ts`

Expected: PASS.

## Task 4: Implement Scan Diff

**Files:**
- Create: `src/domain/scanDiff.ts`
- Create: `src/domain/scanDiff.test.ts`

- [ ] **Step 1: Write scan diff tests**

Create `src/domain/scanDiff.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm run test -- src/domain/scanDiff.test.ts`

Expected: FAIL because `scanDiff.ts` does not exist.

- [ ] **Step 3: Implement scan diff**

Create `src/domain/scanDiff.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify pass**

Run: `npm run test -- src/domain/scanDiff.test.ts`

Expected: PASS.

## Task 5: Implement Feedback Parser

**Files:**
- Create: `src/domain/feedbackParser.ts`
- Create: `src/domain/feedbackParser.test.ts`

- [ ] **Step 1: Write feedback parser tests**

Create `src/domain/feedbackParser.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseFeedbackText } from "./feedbackParser";

describe("parseFeedbackText", () => {
  it("extracts shot-linked feedback from mixed text", () => {
    const text = `
      SH010 밝은 부분 조금 눌러주세요.
      내일 점심 뭐 먹죠?
      SH020 roto edge 떨림 확인 부탁드립니다.
    `;

    const result = parseFeedbackText(text, "kakaotalk-paste");

    expect(result).toHaveLength(2);
    expect(result[0].instruction).toContain("밝은 부분");
    expect(result[0].confidence).toBeGreaterThan(0.8);
    expect(result[1].instruction).toContain("roto edge");
  });

  it("flags actionable text without shot code as low confidence", () => {
    const result = parseFeedbackText("전체적으로 smoke가 너무 강해요.", "slide-note");
    expect(result).toHaveLength(1);
    expect(result[0].shotCode).toBeUndefined();
    expect(result[0].confidence).toBeLessThan(0.7);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm run test -- src/domain/feedbackParser.test.ts`

Expected: FAIL because `feedbackParser.ts` does not exist.

- [ ] **Step 3: Implement feedback parser**

Create `src/domain/feedbackParser.ts`:

```ts
export interface ParsedFeedback {
  originalSource: string;
  originalText: string;
  instruction: string;
  shotCode?: string;
  confidence: number;
}

const actionWords = ["확인", "수정", "부탁", "올려", "낮춰", "강해", "약해", "밝", "어둡", "edge", "smoke", "roto", "plate", "fx"];

export function parseFeedbackText(text: string, originalSource: string): ParsedFeedback[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => actionWords.some((word) => line.toLowerCase().includes(word.toLowerCase())))
    .map((line) => {
      const shotMatch = line.match(/\b(SH\d+[A-Z]?)\b/i);
      const shotCode = shotMatch?.[1]?.toUpperCase();
      return {
        originalSource,
        originalText: line,
        instruction: shotCode ? line.replace(shotMatch?.[0] ?? "", "").trim() : line,
        shotCode,
        confidence: shotCode ? 0.9 : 0.55
      };
    });
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `npm run test -- src/domain/feedbackParser.test.ts`

Expected: PASS.

## Task 6: Implement Task Priority And Finance Logic

**Files:**
- Create: `src/domain/taskPrioritizer.ts`
- Create: `src/domain/taskPrioritizer.test.ts`
- Create: `src/domain/finance.ts`
- Create: `src/domain/finance.test.ts`

- [ ] **Step 1: Write task priority tests**

Create `src/domain/taskPrioritizer.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { TaskItem } from "./types";
import { prioritizeToday } from "./taskPrioritizer";

describe("prioritizeToday", () => {
  it("sorts due-today blocked tasks before later low-risk tasks", () => {
    const tasks: TaskItem[] = [
      { id: "later", projectId: "p1", title: "내일 납품", type: "delivery", dueDate: "2026-07-04", priority: 2, status: "in-progress" },
      { id: "today", projectId: "p2", title: "SH030 소스 확인", type: "source-check", dueDate: "2026-07-03", priority: 4, status: "blocked", blockerReason: "FX 최신 여부 확인 필요" }
    ];

    expect(prioritizeToday(tasks, "2026-07-03")[0].id).toBe("today");
  });
});
```

- [ ] **Step 2: Write finance tests**

Create `src/domain/finance.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { FinanceEntry } from "./types";
import { calculateProjectProfit } from "./finance";

describe("calculateProjectProfit", () => {
  it("calculates received, unpaid, costs, and profit", () => {
    const entries: FinanceEntry[] = [
      { id: "income", projectId: "p1", label: "계약금", kind: "income", amount: 3000000, date: "2026-07-01" },
      { id: "unpaid", projectId: "p1", label: "잔금", kind: "unpaid", amount: 1000000, date: "2026-07-31" },
      { id: "freelancer", projectId: "p1", label: "로토 외주", kind: "freelancer-cost", amount: 500000, date: "2026-07-02" },
      { id: "ai", projectId: "p1", label: "AI 도구", kind: "ai-cost", amount: 30000, date: "2026-07-02" }
    ];

    expect(calculateProjectProfit(entries, "p1")).toEqual({
      received: 3000000,
      unpaid: 1000000,
      costs: 530000,
      actualProfit: 2470000,
      expectedProfit: 3470000
    });
  });
});
```

- [ ] **Step 3: Implement task prioritizer**

Create `src/domain/taskPrioritizer.ts`:

```ts
import type { TaskItem } from "./types";

function scoreTask(task: TaskItem, today: string): number {
  const dueDelta = Math.ceil((new Date(task.dueDate).getTime() - new Date(today).getTime()) / 86400000);
  const dueScore = dueDelta <= 0 ? 100 : Math.max(0, 40 - dueDelta * 10);
  const blockerScore = task.status === "blocked" ? 25 : 0;
  return dueScore + blockerScore + task.priority * 10;
}

export function prioritizeToday(tasks: TaskItem[], today: string): TaskItem[] {
  return [...tasks]
    .filter((task) => task.status !== "done")
    .sort((a, b) => scoreTask(b, today) - scoreTask(a, today));
}
```

- [ ] **Step 4: Implement finance calculation**

Create `src/domain/finance.ts`:

```ts
import type { FinanceEntry } from "./types";

export interface ProjectProfit {
  received: number;
  unpaid: number;
  costs: number;
  actualProfit: number;
  expectedProfit: number;
}

const costKinds = new Set<FinanceEntry["kind"]>([
  "freelancer-cost",
  "contractor-cost",
  "ai-cost",
  "source-purchase",
  "other-cost"
]);

export function calculateProjectProfit(entries: FinanceEntry[], projectId: string): ProjectProfit {
  const projectEntries = entries.filter((entry) => entry.projectId === projectId);
  const received = projectEntries.filter((entry) => entry.kind === "income").reduce((sum, entry) => sum + entry.amount, 0);
  const unpaid = projectEntries.filter((entry) => entry.kind === "unpaid").reduce((sum, entry) => sum + entry.amount, 0);
  const costs = projectEntries.filter((entry) => costKinds.has(entry.kind)).reduce((sum, entry) => sum + entry.amount, 0);
  return {
    received,
    unpaid,
    costs,
    actualProfit: received - costs,
    expectedProfit: received + unpaid - costs
  };
}
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/domain/taskPrioritizer.test.ts src/domain/finance.test.ts`

Expected: PASS.

## Task 7: Add Sample Data And Local Storage

**Files:**
- Create: `src/data/sampleData.ts`
- Create: `src/storage/localStore.ts`

- [ ] **Step 1: Create sample Chichi data**

Create `src/data/sampleData.ts` with two projects, four shots, source examples for plate/3D/FX/roto, mixed feedback, tasks, and finance entries.

```ts
import type { ChichiState } from "../domain/types";

export const sampleState: ChichiState = {
  projects: [
    {
      id: "p-film",
      name: "FILM_A",
      client: "Client A",
      status: "in-progress",
      startDate: "2026-07-01",
      deliveryDate: "2026-07-08",
      driveFolders: ["drive://FILM_A/source"],
      dropboxFolders: ["dropbox://FILM_A/incoming"],
      feedbackLinks: ["slides://FILM_A_feedback"]
    },
    {
      id: "p-ad",
      name: "AD_B",
      client: "Client B",
      status: "in-progress",
      startDate: "2026-07-02",
      deliveryDate: "2026-07-05",
      driveFolders: ["drive://AD_B/source"],
      dropboxFolders: [],
      feedbackLinks: ["sheets://AD_B_shotlist"]
    }
  ],
  shots: [
    { id: "s-010", projectId: "p-film", code: "SH010", status: "in-progress", priority: 3, dueDate: "2026-07-03", deliveryDate: "2026-07-04", currentDeliveryVersion: "v002" },
    { id: "s-020", projectId: "p-film", code: "SH020", status: "blocked", priority: 5, dueDate: "2026-07-03", deliveryDate: "2026-07-04" },
    { id: "s-030", projectId: "p-ad", code: "SH030", status: "review", priority: 4, dueDate: "2026-07-04", deliveryDate: "2026-07-05" },
    { id: "s-040", projectId: "p-ad", code: "SH040", status: "not-started", priority: 2, dueDate: "2026-07-05", deliveryDate: "2026-07-05" }
  ],
  sources: [
    { id: "src-plate", projectId: "p-film", shotId: "s-010", fileName: "SH010_plate_beauty_final.exr", pathOrUrl: "drive://FILM_A/SH010/plate/SH010_plate_beauty_final.exr", provider: "google-drive", sourceType: "plate", modifiedAt: "2026-07-03T09:00:00+09:00", firstSeenAt: "2026-07-03T09:00:00+09:00", latestStatus: "needs-confirmation", plateStatus: "final", changeStatus: "new" },
    { id: "src-3d", projectId: "p-film", shotId: "s-010", fileName: "SH010_CG_AOV_v003.exr", pathOrUrl: "dropbox://FILM_A/SH010/3D/SH010_CG_AOV_v003.exr", provider: "dropbox", sourceType: "3d", version: 3, modifiedAt: "2026-07-03T09:15:00+09:00", firstSeenAt: "2026-07-03T09:15:00+09:00", latestStatus: "likely-latest", changeStatus: "new" },
    { id: "src-fx", projectId: "p-ad", shotId: "s-030", fileName: "SH030_FX_smoke_v004.exr", pathOrUrl: "drive://AD_B/SH030/FX/SH030_FX_smoke_v004.exr", provider: "google-drive", sourceType: "fx", version: 4, modifiedAt: "2026-07-03T10:00:00+09:00", firstSeenAt: "2026-07-03T10:00:00+09:00", latestStatus: "likely-latest", changeStatus: "new" },
    { id: "src-roto", projectId: "p-film", shotId: "s-020", fileName: "SH020_roto_alpha_v001.exr", pathOrUrl: "dropbox://FILM_A/SH020/roto/SH020_roto_alpha_v001.exr", provider: "dropbox", sourceType: "roto", version: 1, modifiedAt: "2026-07-03T11:00:00+09:00", firstSeenAt: "2026-07-03T11:00:00+09:00", latestStatus: "likely-latest", changeStatus: "new" }
  ],
  feedback: [
    { id: "fb-1", projectId: "p-film", shotId: "s-010", originalSource: "kakaotalk-paste", originalText: "SH010 밝은 부분 조금 눌러주세요.", instruction: "밝은 부분 조금 눌러주세요.", confidence: 0.9, status: "new", relation: "new-request" }
  ],
  tasks: [
    { id: "t-1", projectId: "p-film", shotId: "s-020", title: "SH020 로토 알파 최신 여부 확인", type: "source-check", dueDate: "2026-07-03", priority: 5, status: "blocked", blockerReason: "로토 v001 이후 추가 전달 여부 확인 필요" },
    { id: "t-2", projectId: "p-film", shotId: "s-010", title: "SH010 밝은 부분 피드백 반영", type: "feedback-response", dueDate: "2026-07-03", priority: 4, status: "in-progress" },
    { id: "t-3", projectId: "p-ad", shotId: "s-030", title: "SH030 FX smoke v004 확인", type: "source-check", dueDate: "2026-07-04", priority: 3, status: "review" }
  ],
  finance: [
    { id: "f-1", projectId: "p-film", label: "계약금", kind: "income", amount: 3000000, date: "2026-07-01" },
    { id: "f-2", projectId: "p-film", label: "잔금", kind: "unpaid", amount: 1000000, date: "2026-07-08" },
    { id: "f-3", projectId: "p-film", label: "로토 외주", kind: "freelancer-cost", amount: 500000, date: "2026-07-03" },
    { id: "f-4", projectId: "p-ad", label: "AI 도구 배분", kind: "ai-cost", amount: 30000, date: "2026-07-03" }
  ]
};
```

- [ ] **Step 2: Create local storage helpers**

Create `src/storage/localStore.ts`:

```ts
import { sampleState } from "../data/sampleData";
import type { ChichiState } from "../domain/types";

const storageKey = "chichi-state-v1";

export function loadState(): ChichiState {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return sampleState;
  try {
    return JSON.parse(raw) as ChichiState;
  } catch {
    return sampleState;
  }
}

export function saveState(state: ChichiState): void {
  localStorage.setItem(storageKey, JSON.stringify(state));
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`

Expected: PASS.

## Task 8: Build Dashboard UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Create: `src/components/Dashboard.tsx`
- Create: `src/components/TodayList.tsx`
- Create: `src/components/ProjectStatusCards.tsx`
- Create: `src/components/SourceChanges.tsx`

- [ ] **Step 1: Create dashboard components**

Create `src/components/TodayList.tsx`:

```tsx
import type { Project, Shot, TaskItem } from "../domain/types";
import { prioritizeToday } from "../domain/taskPrioritizer";

interface Props {
  tasks: TaskItem[];
  projects: Project[];
  shots: Shot[];
}

export function TodayList({ tasks, projects, shots }: Props) {
  const today = "2026-07-03";
  const prioritized = prioritizeToday(tasks, today).slice(0, 6);

  return (
    <section className="panel">
      <h2>오늘 할 일</h2>
      <div className="list">
        {prioritized.map((task) => {
          const project = projects.find((item) => item.id === task.projectId);
          const shot = shots.find((item) => item.id === task.shotId);
          return (
            <article className="row" key={task.id}>
              <strong>{task.title}</strong>
              <span>{project?.name} {shot ? `/ ${shot.code}` : ""}</span>
              {task.blockerReason ? <em>{task.blockerReason}</em> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
```

Create `src/components/ProjectStatusCards.tsx`:

```tsx
import type { Feedback, Project, Shot, SourceFile } from "../domain/types";

interface Props {
  projects: Project[];
  shots: Shot[];
  feedback: Feedback[];
  sources: SourceFile[];
}

export function ProjectStatusCards({ projects, shots, feedback, sources }: Props) {
  return (
    <section className="panel">
      <h2>프로젝트별 상태</h2>
      <div className="projectGrid">
        {projects.map((project) => {
          const projectShots = shots.filter((shot) => shot.projectId === project.id);
          const riskShots = projectShots.filter((shot) => shot.status === "blocked" || shot.priority >= 5);
          const pendingFeedback = feedback.filter((item) => item.projectId === project.id && item.status !== "done");
          const uncertainSources = sources.filter((source) => source.projectId === project.id && source.latestStatus === "needs-confirmation");

          return (
            <article className="projectCard" key={project.id}>
              <h3>{project.name}</h3>
              <p>{project.client}</p>
              <dl>
                <div><dt>진행 샷</dt><dd>{projectShots.length}</dd></div>
                <div><dt>위험 샷</dt><dd>{riskShots.length}</dd></div>
                <div><dt>피드백</dt><dd>{pendingFeedback.length}</dd></div>
                <div><dt>소스 확인</dt><dd>{uncertainSources.length}</dd></div>
              </dl>
              <span className="date">납품 {project.deliveryDate}</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}
```

Create `src/components/SourceChanges.tsx`:

```tsx
import type { SourceFile } from "../domain/types";

interface Props {
  sources: SourceFile[];
}

const statusLabel: Record<SourceFile["latestStatus"], string> = {
  "confirmed-latest": "최신 확정",
  "likely-latest": "최신 추정",
  superseded: "이전 버전",
  "needs-confirmation": "확인 필요"
};

export function SourceChanges({ sources }: Props) {
  return (
    <section className="panel">
      <h2>새 소스 / 변경 소스</h2>
      <div className="list">
        {sources.filter((source) => source.changeStatus !== "unchanged").map((source) => (
          <article className="row" key={source.id}>
            <strong>{source.fileName}</strong>
            <span>{source.sourceType.toUpperCase()} / {source.provider}</span>
            <em>{statusLabel[source.latestStatus]}</em>
          </article>
        ))}
      </div>
    </section>
  );
}
```

Create `src/components/Dashboard.tsx`:

```tsx
import type { ChichiState } from "../domain/types";
import { ProjectStatusCards } from "./ProjectStatusCards";
import { SourceChanges } from "./SourceChanges";
import { TodayList } from "./TodayList";

interface Props {
  state: ChichiState;
}

export function Dashboard({ state }: Props) {
  return (
    <div className="dashboard">
      <TodayList tasks={state.tasks} projects={state.projects} shots={state.shots} />
      <ProjectStatusCards projects={state.projects} shots={state.shots} feedback={state.feedback} sources={state.sources} />
      <SourceChanges sources={state.sources} />
    </div>
  );
}
```

- [ ] **Step 2: Wire dashboard into app**

Modify `src/App.tsx`:

```tsx
import { useMemo, useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { loadState } from "./storage/localStore";

export default function App() {
  const initialState = useMemo(() => loadState(), []);
  const [activeTab, setActiveTab] = useState<"dashboard" | "finance">("dashboard");

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1>치치</h1>
          <p>VFX 합성 작업을 챙기는 PM 에이전트</p>
        </div>
        <nav>
          <button className={activeTab === "dashboard" ? "active" : ""} onClick={() => setActiveTab("dashboard")}>작업</button>
          <button className={activeTab === "finance" ? "active" : ""} onClick={() => setActiveTab("finance")}>정산</button>
        </nav>
      </header>
      {activeTab === "dashboard" ? <Dashboard state={initialState} /> : <section className="panel single">정산 탭 준비 중</section>}
    </main>
  );
}
```

- [ ] **Step 3: Add dashboard styles**

Append to `src/styles.css`:

```css
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.topbar nav {
  display: flex;
  gap: 8px;
}

button {
  border: 1px solid #b8c7ce;
  background: white;
  color: #102027;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
}

button.active {
  background: #27a07d;
  border-color: #27a07d;
  color: white;
}

.dashboard {
  display: grid;
  grid-template-columns: 1.1fr 1.4fr 1fr;
  gap: 16px;
  padding: 20px;
}

.panel {
  background: white;
  border: 1px solid #d9e1e5;
  border-radius: 8px;
  padding: 16px;
}

.single {
  margin: 20px;
}

.panel h2 {
  margin: 0 0 12px;
  font-size: 18px;
}

.list {
  display: grid;
  gap: 10px;
}

.row {
  border: 1px solid #e1e7ea;
  border-radius: 6px;
  padding: 10px;
  display: grid;
  gap: 4px;
}

.row span,
.projectCard p,
.date {
  color: #60717a;
  font-size: 13px;
}

.row em {
  color: #ad4e00;
  font-size: 13px;
  font-style: normal;
}

.projectGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.projectCard {
  border: 1px solid #e1e7ea;
  border-radius: 8px;
  padding: 12px;
}

.projectCard h3 {
  margin: 0;
}

.projectCard dl {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin: 12px 0;
}

.projectCard dt {
  color: #60717a;
  font-size: 12px;
}

.projectCard dd {
  margin: 2px 0 0;
  font-weight: 700;
}

@media (max-width: 980px) {
  .dashboard {
    grid-template-columns: 1fr;
  }

  .projectGrid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Verify UI build**

Run: `npm run build`

Expected: PASS.

## Task 9: Add Chat And Finance Panels

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/ChatPanel.tsx`
- Create: `src/components/FinancePanel.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Create chat panel**

Create `src/components/ChatPanel.tsx`:

```tsx
import type { ChichiState } from "../domain/types";

interface Props {
  state: ChichiState;
}

export function ChatPanel({ state }: Props) {
  const blocked = state.tasks.find((task) => task.status === "blocked");
  const newSources = state.sources.filter((source) => source.changeStatus === "new");

  return (
    <aside className="chatPanel">
      <h2>치치에게 묻기</h2>
      <div className="message bot">
        {blocked
          ? `오늘은 "${blocked.title}"부터 확인하는 게 좋아요. 막힌 이유는 ${blocked.blockerReason ?? "확인 필요"}입니다.`
          : "오늘 막힌 작업은 없어요. 새 소스와 마감 샷부터 확인해볼게요."}
      </div>
      <div className="message bot">새로 들어온 소스는 {newSources.length}개입니다.</div>
    </aside>
  );
}
```

- [ ] **Step 2: Create finance panel**

Create `src/components/FinancePanel.tsx`:

```tsx
import { calculateProjectProfit } from "../domain/finance";
import type { ChichiState } from "../domain/types";

interface Props {
  state: ChichiState;
}

export function FinancePanel({ state }: Props) {
  return (
    <section className="financeGrid">
      {state.projects.map((project) => {
        const profit = calculateProjectProfit(state.finance, project.id);
        return (
          <article className="panel" key={project.id}>
            <h2>{project.name}</h2>
            <dl className="financeStats">
              <div><dt>받은 금액</dt><dd>{profit.received.toLocaleString()}원</dd></div>
              <div><dt>미수금</dt><dd>{profit.unpaid.toLocaleString()}원</dd></div>
              <div><dt>외부 비용</dt><dd>{profit.costs.toLocaleString()}원</dd></div>
              <div><dt>실제 수익</dt><dd>{profit.actualProfit.toLocaleString()}원</dd></div>
            </dl>
          </article>
        );
      })}
    </section>
  );
}
```

- [ ] **Step 3: Wire chat and finance into app**

Modify `src/App.tsx`:

```tsx
import { useMemo, useState } from "react";
import { ChatPanel } from "./components/ChatPanel";
import { Dashboard } from "./components/Dashboard";
import { FinancePanel } from "./components/FinancePanel";
import { loadState } from "./storage/localStore";

export default function App() {
  const initialState = useMemo(() => loadState(), []);
  const [activeTab, setActiveTab] = useState<"dashboard" | "finance">("dashboard");

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1>치치</h1>
          <p>VFX 합성 작업을 챙기는 PM 에이전트</p>
        </div>
        <nav>
          <button className={activeTab === "dashboard" ? "active" : ""} onClick={() => setActiveTab("dashboard")}>작업</button>
          <button className={activeTab === "finance" ? "active" : ""} onClick={() => setActiveTab("finance")}>정산</button>
        </nav>
      </header>
      <div className="mainLayout">
        {activeTab === "dashboard" ? <Dashboard state={initialState} /> : <FinancePanel state={initialState} />}
        <ChatPanel state={initialState} />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Add chat and finance styles**

Append to `src/styles.css`:

```css
.mainLayout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  padding-right: 20px;
}

.mainLayout .dashboard {
  padding-right: 0;
}

.chatPanel {
  margin-top: 20px;
  background: #102027;
  color: white;
  border-radius: 8px;
  padding: 16px;
  height: fit-content;
}

.chatPanel h2 {
  margin: 0 0 12px;
  font-size: 18px;
}

.message {
  background: #1f343d;
  border: 1px solid #35515c;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 10px;
  line-height: 1.5;
}

.financeGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  padding: 20px 0 20px 20px;
}

.financeStats {
  display: grid;
  gap: 10px;
}

.financeStats div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.financeStats dt {
  color: #60717a;
}

.financeStats dd {
  margin: 0;
  font-weight: 700;
}

@media (max-width: 1180px) {
  .mainLayout {
    grid-template-columns: 1fr;
    padding-right: 0;
  }

  .chatPanel {
    margin: 0 20px 20px;
  }

  .financeGrid {
    grid-template-columns: 1fr;
    padding-right: 20px;
  }
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`

Expected: PASS.

## Task 10: Final Verification

**Files:**
- Read: `docs/superpowers/specs/2026-07-03-chichi-vfx-pm-agent-design-ko.md`
- Read: `docs/superpowers/specs/2026-07-03-chichi-vfx-pm-agent-design.md`

- [ ] **Step 1: Run all tests**

Run: `npm run test`

Expected: all domain tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: TypeScript and Vite build pass.

- [ ] **Step 3: Start local app**

Run: `npm run dev`

Expected: Vite prints a local URL, usually `http://localhost:5173/`.

- [ ] **Step 4: Manual acceptance check**

Open the local URL and verify:

- First screen shows `오늘 할 일`.
- First screen shows `프로젝트별 상태`.
- First screen shows `새 소스 / 변경 소스`.
- Source list includes plate, 3D, FX, and roto examples.
- Finance tab is separate from the first dashboard.
- Chat panel gives a PM-style recommendation.

## Self-Review

Spec coverage:

- First dashboard is covered by Task 8.
- Source grouping into plate, 3D, FX, and roto is covered by Tasks 2, 3, 7, and 8.
- Source version and latest-status intelligence is covered by Tasks 3 and 4.
- Mixed feedback import is covered by Task 5.
- Integrated task prioritization is covered by Task 6 and Task 8.
- Finance tab and project profit are covered by Task 6 and Task 9.
- Chat-style PM panel is covered by Task 9.

Intentional gap:

- Real Google Drive, Dropbox, Google Slides, Google Sheets, and KakaoTalk API integrations are not included in this MVP implementation plan. The connector boundary is represented in the data model, and real integrations should be planned after this local MVP is working.

Placeholder scan:

- No TBD or TODO placeholders are used.
- Every task names exact files and verification commands.
