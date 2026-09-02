import { describe, expect, it } from "vitest";
import { createProject } from "./project";
import { listProjects, loadProject, saveProject } from "./projectStorage";
import { INITIAL_DRAFT } from "./storage";

describe("project persistence", () => {
  it("保存并恢复完整 v2 项目而不是只有创建草稿", () => {
    const project = createProject({
      ...INITIAL_DRAFT,
      selectedSuggestionIds: ["merge-2048-world"],
    });
    saveProject(project);

    expect(loadProject(project.id)).toEqual(project);
    expect(listProjects()).toEqual([{ id: project.id, name: project.name, activeBuildId: null }]);
  });

  it("损坏的本地项目不会阻塞工作台", () => {
    window.localStorage.setItem("ai-game-studio:projects:v2", JSON.stringify({ broken: { id: "broken" } }));
    expect(loadProject("broken")).toBeNull();
  });
});
