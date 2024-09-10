import { loadPyodide } from "https://cdn.jsdelivr.net/npm/pyodide@0.26.2/+esm";

let pyodideReadyPromise = (async () => {
    self.pyodide = await loadPyodide();
})();

self.onmessage = async (event) => {
    await pyodideReadyPromise;
    const { code, inputs } = event.data;

    try {
        // Check if inputs is not null and set the inputs as global variables in the Python environment
        if (inputs) {
            inputs.forEach(([key, value]) => {
                self.pyodide.globals.set(key, value);
            });
        }

        // Execute the Python code
        let result = await self.pyodide.runPythonAsync(code);

        // Handle case where result is null or undefined
        if (result === null || result === undefined) {
            result = "Nothing was returned by your code. Make sure your code ends with an expression, variable, or by calling a function that returns a value.";
        } else if (result.toJs) {
            // Convert the result to a native JavaScript object if it has a toJs method
            result = result.toJs();
        }

        // Convert Map to a matrix of key-value pairs if result is a Map
        if (result instanceof Map) {
            result = Array.from(result.entries()).map(([key, value]) => {
                if (typeof value === 'object' && value !== null) {
                    return [key, JSON.stringify(value)];
                }
                return [key, value];
            });
        }

        // Ensure the result is a matrix Excel is expecting
        if (!Array.isArray(result)) {
            result = [[result]];
        } else if (Array.isArray(result) && !Array.isArray(result[0])) {
            result = [result];
        }

        // Return the result
        self.postMessage({ result });
    } catch (error) {
        // Return the error
        self.postMessage({ error: error.message });
    }
};