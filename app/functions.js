import { py, pyarr } from "./tasks/pyrun/controller.js";
import { runPy } from "./runpy/controller.js";

CustomFunctions.associate("PY", py);
CustomFunctions.associate("PY.ARR", pyarr);
CustomFunctions.associate("PY.BETA", runPy);