import { defineEval } from "eve/evals";
import { includes } from "eve/evals/expect";

export default defineEval({
  description: "A known transaction is fully refunded, audited, and verified.",
  timeoutMs: 30000,
  async test(t) {
    await t.send("Please refund transaction txn-1 in full. [case: refund-happy-path]");

    t.succeeded();
    t.calledTool("get-transaction");
    t.calledTool("create-refund");
    t.calledTool("write-audit-record");
    t.calledTool("get-refund");
    t.check(t.reply ?? "", includes("REFUND_PERSISTED"));
  },
});
