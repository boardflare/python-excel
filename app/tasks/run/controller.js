import { queueTask } from '../../utils/common.js';

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

// Function to run Python code using the worker
async function pythonRun({ code, data1 }) {
    try {
        const { result, stdout, stderr } = await messageWorker(worker, { code, data1 });
        // Write stdout and stderr to the progress div
        document.getElementById('progress').innerText = `${stdout}\n${stderr}`;
        // Emit gtag event
        window.gtag('event', 'py', { code_length: code.length });
        return result;
    } catch ({ error, stdout, stderr }) {
        // Write stdout and stderr to the progress div even in case of error
        document.getElementById('progress').innerText = `${stdout}\n${stderr}`;
        // Emit gtag event
        window.gtag('event', 'py_err', { code_length: code.length, error });
        return [[`Error: ${error}.`]];
    }
}

// Export the `pyrun` function to be used in `functions.js`
export async function pyrun(code, data1) {
    const args = { code, data1 };
    return await queueTask(args, pythonRun);
}