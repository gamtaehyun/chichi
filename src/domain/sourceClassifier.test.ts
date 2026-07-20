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
