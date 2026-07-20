import { updateFeedback } from "../domain/stateActions";
import type { ChichiState, Feedback, FeedbackStatus, Project, Shot } from "../domain/types";

interface Props {
  state: ChichiState;
  feedback: Feedback;
  relatedFeedback: Feedback[];
  projects: Project[];
  shots: Shot[];
  onSelectFeedback: (feedbackId: string) => void;
  onStateChange: (state: ChichiState) => void;
  onClose: () => void;
}

const feedbackStatusLabel: Record<FeedbackStatus, string> = {
  new: "새 피드백",
  accepted: "수락",
  "in-progress": "진행 중",
  done: "완료",
  rejected: "반려",
  "needs-clarification": "확인 필요"
};

export function FeedbackDetailPanel({ state, feedback, relatedFeedback, projects, shots, onSelectFeedback, onStateChange, onClose }: Props) {
  const currentShot = shots.find((shot) => shot.id === feedback.shotId);
  const currentProject = projects.find((project) => project.id === feedback.projectId) ?? projects.find((project) => project.id === currentShot?.projectId);
  const shotOptions = currentProject ? shots.filter((shot) => shot.projectId === currentProject.id) : shots;

  return (
    <section className="feedbackDetailPanel">
      <div className="feedbackDetailHeader">
        <div>
          <h3>{currentShot?.code ?? "샷 미연결"} 피드백</h3>
          <span>{currentProject?.name ?? "프로젝트 미정"}</span>
        </div>
        <button onClick={onClose}>닫기</button>
      </div>

      {relatedFeedback.length > 1 ? (
        <div className="feedbackTabs" aria-label="샷 피드백 목록">
          {relatedFeedback.map((item, index) => (
            <button className={item.id === feedback.id ? "active" : ""} key={item.id} onClick={() => onSelectFeedback(item.id)}>
              피드백 {index + 1}
            </button>
          ))}
        </div>
      ) : null}

      <div className="feedbackDetailGrid">
        <label>
          상태
          <select value={feedback.status} onChange={(event) => onStateChange(updateFeedback(state, feedback.id, { status: event.target.value as FeedbackStatus }))}>
            {Object.entries(feedbackStatusLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          샷 연결
          <select value={feedback.shotId ?? ""} onChange={(event) => onStateChange(updateFeedback(state, feedback.id, { shotId: event.target.value || undefined }))}>
            <option value="">샷 미연결</option>
            {shotOptions.map((shot) => (
              <option key={shot.id} value={shot.id}>
                {shot.code}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span>신뢰도</span>
          <strong>{Math.round(feedback.confidence * 100)}%</strong>
        </div>
      </div>

      <div className="feedbackTextBlock">
        <span>정리된 작업 지시</span>
        <p>{feedback.instruction}</p>
      </div>
      <div className="feedbackTextBlock">
        <span>원문</span>
        <p>{feedback.originalText}</p>
      </div>

      {feedback.attachments?.length ? (
        <div className="feedbackAttachmentGrid">
          {feedback.attachments.map((attachment) => (
            <figure key={attachment.id}>
              <img src={attachment.dataUrl} alt={attachment.fileName} />
              <figcaption>{attachment.fileName}</figcaption>
            </figure>
          ))}
        </div>
      ) : null}
    </section>
  );
}
