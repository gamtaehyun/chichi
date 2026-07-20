import type { ChichiState } from "../domain/types";
import { ChatPanel } from "./ChatPanel";
import { ProjectStatusCards } from "./ProjectStatusCards";
import { ReviewQueue } from "./ReviewQueue";
import { SourceChanges } from "./SourceChanges";

interface Props {
  state: ChichiState;
  onOpenProject: (projectId: string) => void;
  onStateChange: (state: ChichiState) => void;
}

export function Dashboard({ state, onOpenProject, onStateChange }: Props) {
  return (
    <div className="homeDashboard">
      <div className="homeWorkArea">
        <ProjectStatusCards projects={state.projects} shots={state.shots} feedback={state.feedback} sources={state.sources} onSelectProject={onOpenProject} />
        <div className="homeLowerGrid">
          <ReviewQueue state={state} onStateChange={onStateChange} />
          <SourceChanges sources={state.sources} />
        </div>
      </div>
      <div className="homeChatArea">
        <ChatPanel state={state} onStateChange={onStateChange} />
      </div>
    </div>
  );
}
