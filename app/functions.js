import { py, pyarr } from "./tasks/pyrun/controller.js";
import { runPy } from "./functions/runpy/controller.js";
import { jl } from "./functions/jl.js";

CustomFunctions.associate("PY", py);
CustomFunctions.associate("PY.ARR", pyarr);
CustomFunctions.associate("PY.BETA", runPy);
CustomFunctions.associate("JL", jl);