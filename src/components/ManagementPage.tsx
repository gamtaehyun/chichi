import { ProjectShotManager } from "./ProjectShotManager";
import type { ChichiState } from "../domain/types";

interface Props {
  state: ChichiState;
  onStateChange: (state: ChichiState) => void;
}

export function ManagementPage({ state, onStateChange }: Props) {
  return (
    <div className="managementPage">
      <ProjectShotManager state={state} onStateChange={onStateChange} selectedProjectId="all" />
    </div>
  );
}
