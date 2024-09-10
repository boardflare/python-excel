import { queueTask } from '../../utils/common.js';

// Initialize the Pyodide worker
let worker = new Worker(new URL('./pyodide-worker.js', import.meta.url), { type: 'module' });

// Function to send messages to the worker and handle responses
async function messageWorker(worker, message) {
    return new Promise((resolve, reject) => {
        worker.onmessage = (event) => {
            if (event.data.error) {
                reject(event.data.error);
            } else {
                resolve(event.data.result);
            }
        };
        worker.onerror = (error) => {
            reject(error.message);
        };
        worker.postMessage(message);
    });
}

// Function to run Python code using the worker
async function pythonRun({ code, inputs }) {
    try {
        return await messageWorker(worker, { code, inputs });
    } catch (error) {
        return [[`Error: ${error}.`]];
    }
}

// Export the `py` function to be used in `functions.js`
export async function py(code, inputs) {
    const args = { code, inputs };
    return await queueTask(args, pythonRun);
}