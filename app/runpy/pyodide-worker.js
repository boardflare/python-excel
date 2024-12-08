// Web worker that executes Python code using Pyodide.

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

        // empty cell passes [[null]] as arg
        // skipping args with commas passes null as arg
        // unfilled optional args in LAMBDA passes FALSE, so [[false]] as arg
        // no args passed, arg1 is []

        // Set global args array from arg1 to args
        const args = arg1 ? arg1 : null;
        // Set individual globals from args
        if (args) {
            // Set the args array in Python
            self.pyodide.globals.set('args', args);
            // Run script to create arg1, arg2, globals from args
            self.pyodide.runPython(`
                import pandas as pd
                import numpy as np
                import micropip
                
                for index, value in enumerate(args):
                    # Check if None due to skipped repeating arg
                    if value is None:
                        globals()[f'arg{index + 1}'] = None
                        continue
                    
                    # Convert to pandas DataFrame, handles [[None]]
                    df = pd.DataFrame(value)
                    
                    # If only one element, convert to scalar
                    if df.size == 1:
                        single_value = df.iloc[0, 0]
                        # Check if the single value is None, string, or boolean
                        if isinstance(single_value, (type(None), str, bool)):
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

        // Check if there's a result in Python globals
        const hasGlobalResult = self.pyodide.runPython(`'result' in globals()`);

        if (hasGlobalResult) {
            // Use Python convert_result() for all type checking and conversion
            result = self.pyodide.runPython(`
                def convert_result():
                    result = globals()['result']
                    
                    if result is None:
                        raise ValueError("Your function returned None. If you wanted a blank cell, return an empty string ('') instead.")
                        
                    if isinstance(result, (int, float, str, bool)):
                        return [[result]]
                        
                    if isinstance(result, pd.DataFrame):
                        return result.values.tolist()
                    if isinstance(result, pd.Series):
                        return [[x] for x in result.values.tolist()]
                        
                    if isinstance(result, np.ndarray):
                        if result.ndim == 0:
                            return [[result.item()]]
                        elif result.ndim == 1:
                            return [result.tolist()]
                        else:
                            return np.array(result, dtype=object).tolist()
                            
                    if isinstance(result, (np.integer, np.floating)):
                        return [[result.item()]]
                        
                    if isinstance(result, list):
                        if not result:
                            raise ValueError("Result cannot be an empty list")
                            
                        if not any(isinstance(x, list) for x in result):
                            if not all(isinstance(x, (int, float, str, bool)) for x in result):
                                raise ValueError("All elements must be scalar types (int, float, str, bool)")
                            return [result]
                            
                        if not all(isinstance(row, list) for row in result):
                            raise ValueError("Result must be a valid 2D list")
                            
                        width = len(result[0])
                        if not all(len(row) == width for row in result):
                            raise ValueError("All rows must have the same length")
                            
                        if not all(isinstance(x, (int, float, str, bool)) 
                                  for row in result for x in row):
                            raise ValueError("All elements must be scalar types (int, float, str, bool)")
                            
                        return result
                        
                    raise ValueError("Result must be a scalar or 2D list. Other types including dicts are not supported.")
                    
                convert_result()
            `);
        } else {
            // Handle direct function returns with JS validation
            if (result === undefined) {
                throw new Error("Your function returned None. If you wanted a blank cell, return an empty string ('') instead.");
            }

            const isValidScalar = (value) => ['number', 'string', 'boolean'].includes(typeof value);

            if (isValidScalar(result)) {
                result = [[result]];
            } else if (Array.isArray(result)) {
                if (result.length === 0) {
                    throw new Error("Result must be a scalar of type int, float, str, bool or a 2D list.");
                }

                if (!result.every(Array.isArray)) {
                    if (!result.every(isValidScalar)) {
                        throw new Error("All elements must be valid scalar types: int, float, str, bool.");
                    }
                    result = [result];
                }

                if (result.every(Array.isArray)) {
                    const innerLength = result[0].length;
                    result.forEach(innerArray => {
                        if (innerArray.length !== innerLength) {
                            throw new Error("All rows must have the same length.");
                        }
                        if (!innerArray.every(isValidScalar)) {
                            throw new Error("All elements must be valid scalar types: int, float, str, bool.");
                        }
                    });
                } else {
                    throw new Error("Result must be a valid 2D list.");
                }
            } else {
                throw new Error("Result must be a scalar or 2D list.");
            }
        }

        // Convert to JavaScript array if needed
        if (result.toJs) {
            result = result.toJs({ create_proxies: false });
        }

        self.postMessage({ result, stdout });
    } catch (error) {
        self.postMessage({ error: error.message, stdout });
    }
};