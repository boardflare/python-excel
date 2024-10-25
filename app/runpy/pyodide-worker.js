importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js");

async function loadPyodideAndPackages() {
    self.pyodide = await loadPyodide();
    await self.pyodide.loadPackage(["micropip", "pandas"]);
    self.micropip = pyodide.pyimport("micropip");
}

let pyodideReadyPromise = loadPyodideAndPackages();

self.onmessage = async (event) => {
    await pyodideReadyPromise;
    const { code, arg1 } = event.data;

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

        // Set global args array from arg1 to args
        const args = arg1 ? arg1 : null;
        // Set individual globals from args
        if (args) {
            // Set the global args variable in Python
            self.pyodide.globals.set('args', args);
            // Run Python script to create arg1, arg2, ...
            self.pyodide.runPython(`
                import pandas as pd
            
                for index, value in enumerate(args):
                    # Convert to pandas DataFrame
                    df = pd.DataFrame(value)
                    # Check if the DataFrame has only one element
                    if df.size == 1:
                        single_value = df.iloc[0, 0]
                        # Check if the single value is a string or boolean
                        if isinstance(single_value, (str, bool)):
                            value = single_value
                        else:
                            value = single_value.item()
                    else:
                        value = df
                    globals()[f'arg{index + 1}'] = value
            `);
        }

        // Execute the Python code
        let result = await self.pyodide.runPythonAsync(code);

        if (result === undefined) {
            throw new Error("Result is undefined");
        }

        // if result is a list, convert it to a JavaScript array
        if (result.toJs) {
            result = result.toJs({ create_proxies: false });
        }

        // Define the isValidScalar function
        const isValidScalar = (value) => ['number', 'string', 'boolean'].includes(typeof value);

        // Check the type of the result
        if (isValidScalar(result)) {
            // If result is a scalar, convert it to a 2D matrix
            result = [[result]];
        } else if (Array.isArray(result)) {
            // Check if result is an empty array
            if (result.length === 0) {
                throw new Error("Result must be a scalar of type int, float, str, bool or a 2D list.  All other types including Numpy arrays, Pandas DataFrames, dicts, etc. are not supported.");
            }

            // If result is a simple array, convert it to a 2D matrix
            if (!result.every(Array.isArray)) {
                if (!result.every(isValidScalar)) {
                    throw new Error("All elements of the result list must be valid scalar types: int, float, str, bool.");
                }
                result = [result];
            }

            // Check if result is a nested list (2D array)
            if (result.every(Array.isArray)) {
                const innerLength = result[0].length;

                result.forEach(innerArray => {
                    if (innerArray.length !== innerLength) {
                        throw new Error("Nested row lengths are not equal.");
                    }
                    if (!innerArray.every(isValidScalar)) {
                        throw new Error("All elements of the result list must be valid scalar types: int, float, str, bool.");
                    }
                });
            } else {
                throw new Error("Result is not a valid 2D list.");
            }
        } else {
            throw new Error("Result must be a scalar of type int, float, str, bool or a 2D list.  All other types including Numpy arrays, Pandas DataFrames, dicts, etc. are not supported.");
        }

        // Result is now either a valid JS scalar or a JS 2D array

        // Return the result along with stdout
        self.postMessage({ result, stdout });
    } catch (error) {
        // Return the error along with stdout
        self.postMessage({ error: error.message, stdout });
    }
};