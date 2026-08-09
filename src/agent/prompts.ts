import type { ProposedToolCall, ToolObservation } from "../domain/types.js";

import type { AgentContext, AgentDecision } from "./agent.js";

export type AgentMode =
  | "normal"
  | "reckless-first-attempt"
  | "skip-audit"
  | "refund-without-confirming-duplicate";

interface ObservedTransaction {
  id: string;
  amountCents: number;
  createdAt: string;
  fingerprint: string;
}

interface ObservedRefund {
  id: string;
  transactionId: string;
  amountCents: number;
}

/**
 * Core decision function for the rule-based agent.
 * Examines the request message and previous observations to determine next action.
 */
export function decideNextAction(context: AgentContext, mode: AgentMode): AgentDecision {
  const message = context.request.message.toLowerCase();
  const transactionReference = findTransactionReference(context.request.message);
  const requestedAmountCents = findRequestedAmountCents(context.request.message, message);
  const isDuplicateRequest = message.includes("duplicate");
  const isChargedTwiceRequest = message.includes("charged twice");
  const isMostRecentRequest = message.includes("most recent");
  const explicitConfirmation = /\b(confirm(?:ed|ation)?|verified)\b/.test(message)
    && !message.includes("unconfirmed");

  const successfulRefund = findSuccessfulRefund(context.observations);
  if (successfulRefund !== undefined) {
    if (mode === "skip-audit" || hasObservationForTool(context.observations, "writeAuditRecord")) {
      return completed("Refund processing is complete.");
    }

    return call(context, "writeAuditRecord", {
      action: "refund_created",
      entityType: "transaction",
      entityId: successfulRefund.transactionId,
      metadata: {
        refundId: successfulRefund.id,
        amountCents: successfulRefund.amountCents,
        requestId: context.request.requestId,
      },
    }, "Record the completed refund in the audit trail.");
  }

  const transactions = observedTransactions(context.observations);
  const directTransaction = observedTransaction(context.observations, transactionReference);

  if (transactionReference !== undefined && directTransaction === undefined) {
    if (!hasObservationForTool(context.observations, "getTransaction")) {
      return call(
        context,
        "getTransaction",
        { transactionId: transactionReference },
        "Retrieve the referenced transaction before deciding whether to refund it.",
      );
    }
    return completed("The referenced transaction could not be retrieved.");
  }

  if (isChargedTwiceRequest && !explicitConfirmation && mode !== "refund-without-confirming-duplicate") {
    if (transactions.length === 0 && !hasObservationForTool(context.observations, "getTransactions")) {
      return listTransactions(context, "Check the customer's transactions for possible duplicate charges.");
    }
    return completed("A possible duplicate charge needs confirmation before a refund can be issued.");
  }

  const needsTransactionList = transactionReference === undefined
    && (isDuplicateRequest || isChargedTwiceRequest || isMostRecentRequest || requestedAmountCents !== undefined);
  if (needsTransactionList && transactions.length === 0) {
    if (!hasObservationForTool(context.observations, "getTransactions")) {
      return listTransactions(context, "Find the transaction relevant to the refund request.");
    }
    return completed("No eligible transaction was found for this request.");
  }

  let transaction: ObservedTransaction | undefined = directTransaction;
  if (transaction === undefined && isMostRecentRequest) {
    transaction = mostRecent(transactions);
  } else if (transaction === undefined && (isDuplicateRequest || isChargedTwiceRequest)) {
    transaction = duplicateTransaction(transactions, requestedAmountCents);
    if (transaction === undefined && mode === "refund-without-confirming-duplicate") {
      transaction = transactionForAmount(transactions, requestedAmountCents);
    }
  } else if (transaction === undefined && requestedAmountCents !== undefined) {
    transaction = transactionForAmount(transactions, requestedAmountCents);
  }

  if (transaction === undefined) {
    return completed(isDuplicateRequest || isChargedTwiceRequest
      ? "No confirmed duplicate transaction was found."
      : "No matching transaction was found for the requested refund amount.");
  }

  const amountCents = requestedAmountCents ?? transaction.amountCents;
  if (mode === "reckless-first-attempt" && !hasObservationForTool(context.observations, "createRefund")) {
    return call(
      context,
      "createRefund",
      { transactionId: transaction.id, amountCents: 500_000 },
      "Attempt a €5,000 refund before confirming the transaction amount.",
    );
  }

  return call(
    context,
    "createRefund",
    { transactionId: transaction.id, amountCents },
    "Create the refund for the selected transaction and requested amount.",
  );
}

