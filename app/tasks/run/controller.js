import { queueTask } from '../../utils/common.js';

// Define valid types globally
const validTypes = ['number', 'string', 'boolean'];

// Initialize the Pyodide worker
let worker = new Worker(new URL('./pyodide-worker.js', import.meta.url));

// Function to send messages to the worker and handle responses
async function messageWorker(worker, message) {
    return new Promise((resolve, reject) => {
        worker.onmessage = (event) => {
            const { result, stdout, stderr, error } = event.data;
            if (error) {
                reject({ error, stdout, stderr });
            } else {
                resolve({ result, stdout, stderr });
            }
        };
        worker.onerror = (error) => {
            reject({ error: error.message });
        };
        worker.postMessage(message);
    });
}

// Function to validate the result matrix
function validateMatrix(result) {
    if (!Array.isArray(result) || !result.every(Array.isArray)) {
        throw new Error("Result is not a matrix.");
    }

    const innerLength = result[0].length;

    result.forEach(innerArray => {
        if (innerArray.length !== innerLength) {
            throw new Error("Inconsistent row lengths in the result matrix.");
        }
        innerArray.forEach(element => {
            if (!validTypes.includes(typeof element)) {
                throw new Error("Result matrix contains invalid element types.");
            }
        });
    });
}

// Function to run Python code using the worker
async function pythonRun({ code, data1, isMatrix }) {
    try {
        const { result, stdout, stderr } = await messageWorker(worker, { code, data1 });
        // Write stdout and stderr to the progress div
        document.getElementById('progress').innerText = `${stdout}\n${stderr}`;
        // Emit gtag event
        window.gtag('event', 'py', { code_length: code.length });

        // Validate result is as expected by Excel
        if (isMatrix) {
            validateMatrix(result);
        } else {
            if (!validTypes.includes(typeof result)) {
                throw new Error("Result is not a valid scalar type.");
            }
        }

        return result;

    } catch ({ error, stdout, stderr }) {
        document.getElementById('progress').innerText = `${stdout}\n${stderr}`;
        // Emit gtag event
        window.gtag('event', 'py_err', { error });
        return isMatrix ? [[`Error: ${error}.`]] : `Error: ${error}.`;
    }
}

// Export the function to be used in `functions.js`
export async function pyarr(code, data1) {
    const args = { code, data1, isMatrix: true };
    return await queueTask(args, pythonRun);
}

export async function py(code, data1) {
    const args = { code, data1, isMatrix: false };
    return await queueTask(args, pythonRun);
}