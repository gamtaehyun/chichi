import { useEffect, useMemo, useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { FinancePanel } from "./components/FinancePanel";
import { ProjectDetailPage } from "./components/ProjectDetailPage";
import { TaskHistoryPanel } from "./components/TaskHistoryPanel";
import { applySourceChecklistRules } from "./domain/stateActions";
import { loadState, saveState } from "./storage/localStore";

type ActiveTab = "dashboard" | "tasks" | "finance";

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
