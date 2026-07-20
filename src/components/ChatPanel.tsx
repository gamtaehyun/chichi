import { useState } from "react";
import type { ClipboardEvent } from "react";
import { ArrowUp, Plus } from "lucide-react";
import { processChatIntake } from "../domain/chatIntakeProcessor";
import type { ChichiState, FeedbackAttachment } from "../domain/types";

interface Props {
  state: ChichiState;
  contextProjectId?: string;
  onStateChange: (state: ChichiState) => void;
}

type PendingAttachment = FeedbackAttachment;

function fileToAttachment(file: File): Promise<PendingAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve({
        id: `attachment-${file.name}-${file.size}-${file.lastModified}`,
        fileName: file.name,
        mimeType: file.type,
        dataUrl: String(reader.result)
      });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function readCsvFromBrowser(url: string): Promise<string | undefined> {
  const response = await fetch(url);
  if (!response.ok) return undefined;
  const text = await response.text();

  if (/<!doctype html|<html|accounts\.google\.com|google 계정|로그인/i.test(text.slice(0, 500))) return undefined;
  return text;
}

async function readPresentationTextFromBrowser(url: string): Promise<string | undefined> {
  const response = await fetch(url);
  if (!response.ok) return undefined;
  const text = await response.text();

  if (/<!doctype html|<html|accounts\.google\.com|google 계정|로그인/i.test(text.slice(0, 500))) return undefined;
  return text;
}

export function ChatPanel({ state, contextProjectId, onStateChange }: Props) {
  const blocked = state.tasks.find((task) => task.status === "blocked");
  const newSources = state.sources.filter((source) => source.changeStatus === "new");
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const images = Array.from(files).filter((file) => file.type.startsWith("image/"));
    const nextAttachments = await Promise.all(images.map(fileToAttachment));

    setAttachments((current) => [...current, ...nextAttachments]);
  }

  async function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const imageFiles = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    const nextAttachments = await Promise.all(imageFiles.map(fileToAttachment));
    setAttachments((current) => [...current, ...nextAttachments]);
  }

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id));
  }

  async function handleSubmit() {
    if (isProcessing || (!message.trim() && attachments.length === 0)) return;

    setIsProcessing(true);

    try {
      const result = await processChatIntake(state, message, {
        attachments,
        contextProjectId,
        readCsv: readCsvFromBrowser,
        readPresentationText: readPresentationTextFromBrowser
      });

      onStateChange(result.state);
      setChatLog((current) => [result.message, ...current]);
      setMessage("");
      setAttachments([]);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <aside className="chatPanel">
      <div className="chatHeroTitle">
        <h2>무엇을 도와드릴까요?</h2>
      </div>
      <div className="chatComposer">
        <textarea
          className="chatInput"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onPaste={handlePaste}
          placeholder="새 프로젝트, 샷 리스트, 링크, 피드백을 편하게 말해주세요."
        />
        <div className="chatComposerActions">
          <label className="attachmentButton" title="이미지 선택">
            <Plus size={16} />
            <input type="file" accept="image/*" multiple onChange={(event) => handleFiles(event.target.files)} />
          </label>
          <button className="chatSendButton" aria-label="정리 요청 보내기" disabled={isProcessing} onClick={() => void handleSubmit()}>
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
      {attachments.length > 0 ? (
        <div className="attachmentList">
          {attachments.map((attachment) => (
            <div className="attachmentItem" key={attachment.id}>
              <img src={attachment.dataUrl} alt={attachment.fileName} />
              <span>{attachment.fileName}</span>
              <button onClick={() => removeAttachment(attachment.id)}>삭제</button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="chatInsightStrip">
        <span>{blocked ? `확인 필요: ${blocked.title}` : "막힌 작업 없음"}</span>
        <span>새 소스 {newSources.length}개</span>
      </div>
      <div className="chatLog">
        {chatLog.map((item, index) => (
          <div className="message bot" key={`${item}-${index}`}>
            {item}
          </div>
        ))}
      </div>
    </aside>
  );
}
