export async function* streamLines(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      pending += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let end: number;
      while ((end = pending.indexOf("\n")) >= 0) {
        yield pending.slice(0, end).replace(/\r$/, "");
        pending = pending.slice(end + 1);
      }
      if (done) break;
    }
    if (pending) yield pending;
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
