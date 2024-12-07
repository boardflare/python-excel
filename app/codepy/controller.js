import { queueTask } from '../utils/common.js';

let pyworker = new Worker(new URL('./pyodide-worker.js', import.meta.url));
let progressDiv;

// Initialize progressDiv when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    progressDiv = document.getElementById('progress');
});

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

async function callWorker(description, arg1) {
    const response = await fetch('https://codepy.boardflare.workers.dev/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description, arg1 })
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'Unknown API error');
    }

    return data.message;
}

// Gets initial draft of code
async function codePython({ description, arg1 }) {
    if (!description) {
        throw new Error('Description is required.');
    }

    try {
        const code = await callWorker(description, arg1);
        return [[code]];

    } catch (error) {
        console.error('Error in codePython:', error);
        return [[`Error: ${error.message}`]];
    }
}

export async function codePy(description, arg1) {
    const argsObj = { description, arg1 };
    return await queueTask(argsObj, codePython);
}