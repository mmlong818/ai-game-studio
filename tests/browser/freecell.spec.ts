import { expect, test, type Page } from "@playwright/test";

// 固定游戏由 Vite 开发服务直接以静态文件提供,与正式服务的 /play/freecell/ 同一套产物。
const FREECELL_URL = "/fixtures/freecell/index.html";
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUIT_LETTERS = "CDHS";

type Slot = { type: "column" | "cell" | "foundation"; index: number };
type Move = { from: Slot; to: Slot; count: number };
type State = { columns: number[][]; cells: Array<number | null>; foundations: number[] };

declare global {
  interface Window {
    __freecell: {
      getState: () => State;
      getMeta: () => { level: number; moves: number; won: boolean; unlocked: number; historyLength: number };
      solve: (options?: { maxNodes?: number }) => { solved: boolean; moves: Array<{ move: Move }> };
    };
  }
}

const label = (card: number) => `${RANKS[Math.floor(card / 4)]}${SUIT_LETTERS[card % 4]}`;

async function openGame(page: Page) {
  await page.goto(FREECELL_URL);
  await expect(page.locator("body")).toHaveAttribute("data-dealing", "false", { timeout: 10_000 });
  await expect(page.locator(".card")).toHaveCount(52);
}

/** 用真实点击执行一步:先点起点牌,再点目标(非空列点其底牌,空位点槽位)。 */
async function clickMove(page: Page, state: State, move: Move) {
  const sourceCard = move.from.type === "cell"
    ? state.cells[move.from.index]!
    : state.columns[move.from.index][state.columns[move.from.index].length - move.count];
  // 点牌面顶部露出的条带:被下方牌覆盖的牌只有顶部可见。
  await page.locator(`.card[data-card="${label(sourceCard)}"]`).click({ position: { x: 12, y: 6 } });
  await expect(page.locator(`.card[data-card="${label(sourceCard)}"]`)).toHaveClass(/is-selected/);
  if (move.to.type === "column" && state.columns[move.to.index].length > 0) {
    const target = state.columns[move.to.index].at(-1)!;
    await page.locator(`.card[data-card="${label(target)}"]`).click({ position: { x: 12, y: 6 } });
  } else {
    await page.locator(`[data-slot="${move.to.type}-${move.to.index}"]`).click();
  }
}

