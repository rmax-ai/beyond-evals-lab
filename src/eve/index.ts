import { EveSessionStore } from "./session-store.js";

/** Process-wide store shared by all Eve tool wrappers. */
export const eveSessionStore = new EveSessionStore();
