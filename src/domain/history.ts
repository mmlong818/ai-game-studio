export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
  limit: number;
}

export const createHistory = <T>(present: T, limit = 50): HistoryState<T> => ({ past: [], present, future: [], limit });

export const commitHistory = <T>(history: HistoryState<T>, next: T): HistoryState<T> => ({
  ...history,
  past: [...history.past, history.present].slice(-history.limit),
  present: next,
  future: [],
});

export const undoHistory = <T>(history: HistoryState<T>): HistoryState<T> => {
  const previous = history.past.at(-1);
  if (previous === undefined) return history;
  return { ...history, past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future] };
};

export const redoHistory = <T>(history: HistoryState<T>): HistoryState<T> => {
  const next = history.future[0];
  if (next === undefined) return history;
  return { ...history, past: [...history.past, history.present].slice(-history.limit), present: next, future: history.future.slice(1) };
};
