import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { Dashboard } from "./components/Dashboard";
import { FinancePanel } from "./components/FinancePanel";
import { ProjectDetailPage } from "./components/ProjectDetailPage";
import { TaskHistoryPanel } from "./components/TaskHistoryPanel";
import { applySourceChecklistRules } from "./domain/stateActions";
import type { ChichiState } from "./domain/types";
import { loadState, saveState } from "./storage/localStore";

type ActiveTab = "dashboard" | "tasks" | "finance";

function isChichiState(value: unknown): value is ChichiState {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<ChichiState>;
  return (
    Array.isArray(candidate.projects) &&
    Array.isArray(candidate.shots) &&
    Array.isArray(candidate.sources) &&
    Array.isArray(candidate.feedback) &&
    Array.isArray(candidate.tasks) &&
    Array.isArray(candidate.finance)
  );
}

export default function App() {
  const initialState = useMemo(() => loadState(), []);
  const [state, setState] = useState(initialState);
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    setState((currentState) => applySourceChecklistRules(currentState));
  }, [state.sources]);

  function handleExportBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `vfx-schedule-backup-${date}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleImportBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!isChichiState(parsed)) {
          window.alert("백업 파일 형식이 맞지 않습니다.");
          return;
        }

        if (window.confirm("현재 데이터를 백업 파일 내용으로 교체할까요?")) {
          setSelectedProjectId(null);
          setState(parsed);
        }
      } catch {
        window.alert("백업 파일을 읽지 못했습니다.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="titleBlock">
          <h1>VFX 일정 관리</h1>
          <p>프로젝트 진행, 소스, 피드백 흐름을 한눈에 확인합니다.</p>
        </div>
        <div className="topbarActions">
          <nav aria-label="주요 메뉴">
            <button
              className={activeTab === "dashboard" && !selectedProjectId ? "active" : ""}
              onClick={() => {
                setActiveTab("dashboard");
                setSelectedProjectId(null);
              }}
            >
              작업
            </button>
            <button
              className={activeTab === "tasks" ? "active" : ""}
              onClick={() => {
                setActiveTab("tasks");
                setSelectedProjectId(null);
              }}
            >
              작업 이력
            </button>
            <button
              className={activeTab === "finance" ? "active" : ""}
              onClick={() => {
                setActiveTab("finance");
                setSelectedProjectId(null);
              }}
            >
              정산
            </button>
          </nav>
          <div className="dataTools" aria-label="데이터 백업과 복원">
            <button onClick={handleExportBackup} type="button">
              백업
            </button>
            <label>
              복원
              <input accept="application/json" onChange={handleImportBackup} type="file" />
            </label>
          </div>
        </div>
      </header>
      <div className="mainLayout">
        {activeTab === "dashboard" && selectedProjectId ? (
          <ProjectDetailPage state={state} projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} onStateChange={setState} />
        ) : null}
        {activeTab === "dashboard" && !selectedProjectId ? <Dashboard state={state} onOpenProject={setSelectedProjectId} onStateChange={setState} /> : null}
        {activeTab === "tasks" ? <TaskHistoryPanel state={state} onStateChange={setState} /> : null}
        {activeTab === "finance" ? <FinancePanel state={state} onStateChange={setState} /> : null}
      </div>
    </main>
  );
}
