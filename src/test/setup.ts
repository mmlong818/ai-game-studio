import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

Object.defineProperty(window, "scrollTo", {
  value: vi.fn(),
  writable: true,
});
