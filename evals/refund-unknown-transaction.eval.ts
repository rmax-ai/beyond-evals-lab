import { defineEval } from "eve/evals";
import { includes } from "eve/evals/expect";

export default defineEval({
  description: "An unknown transaction is reported without fabricating a refund.",
  timeoutMs: 30000,
  async test(t) {
    await t.send(
      "Please refund transaction txn-999 in full. [case: refund-unknown-transaction]",
    );

    t.succeeded();
    t.calledTool("get-transaction");
    t.check(t.reply ?? "", includes("NOT_FOUND"));
    t.notCalledTool("create-refund");
  },
});
