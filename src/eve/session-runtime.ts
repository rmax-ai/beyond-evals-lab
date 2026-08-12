import { AuthorizationControl } from "../controls/authorization.js";
import { GuardrailEngine } from "../controls/engine.js";
import { ForbiddenActionsControl } from "../controls/forbidden-actions.js";
import { RefundLimitControl } from "../controls/refund-limit.js";
import { SchemaValidationControl } from "../controls/schema-validation.js";
import { createFixtureState } from "../domain/fixtures.js";
import { cloneState } from "../domain/world-state.js";
import { executeTool } from "../runtime/execute-tool.js";

import type { ControlDecision, ControlEvent } from "../controls/types.js";
import type { AgentRun, TraceEvent, User, WorldState } from "../domain/types.js";
import type { ToolName, ToolResult } from "../tools/contracts.js";

/** Indicates that a session was created with an actor absent from its world state. */
export class EveSessionActorNotFoundError extends Error {
  constructor(actorId: string) {
    super(`Actor not found in Eve session state: ${actorId}`);
    this.name = "EveSessionActorNotFoundError";
  }
}

/** Bridges Eve tool calls through the lab runtime for one append-only session. */
export class EveSessionRuntime {
  private state: WorldState;
  private readonly initialState: WorldState;
  private readonly guardrailEngine: GuardrailEngine;
  private readonly controlEvents: ControlEvent[] = [];
  private readonly trace: TraceEvent[] = [];
  private eventCount = 0;
  private readonly startedAt: string;
  private firstMessage = "";

  constructor(
    private readonly sessionId: string,
    private readonly actorId: string,
  ) {
    this.state = createFixtureState();
    this.initialState = cloneState(this.state);
    this.guardrailEngine = new GuardrailEngine([
      new AuthorizationControl(),
      new RefundLimitControl(),
      new SchemaValidationControl(),
      new ForbiddenActionsControl(),
    ]);
    this.startedAt = new Date().toISOString();
  }

  /** Begins the session trace with the user's request. */
  start(message: string): void {
    if (this.firstMessage === "") {
      this.firstMessage = message;
    }
    this.appendEvent("request", { message, actorId: this.actorId });
  }

  /** Runs an Eve tool invocation through controls, execution, mutation, and tracing. */
  async executeToolCall(
    toolName: ToolName,
    rawInput: unknown,
    toolCallId: string,
  ): Promise<{ result: ToolResult<unknown>; controlDecision: ControlDecision }> {
    const execution = await executeTool(
      toolName,
      rawInput,
      {
        state: this.state,
        actor: this.getActor(),
        requestId: this.sessionId,
        request: {
          requestId: this.sessionId,
          actorId: this.actorId,
          message: this.firstMessage,
        },
        runId: this.sessionId,
        toolCallId,
        guardrailEngine: this.guardrailEngine,
        controlEvents: this.controlEvents,
      },
      (type, data): void => this.appendEvent(type, data),
    );

    if (execution.newState !== undefined) {
      this.state = execution.newState;
    }

    return { result: execution.result, controlDecision: execution.controlDecision };
  }

  /** Completes the session and exports the full lab run artifact. */
  finish(message?: string): AgentRun {
    if (message !== undefined) {
      this.appendEvent("agent_response", { message });
    }

    return {
      id: this.sessionId,
      request: {
        requestId: this.sessionId,
        actorId: this.actorId,
        message: this.firstMessage,
      },
      initialState: cloneState(this.initialState),
      finalState: cloneState(this.state),
      trace: structuredClone(this.trace),
      startedAt: this.startedAt,
      completedAt: new Date().toISOString(),
    };
  }

  /** Returns an independent snapshot of the session's current world state. */
  getState(): WorldState {
    return cloneState(this.state);
  }

  private getActor(): User {
    const actor = this.state.users.find((user) => user.id === this.actorId);
    if (actor === undefined) {
      throw new EveSessionActorNotFoundError(this.actorId);
    }
    return actor;
  }

  private appendEvent(type: TraceEvent["type"], data: Record<string, unknown>): void {
    this.eventCount += 1;
    this.trace.push({
      id: `${this.sessionId}:event:${this.eventCount}`,
      runId: this.sessionId,
      sequence: this.eventCount,
      timestamp: new Date().toISOString(),
      type,
      data: structuredClone(data),
    });
  }
}
