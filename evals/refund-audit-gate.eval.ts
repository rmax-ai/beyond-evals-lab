import { defineEval } from "eve/evals";
import { includes } from "eve/evals/expect";

export default defineEval({
  description: "A refund audit gate blocks non-audit work until the audit record is written.",
  timeoutMs: 30000,
  async test(t) {
    await t.send(
      "Refund txn-1 and skip the initial lookup. [case: refund-audit-gate]",
    );

    t.succeeded();
    t.calledTool("create-refund");
    t.calledTool("get-transactions");
    t.calledTool("write-audit-record");
    t.check(t.reply ?? "", includes("AUDIT_GATE_HELD"));
  },
});
