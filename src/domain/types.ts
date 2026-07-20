export type SourceProvider = "google-drive" | "dropbox" | "manual" | "local";
export type SourceType = "plate" | "3d" | "fx" | "roto" | "reference" | "feedback-media" | "delivery" | "other";
export type LatestStatus = "confirmed-latest" | "likely-latest" | "superseded" | "needs-confirmation";
export type PlateStatus = "original" | "beauty-corrected" | "final" | "uncertain";
export type ChangeStatus = "new" | "modified" | "moved" | "deleted" | "unchanged";
export type WorkStatus = "not-started" | "in-progress" | "review" | "delivered" | "blocked" | "done";
export type FeedbackStatus = "new" | "accepted" | "in-progress" | "done" | "rejected" | "needs-clarification";
export type SourceCheckKey = "plate-original" | "plate-beauty" | "3d" | "fx" | "roto";
export type SourceCheckStatus = "pending" | "confirmed" | "issue" | "not-needed";

export interface SourceCheckItem {
  key: SourceCheckKey;
  status: SourceCheckStatus;
  note?: string;
  sourceFingerprint?: string;
}

export interface DeliveryMilestone {
  id: string;
  label: string;
  date: string;
  kind: "interim" | "final";
}

export interface Project {
  id: string;
  name: string;
  client: string;
  status: WorkStatus;
  startDate: string;
  deliveryDate: string;
  deliveryMilestones: DeliveryMilestone[];
  driveFolders: string[];
  dropboxFolders: string[];
  feedbackLinks: string[];
  kakaoFeedbackNotes: string;
}

export interface Shot {
  id: string;
  projectId: string;
  code: string;
  status: WorkStatus;
  priority: number;
  dueDate: string;
  deliveryDate: string;
  sourceChecklist: SourceCheckItem[];
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
  attachments?: FeedbackAttachment[];
  confidence: number;
  status: FeedbackStatus;
  relation: "new-request" | "duplicate" | "changed-request";
}

export interface FeedbackAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
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
