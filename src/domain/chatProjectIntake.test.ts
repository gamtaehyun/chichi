import { describe, expect, it } from "vitest";
import {
  extractNewProjectName,
  extractSlideUrls,
  extractSpreadsheetUrls,
  googleSheetCsvUrl,
  googleSlideTextUrl,
  isShotListRequest,
  parseSlideShotListText,
  parseShotListCsv,
  parseShotListText
} from "./chatProjectIntake";

describe("chatProjectIntake", () => {
  it("detects a new project name from natural Korean text", () => {
    expect(extractNewProjectName("이건 새로운 프로젝트 BND_BBB이라는 프로젝트예요.")).toBe("BND_BBB");
    expect(extractNewProjectName("프로젝트명: abc_001")).toBe("ABC_001");
    expect(extractNewProjectName("BND_BBB 샷 리스트 드립니다.")).toBe("BND_BBB");
  });

  it("extracts Google spreadsheet links and CSV export URLs from plain and markdown links", () => {
    const url = "https://docs.google.com/spreadsheets/d/1abcDEF/edit?usp=sharing";

    expect(extractSpreadsheetUrls(`샷 리스트 ${url}`)).toEqual([url]);
    expect(extractSpreadsheetUrls(`[${url}](${url})`)).toEqual([url]);
    expect(googleSheetCsvUrl(url)).toBe("https://docs.google.com/spreadsheets/d/1abcDEF/gviz/tq?tqx=out:csv&gid=0");
  });

  it("extracts Google Slides links separately", () => {
    const url = "https://docs.google.com/presentation/d/1slideABC/edit?usp=sharing";

    expect(extractSlideUrls(`구글 슬라이드로 샷 리스트 공유합니다. ${url}`)).toEqual([url]);
  });

  it("recognizes sheet, slide, KakaoTalk, and pasted production text requests", () => {
    expect(isShotListRequest("샷 리스트 드립니다. 내용 정리해주세요.")).toBe(true);
    expect(isShotListRequest("구글 슬라이드에 정리된 컷 목록이에요.")).toBe(true);
    expect(isShotListRequest("카톡으로 받은 제작 붙여넣기 내용입니다.")).toBe(true);
    expect(isShotListRequest("shot list updated")).toBe(true);
  });

  it("parses pasted shot list text into shot rows", () => {
    const items = parseShotListText(
      `
      BND_BBB이라는 프로젝트예요.
      SH010 2026-07-21
      BND_BBB_020 2026.07.22
      BND_BBB_030 comp
      `,
      "BND_BBB"
    );

    expect(items).toEqual([
      { code: "SH010", dueDate: "2026-07-21", workNote: undefined },
      { code: "BND_BBB_020", dueDate: "2026-07-22", workNote: undefined },
      { code: "BND_BBB_030", dueDate: undefined, workNote: "comp" }
    ]);
  });

  it("parses KakaoTalk or production pasted rows into shot rows", () => {
    const items = parseShotListText(
      `
      [production] cut 010 plate in 2026-07-21
      [kakao] BND_BBB_020 roto needed
      shot 030 comp start
      `,
      "BND_BBB"
    );

    expect(items).toEqual([
      { code: "SH010", dueDate: "2026-07-21", workNote: "plate in" },
      { code: "BND_BBB_020", dueDate: undefined, workNote: "roto needed" },
      { code: "SH030", dueDate: undefined, workNote: "comp start" }
    ]);
  });

  it("parses spreadsheet CSV rows into shot rows", () => {
    const items = parseShotListCsv("Shot,Due\nBND_BBB_010,2026-07-21\nBND_BBB_020,2026-07-22", "BND_BBB");

    expect(items).toEqual([
      { code: "BND_BBB_010", dueDate: "2026-07-21", workNote: undefined },
      { code: "BND_BBB_020", dueDate: "2026-07-22", workNote: undefined }
    ]);
  });

  it("uses CUT NAME headers and neighboring work note columns from VFX sheets", () => {
    const items = parseShotListCsv(
      `Scene,Shot No.,PREVIEW,CUT NAME (SRC NAME),,WORK
,,,
,1,,C0014,,"stair extension, sky comp, paper CG"
,2,,C0015,,"blue eye CG, sky comp"
,3,,C0016,,"street comp, stair extension, sky comp"`,
      "BND_BBB"
    );

    expect(items).toEqual([
      { code: "C0014", dueDate: undefined, workNote: "stair extension, sky comp, paper CG" },
      { code: "C0015", dueDate: undefined, workNote: "blue eye CG, sky comp" },
      { code: "C0016", dueDate: undefined, workNote: "street comp, stair extension, sky comp" }
    ]);
  });

  it("parses Google Slides VFX text where TC codes are shot names", () => {
    const url = "https://docs.google.com/presentation/d/1slideABC/edit?usp=sharing";
    const items = parseSlideShotListText(
      `LSF-VCR 1,2,3
엉켜버리는 이어폰 줄
톡톡 두드릴때 이어폰이 샥 감기게 해주세요.
1컷
애니매틱 타임코드 00:00:00:00
김태현
AI
VCR1
0630_LSF1_TC00005912
윤진 리무빙 + 윤진 리버스 합성 2컷
2컷
김태현
AI
2D
0630_LSF1_TC00030018 리무브
0630_LSF1_TC00030500 (편집본 참고해서 윤진 리버스)
0630_LSF1_TC00031307 (편집본 참고해서 윤진 리버스)
공중에 뜬 채원과 장기
공중에 뜬 채원과 장기말들
초록 박스 친 간판 텍스트 지워주세요
01:11
태현
김태현
0630_LSF2_TC010915`,
      "LSF_VCR"
    );

    expect(googleSlideTextUrl(url)).toBe("https://docs.google.com/presentation/d/1slideABC/export/txt");
    expect(items).toEqual([
      { code: "0630_LSF1_TC00005912", dueDate: undefined, workNote: "엉켜버리는 이어폰 줄 / 톡톡 두드릴때 이어폰이 샥 감기게 해주세요." },
      { code: "0630_LSF1_TC00030018", dueDate: undefined, workNote: "리무브" },
      { code: "0630_LSF1_TC00030500", dueDate: undefined, workNote: "편집본 참고해서 윤진 리버스" },
      { code: "0630_LSF1_TC00031307", dueDate: undefined, workNote: "편집본 참고해서 윤진 리버스" },
      {
        code: "0630_LSF2_TC010915",
        dueDate: undefined,
        workNote: "공중에 뜬 채원과 장기 / 공중에 뜬 채원과 장기말들 초록 박스 친 간판 텍스트 지워주세요"
      }
    ]);
  });
});
