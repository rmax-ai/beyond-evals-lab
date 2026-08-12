import { supportUser } from "../domain/fixtures.js";
import { EveSessionRuntime } from "./session-runtime.js";

/** Retains active Eve runtime sessions by their Eve session identifier. */
export class EveSessionStore {
  private readonly sessions = new Map<string, EveSessionRuntime>();

  getOrCreate(sessionId: string, actorId = supportUser.id): EveSessionRuntime {
    const existing = this.sessions.get(sessionId);
    if (existing !== undefined) {
      return existing;
    }

    const runtime = new EveSessionRuntime(sessionId, actorId);
    this.sessions.set(sessionId, runtime);
    return runtime;
  }

  get(sessionId: string): EveSessionRuntime | undefined {
    return this.sessions.get(sessionId);
  }

  delete(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }
}