// 每个用例使用独立浏览器上下文,localStorage 天然隔离;刷新后仍需保留牌背,因此不能在导航时清空存储。
test.describe("空档接龙固定游戏", () => {
  test("在 Chromium 上用真实点击完成第 1 关通关,期间包含超级移动与撤销", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "完整通关只在 Chromium 执行,其他浏览器由核心单测与移动端用例覆盖。");
    test.setTimeout(180_000);
    await openGame(page);
    await expect(page.locator("#level-number")).toHaveText("1");

    // 先做一次合法移动并撤销,验证历史栈。
    const initial = await page.evaluate(() => window.__freecell.getState());
    const solution = await page.evaluate(() => window.__freecell.solve({ maxNodes: 150_000 }));
    expect(solution.solved).toBe(true);
    await clickMove(page, initial, solution.moves[0].move);
    await expect(page.locator("#moves")).toHaveText("1");
    await page.locator("#undo").click();
    await expect(page.locator("#moves")).toHaveText("0");
    expect(await page.evaluate(() => window.__freecell.getState())).toEqual(initial);

    let sawSupermove = false;
    for (const step of solution.moves) {
      // 自动收牌是逐张动画,等它收完再读局面。
      await expect(page.locator("body")).toHaveAttribute("data-cascading", "false");
      const before = await page.evaluate(() => window.__freecell.getState());
      const movesBefore = await page.evaluate(() => window.__freecell.getMeta().moves);
      await clickMove(page, before, step.move);
      await expect.poll(() => page.evaluate(() => window.__freecell.getMeta().moves)).toBe(movesBefore + 1);
      if (step.move.count > 1) {
        sawSupermove = true;
        await expect(page.locator("#status")).toContainText(`超级移动 ×${step.move.count}`);
        const after = await page.evaluate(() => window.__freecell.getState());
        expect(after.columns[step.move.to.index].length).toBe(before.columns[step.move.to.index].length + step.move.count);
      }
    }
    expect(sawSupermove).toBe(true);
    await expect(page.locator("body")).toHaveAttribute("data-game-state", "won");
    await expect(page.locator("#win-dialog")).toBeVisible();
    await expect(page.locator("#win-moves")).toHaveText(String(solution.moves.length));
    await expect(page.locator("#win-time")).toHaveText(/^\d{2}:\d{2}$/);
    const progress = await page.evaluate(() => JSON.parse(window.localStorage.getItem("freecell.progress.v1") ?? "{}"));
    expect(progress.unlocked).toBe(2);
    expect(progress.results["1"].moves).toBe(solution.moves.length);

    await page.locator("#next-level").click();
    await expect(page.locator("#level-number")).toHaveText("2");
    await page.locator("#open-levels").click();
    await expect(page.locator("#level-grid .level[data-level='2']")).toBeEnabled();
    await expect(page.locator("#level-grid .level[data-level='3']")).toBeDisabled();
  });

  test("手机竖屏 390×844 无横向溢出,可拖拽移动并撤销", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openGame(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
    for (const id of ["undo", "hint", "restart", "open-levels", "open-back"]) {
      const box = await page.locator(`#${id}`).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    const state = await page.evaluate(() => window.__freecell.getState());
    const bottom = state.columns[5].at(-1)!; // 第 1 局第 6 列底牌 3D
    expect(label(bottom)).toBe("3D");
    const card = page.locator(`.card[data-card="3D"]`);
    const cardBox = (await card.boundingBox())!;
    const cellBox = (await page.locator('[data-slot="cell-1"]').boundingBox())!;
    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height - 8);
    await page.mouse.down();
    await page.mouse.move(cardBox.x + cardBox.width / 2 + 10, cardBox.y + cardBox.height - 20, { steps: 4 });
    await page.mouse.move(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2, { steps: 12 });
    await page.mouse.up();
    await expect.poll(() => page.evaluate(() => window.__freecell.getState().cells[1])).toBe(bottom);
    await expect(page.locator("#moves")).toHaveText("1");
    await page.keyboard.press("u");
    await expect(page.locator("#moves")).toHaveText("0");
    expect(await page.evaluate(() => window.__freecell.getState().cells[1])).toBeNull();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
  });

  test("键盘可以选牌、放牌和撤销", async ({ page }) => {
    await openGame(page);
    await page.locator("#table").focus();
    // 数字键 6 选中第 6 列底牌 3D,回车自动放置到空档。
    await page.keyboard.press("6");
    await expect(page.locator('.card[data-card="3D"]')).toHaveClass(/is-selected/);
    await page.keyboard.press("Enter");
    await expect.poll(() => page.evaluate(() => window.__freecell.getState().cells[0])).not.toBeNull();
    await page.keyboard.press("u");
    await expect(page.locator("#moves")).toHaveText("0");
  });

  test("更换牌背后刷新仍然生效,并可恢复默认", async ({ page }) => {
    await openGame(page);
    await expect(page.locator("body")).toHaveAttribute("data-card-back", "default");
    await page.locator("#open-back").click();
    await expect(page.locator("#back-dialog")).toBeVisible();
    // 在浏览器里画一张 300×200 的横图作为用户图片,验证裁切与缩放到 5:7。
    const png = await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 200;
      const context = canvas.getContext("2d")!;
      const gradient = context.createLinearGradient(0, 0, 300, 200);
      gradient.addColorStop(0, "#ff7a59");
      gradient.addColorStop(1, "#2b3a67");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 300, 200);
      return canvas.toDataURL("image/png").split(",")[1];
    });
    await page.locator("#back-file").setInputFiles({ name: "my-back.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
    await expect(page.locator("#apply-back")).toBeEnabled();
    await page.locator("#back-zoom").fill("1.4");
    await page.locator("#apply-back").click();
    await expect(page.locator("body")).toHaveAttribute("data-card-back", "custom");
    const stored = await page.evaluate(() => window.localStorage.getItem("freecell.cardBack.v1"));
    expect(stored?.startsWith("data:image/jpeg;base64,")).toBe(true);
    const size = await page.evaluate((value) => new Promise<{ width: number; height: number }>((resolve) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.src = value!;
    }), stored);
    expect(size).toEqual({ width: 500, height: 700 });

    await page.reload();
    await expect(page.locator("body")).toHaveAttribute("data-card-back", "custom");
    expect(await page.evaluate(() => document.documentElement.style.getPropertyValue("--card-back"))).toContain("data:image/jpeg");
    expect(await page.locator("#deck-preview-image").getAttribute("src")).toContain("data:image/jpeg");

    await page.locator("#open-back").click();
    await page.locator("#reset-back").click();
    await expect(page.locator("body")).toHaveAttribute("data-card-back", "default");
    expect(await page.evaluate(() => window.localStorage.getItem("freecell.cardBack.v1"))).toBeNull();
    await page.reload();
    await expect(page.locator("body")).toHaveAttribute("data-card-back", "default");
  });
});

test("没有任何合法移动时提醒玩家撤销或重开，重开后恢复正常牌局", async ({ page }) => {
  // 红黑 Q 压在 A 上、3 压在 2 上、四张 K 占满空档:没有收牌、叠放或空位可用。
  const stuck = {
    gameNumber: 1,
    columns: [[0, 46], [1, 45], [2, 47], [3, 44], [4, 10], [5, 9], [6, 11], [7, 8]],
    cells: [48, 49, 50, 51],
    foundations: [0, 0, 0, 0],
  };
  await page.addInitScript((state) => {
    localStorage.setItem("freecell.progress.v1", JSON.stringify({ unlocked: 1, results: {} }));
    localStorage.setItem("freecell.session.v1", JSON.stringify({ level: 1, state, history: [], moves: 3, elapsed: 1000, won: false }));
  }, stuck);
  await page.goto(FREECELL_URL);
  const banner = page.getByRole("alert");
  await expect(banner).toBeVisible();
  await expect(banner).toContainText("没有可以移动的牌了");
  await expect(page.locator("#stuck-undo")).toBeHidden(); // 没有历史可撤销
  await page.locator("#stuck-restart").click();
  await expect(banner).toBeHidden();
  await expect(page.locator("body")).toHaveAttribute("data-dealing", "false", { timeout: 10_000 });
  await expect(page.locator(".card")).toHaveCount(52);
  await expect(page.locator("#moves")).toHaveText("0");
});
