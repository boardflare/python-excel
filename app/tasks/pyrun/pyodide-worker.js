importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js");

async function loadPyodideAndPackages() {
    self.pyodide = await loadPyodide();
    await self.pyodide.loadPackage("micropip");
    self.micropip = pyodide.pyimport("micropip");
}

let pyodideReadyPromise = loadPyodideAndPackages();

self.onmessage = async (event) => {
    await pyodideReadyPromise;
    const { code, data1 } = event.data;

    // Clear the global state at the beginning
    self.pyodide.globals.clear();

    let stdout = "";

    // Reinitialize stdout and stderr handlers
    self.pyodide.setStdout({
        batched: (msg) => {
            stdout += msg + "\n";
        }
    });

    self.pyodide.setStderr({
        batched: (msg) => {
            stdout += "STDERR: " + msg + "\n";
        }
    });

    try {
        // Find imports in the Python code
        const imports = self.pyodide.pyodide_py.code.find_imports(code).toJs();

        // Load the imports that are not in sys.modules
        if (imports && imports.length > 0) {
            const sys = self.pyodide.pyimport("sys");
            const missingImports = imports.filter(pkg => !(pkg in sys.modules.toJs()));
            if (missingImports.length > 0) {
                await self.micropip.install(missingImports);
            }
        }

        // Set individual globals from data1
        if (Array.isArray(data1)) {
            data1.forEach((value, index) => {
                self.pyodide.globals.set(`data${index + 1}`, value);
                if (typeof value === 'object') {
                    self.pyodide.runPython(`data${index + 1} = data${index + 1}.to_py()`);
                }
            });
        }

        // Execute the Python code
        await self.pyodide.runPythonAsync(code);

        // Check if pyout is defined
        const pyoutDefined = self.pyodide.runPython('globals().get("pyout") is not None');

        if (!pyoutDefined) {
            throw new Error("Set global variable 'pyout' to the value you want to output.");
        }

        const pyoutType = self.pyodide.runPython('type(pyout).__name__');

        if (!['list', 'int', 'float', 'str', 'bool'].includes(pyoutType)) {
            throw new Error(`pyout must be a list, int, float, str or bool. Found type: ${pyoutType}`);
        }

        const pyout = self.pyodide.globals.get('pyout');
        let result = pyout;
        // if pyout is a list, convert it to a JavaScript array
        if (pyout.toJs) {
            result = pyout.toJs({ create_proxies: false });
        }

        // Return the result along with stdout
        self.postMessage({ result, stdout });
    } catch (error) {
        // Return the error along with stdout
        self.postMessage({ error: error.message, stdout });
    }
};