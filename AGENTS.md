# AI Game Studio agent guidance

- Keep the user's goal, the project's existing functions, data, and design language before proposing UI changes.
- Read [docs/103-game-ui-design-methodology.md](docs/103-game-ui-design-methodology.md) before planning or reviewing game UI, HUD, menus, generated visual assets, or an existing-game renovation.
- Read [docs/104-openai-image-prompting-study.md](docs/104-openai-image-prompting-study.md) before changing image-generation prompts, reference/edit workflows, transparency handling, or Sprite Sheet generation.
- Read [docs/105-creation-pipeline-design-enforcement.md](docs/105-creation-pipeline-design-enforcement.md) for the implemented creation-pipeline contracts and remaining manual-review boundaries.
- Before changing generation quality gates, retry, or recovery behavior, read and update [docs/106-generated-game-failure-ledger.md](docs/106-generated-game-failure-ledger.md). Keep implementation, automated-test, real-build, and unresolved status separate; do not describe uncommitted work as released.
- Treat the methodology as project guidance, not as an approval gate. Apply only the states and checks that the requested feature actually has.
- In environments that support subagents, the coordinating Astra agent should delegate implementation-heavy reading, editing, and test runs to Sol or Terra agents when practical, then review the evidence and result. In environments without subagents, proceed directly.
- Never expose methodology notes, prompt instructions, or internal evidence labels in player-facing game UI.
