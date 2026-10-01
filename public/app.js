// Entry point. Each feature module registers its own routes and menu entries.
import { boot } from "./js/core/shell.js";
import compliance from "./js/compliance/index.js";
import policy from "./js/policy/index.js";
import training from "./js/training/index.js";

boot([compliance, policy, training]);
