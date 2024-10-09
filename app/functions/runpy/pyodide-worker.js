// Beta worker code

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

        // Set global data array from data1 to data
        const data = data1 ? data1 : null;
        // Set individual globals from data
        if (data) {
            // Set the global data variable in Python
            self.pyodide.globals.set('data', data);
            // Set each element of data as a global variables data1, data2, ...
            data.forEach((value, index) => {
                // Use flat() to flatten any nested arrays
                value = value.flat(); // Flatten to vector
                // Check if the flattened array has a single element
                if (value.length === 1) {
                    value = value[0]; // Flatten to scalar
                }
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
            throw new Error("pyout is undefined.");
        }

        const pyoutType = self.pyodide.runPython('type(pyout).__name__');
        const allowedTypes = ['list', 'int', 'float', 'str', 'bool'];
        if (!allowedTypes.includes(pyoutType)) {
            throw new Error(`pyout must be a list, int, float, str or bool. Found type: ${pyoutType}`);
        }

        const pyout = self.pyodide.globals.get('pyout');
        let result = pyout;

        // if pyout is a list, convert it to a JavaScript array
        if (pyout.toJs) {
            result = pyout.toJs({ create_proxies: false });
        }

        // If result is a scalar, convert it to a 2D matrix
        if (!Array.isArray(result)) {
            result = [[result]];
        }

        // If result is a simple array, convert it to a 2D matrix
        if (!result.every(Array.isArray)) {
            result = [result];
        }

        // Check if result is a nested list (2D array)
        if (result.every(Array.isArray)) {
            const innerLength = result[0].length;

            result.forEach(innerArray => {
                if (innerArray.length !== innerLength) {
                    throw new Error("pyout nested row lengths are not equal.");
                }
            });
        }

        // Define valid types globally
        const validTypes = ['number', 'string', 'boolean'];

        // Verify that all elements in result are of valid types
        result.flat().forEach(element => {
            if (!validTypes.includes(typeof element)) {
                throw new Error("pyout must only contain elements of type int, float, str or bool."); // these convert to validTypes
            }
        });


        // Return the result along with stdout
        self.postMessage({ result, stdout });
    } catch (error) {
        // Return the error along with stdout
        self.postMessage({ error: error.message, stdout });
    }
};