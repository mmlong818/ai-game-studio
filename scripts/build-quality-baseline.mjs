const origin = process.env.STUDIO_ORIGIN ?? "http://127.0.0.1:4312";

async function request(path, init) {
  const response = await fetch(`${origin}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? `请求失败：${response.status}`);
  return payload;
}

async function waitForBuild(projectId) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    const { build } = await request(`/api/projects/${projectId}/build`);
    if (build?.status === "succeeded") return build;
    if (build?.status === "failed") throw new Error(build.error ?? "构建失败");
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error("等待真实浏览器验收超时。");
}

const { projects } = await request("/api/projects");
const force = process.argv.includes("--force");
const templateArgument = process.argv.find((argument) => argument.startsWith("--templates="));
const selectedTemplates = templateArgument ? new Set(templateArgument.slice("--templates=".length).split(",").filter(Boolean)) : null;
const targets = projects.filter((project) => !project.fixtureKind
  && (!selectedTemplates || selectedTemplates.has(project.template))
  && (force || project.version.qualityStatus !== "passed"));
const results = [];

for (const project of targets) {
  process.stdout.write(`开始 ${project.title}：`);
  try {
    await request(`/api/projects/${project.id}/build`, { method: "POST", body: "{}" });
    const build = await waitForBuild(project.id);
    const refreshed = (await request(`/api/projects/${project.id}`)).project;
    results.push({ title: project.title, status: "passed", version: refreshed.version.number, checks: refreshed.version.qualitySummary, previewUrl: build.previewUrl });
    console.log(`v${refreshed.version.number} 自动验收通过，等待主美复核`);
  } catch (error) {
    results.push({ title: project.title, status: "failed", error: error instanceof Error ? error.message : String(error) });
    console.log(`失败：${results.at(-1).error}`);
  }
}

console.log(JSON.stringify({ checked: results.length, passed: results.filter((result) => result.status === "passed").length, failed: results.filter((result) => result.status === "failed").length, results }, null, 2));
if (results.some((result) => result.status === "failed")) process.exitCode = 1;
