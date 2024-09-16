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

    let stdout = "";
    let stderr = "";

    // Capture stdout and stderr
    self.pyodide.setStdout({
        batched: (msg) => {
            stdout += msg + "\n";
        }
    });

    self.pyodide.setStderr({
        batched: (msg) => {
            stderr += msg + "\n";
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

        self.pyodide.globals.clear();

        // Return the result along with stdout and stderr
        self.postMessage({ result, stdout, stderr });
    } catch (error) {
        // Return the error along with stdout and stderr
        self.postMessage({ error: error.message, stdout, stderr });
    }
};