import { describe, expect, it } from "vitest";
import { addProject, addShot } from "./stateActions";
import { parseSourceIntake } from "./sourceIntake";
import type { ChichiState } from "./types";

const baseState: ChichiState = {
  projects: [],
  shots: [],
  sources: [],
  feedback: [],
  tasks: [],
  finance: []
};

describe("parseSourceIntake", () => {
  it("turns chat source text into a source file", () => {
    const state = addShot(
      addProject(baseState, {
        name: "FILM_A",
        client: "Client X",
        startDate: "2026-07-04",
        deliveryDate: "2026-07-10"
      }),
      {
        projectId: "project-film-a",
        code: "SH010",
        dueDate: "2026-07-05",
        deliveryDate: "2026-07-06",
        priority: 4
      }
    );
    const project = state.projects[0];
    const result = parseSourceIntake("FILM_A SH010 FX v004 들어왔어", project, state.shots, "2026-07-04T09:00:00+09:00");

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      projectId: project.id,
      shotId: state.shots[0].id,
      sourceType: "fx",
      version: 4,
      changeStatus: "new"
    });
  });

  it("classifies pasted drive links as source files when source words are present", () => {
    const state = addShot(
      addProject(baseState, {
        name: "FILM_A",
        client: "Client X",
        startDate: "2026-07-04",
        deliveryDate: "2026-07-10"
      }),
      {
        projectId: "project-film-a",
        code: "SH020",
        dueDate: "2026-07-05",
        deliveryDate: "2026-07-06",
        priority: 4
      }
    );
    const project = state.projects[0];
    const result = parseSourceIntake(
      "FILM_A SH020 roto 소스 https://drive.google.com/SH020_roto_alpha_v002.exr",
      project,
      state.shots,
      "2026-07-04T09:00:00+09:00"
    );

    expect(result[0]).toMatchObject({
      provider: "google-drive",
      sourceType: "roto",
      version: 2
    });
  });
});
