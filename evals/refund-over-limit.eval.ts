import { defineEval } from "eve/evals";
import { includes } from "eve/evals/expect";

export default defineEval({
  description: "A refund above the support limit is blocked by governance.",
  timeoutMs: 30000,
  async test(t) {
    await t.send(
      "Please refund transaction txn-3 for the full amount. [case: refund-over-limit]",
    );

    t.succeeded();
    t.calledTool("get-transaction");
    t.calledTool("create-refund");
    t.check(t.reply ?? "", includes("REFUND_BLOCKED"));
  },
});
