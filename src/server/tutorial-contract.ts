/** Removes only the retired tutorial/stepped-assistance parts from a persisted contract. */
export function stripTutorialContract(value: unknown): unknown {
  if (Array.isArray(value)) return value
    .filter((entry) => !(entry && typeof entry === "object" && ["onboarding", "assistance"].includes(String((entry as { kind?: unknown }).kind))))
    .map(stripTutorialContract);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !key.toLowerCase().includes("onboarding") && key !== "assistance")
    .map(([key, entry]) => [key, key === "capabilityIds" && Array.isArray(entry)
      ? entry.filter((id) => id !== "onboarding" && id !== "failure-assistance").map(stripTutorialContract)
      : stripTutorialContract(entry)]));
}
