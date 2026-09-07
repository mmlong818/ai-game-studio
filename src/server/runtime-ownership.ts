import { Pool } from "pg";

/** Hold a dedicated session for the entire API lifetime, including startup recovery. */
export async function acquireRuntimeOwnership(connectionString: string, onLost: () => void) {
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 5000 });
  let closed = false;
  const lost = () => { if (!closed) onLost(); };
  pool.on("error", lost);
  try {
    const client = await pool.connect();
    client.on("error", lost);
    let owned = false;
    try {
      const result = await client.query<{ owned: boolean }>(
        "SELECT pg_try_advisory_lock(hashtext(current_database()), hashtext(current_schema() || ':ai-game-studio-runtime')) AS owned",
      );
      owned = result.rows[0]?.owned === true;
      if (!owned) throw new Error("已有游戏制作服务连接此数据库；为保护正在执行的任务，本服务不会启动或执行中断恢复。");
    } catch (error) {
      closed = true;
      client.release(true);
      throw error;
    }
    return {
      async release() {
        if (closed) return;
        closed = true;
        client.release(true); // Destroying the session releases its advisory lock.
        await pool.end();
      },
    };
  } catch (error) {
    closed = true;
    await pool.end();
    throw error;
  }
}
