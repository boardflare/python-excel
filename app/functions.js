import { py, pyarr } from "./tasks/pyrun/controller.js";
import { pybeta } from "./tasks/pybeta/controller.js";

CustomFunctions.associate("PY", py);
CustomFunctions.associate("PY.ARR", pyarr);
CustomFunctions.associate("PY.BETA", pybeta);