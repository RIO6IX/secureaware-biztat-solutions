// Entry point. Each feature module registers its own routes and menu entries.
import { boot } from "./js/core/shell.js";
import training from "./js/training/index.js";

boot([training]);