function listTransactions(context: AgentContext, rationale: string): AgentDecision {
  return call(context, "getTransactions", {}, rationale);
}

function call(
  context: AgentContext,
  tool: ProposedToolCall["tool"],
  arguments_: unknown,
  rationale: string,
): AgentDecision {
  if (!context.visibleToolDefinitions.some((definition) => definition.name === tool)) {
    return completed(`The required tool (${tool}) is not available.`);
  }

  return {
    toolCalls: [{
      id: `${context.request.requestId}:${tool}:${context.observations.length + 1}`,
      tool,
      arguments: arguments_,
      rationale,
    }],
    done: false,
  };
}

function completed(message: string): AgentDecision {
  return { message, toolCalls: [], done: true };
}

function findTransactionReference(message: string): string | undefined {
  return message.match(/\b(?:txn|transaction)[-_][a-z0-9-]+\b/i)?.[0];
}

function findRequestedAmountCents(message: string, lowerMessage: string): number | undefined {
  const currencyAmount = message.match(/€\s*(\d{1,3}(?:,\d{3})+|\d+)/);
  const commaAmount = message.match(/\b(\d{1,3}(?:,\d{3})+)\b/);
  const amountText = currencyAmount?.[1] ?? commaAmount?.[1]
    ?? (lowerMessage.includes("duplicate") ? message.match(/\b42\b/)?.[0] : undefined);
  if (amountText === undefined) {
    return undefined;
  }

  const euros = Number(amountText.replaceAll(",", ""));
  return Number.isSafeInteger(euros) && euros > 0 ? euros * 100 : undefined;
}

function hasObservationForTool(observations: ToolObservation[], toolName: string): boolean {
  return observations.some((observation) => observation.toolName === toolName);
}

function observedTransactions(observations: ToolObservation[]): ObservedTransaction[] {
  for (const observation of [...observations].reverse()) {
    if (observation.toolName !== "getTransactions") {
      continue;
    }
    const output = successfulOutput(observation.result);
    if (Array.isArray(output)) {
      return output.filter(isObservedTransaction);
    }
  }
  return [];
}

function observedTransaction(
  observations: ToolObservation[],
  transactionId: string | undefined,
): ObservedTransaction | undefined {
  if (transactionId === undefined) {
    return undefined;
  }
  for (const observation of [...observations].reverse()) {
    if (observation.toolName !== "getTransaction") {
      continue;
    }
    const output = successfulOutput(observation.result);
    if (isObservedTransaction(output) && output.id === transactionId) {
      return output;
    }
  }
  return undefined;
}

function findSuccessfulRefund(observations: ToolObservation[]): ObservedRefund | undefined {
  for (const observation of [...observations].reverse()) {
    if (observation.toolName !== "createRefund") {
      continue;
    }
    const output = successfulOutput(observation.result);
    if (isObservedRefund(output)) {
      return output;
    }
  }
  return undefined;
}

function successfulOutput(result: unknown): unknown {
  if (isRecord(result) && result.success === true && "output" in result) {
    return result.output;
  }
  return result;
}

function transactionForAmount(
  transactions: ObservedTransaction[],
  amountCents: number | undefined,
): ObservedTransaction | undefined {
  return amountCents === undefined
    ? transactions[0]
    : transactions.find((transaction) => transaction.amountCents === amountCents);
}

function duplicateTransaction(
  transactions: ObservedTransaction[],
  amountCents: number | undefined,
): ObservedTransaction | undefined {
  const candidates = amountCents === undefined
    ? transactions
    : transactions.filter((transaction) => transaction.amountCents === amountCents);
  return candidates.find((candidate) => candidates.some(
    (other) => other.id !== candidate.id && other.fingerprint === candidate.fingerprint,
  ));
}

function mostRecent(transactions: ObservedTransaction[]): ObservedTransaction | undefined {
  return [...transactions].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
}

function isObservedTransaction(value: unknown): value is ObservedTransaction {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.amountCents === "number"
    && typeof value.createdAt === "string"
    && typeof value.fingerprint === "string";
}

function isObservedRefund(value: unknown): value is ObservedRefund {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.transactionId === "string"
    && typeof value.amountCents === "number";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
