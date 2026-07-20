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

  it("normalizes loose shot code expressions", () => {
    const result = parseFeedbackText(
      `
      SH 10 밝기 조금 낮춰주세요.
      20번 컷 edge 확인 부탁드립니다.
      `,
      "kakaotalk-paste"
    );

    expect(result[0].shotCode).toBe("SH010");
    expect(result[1].shotCode).toBe("SH020");
  });
});
