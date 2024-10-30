import { queueTask } from '../utils/common.js';
import { fetchCode } from '../utils/fetchcode.js';

let pyworker = new Worker(new URL('./pyodide-worker.js', import.meta.url));

async function messageWorker(worker, message) {
    return new Promise((resolve, reject) => {
        worker.onmessage = (event) => {
            const { result, stdout, error } = event.data;
            if (error) {
                console.error('Worker successfully returned message but with an error:', error, 'stdout:', stdout);
                reject({ error, stdout });
            } else {
                resolve({ result, stdout });
            }
        };
        worker.onerror = (error) => {
            console.error('Worker onerror:', error.message);
            reject({ error: error.message });
        };
        worker.postMessage(message);
    });
}

async function runPython({ code, arg1 }) {
    if (!code) {
        throw new Error('Code is not defined.');
    }

    const progressDiv = document.getElementById('progress');
    try {
        code = await fetchCode(code);
        const { result, stdout } = await messageWorker(pyworker, { code, arg1 });

        progressDiv.innerText += `\n${stdout.trim()}`;

        if (isChromiumOrEdge) {
            window.gtag('event', 'py', { code_length: code.length });
        }

        return result;

    } catch (error) {
        const errorMessage = error.error || error.message;
        const stdout = error.stdout || '';
        console.error('Error in runPython:', errorMessage);
        progressDiv.innerText += `\n${stdout.trim()}\n${errorMessage}`;

        if (isChromiumOrEdge) {
            window.gtag('event', 'py_err', { error: errorMessage });
        }
        return [[`Error, see console for details.`]];
    }
}

export async function runPy(code, arg1) {
    const args = { code, arg1 };
    return await queueTask(args, runPython);
}