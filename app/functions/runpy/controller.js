import { queueTask } from '../../utils/common.js';

// Initialize the Pyodide worker
let pyworker = new Worker(new URL('./pyodide-worker.js', import.meta.url));

// Function to send messages to the worker and handle responses
async function messageWorker(worker, message) {
    return new Promise((resolve, reject) => {
        worker.onmessage = (event) => {
            const { result, stdout, error } = event.data;
            if (error) {
                console.error('Worker error:', error);
                reject({ error, stdout });
            } else {
                console.log('Worker result:', result);
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

// Helper function to fetch code from a URL
async function fetchCode(source) {
    let code;

    if (source.startsWith('https://')) {
        const response = await fetch(source);
        if (!response.ok) {
            throw new Error(`Failed to fetch code from URL: ${response.statusText}`);
        }
        code = await response.text();
        console.log('Code fetched from URL:', code);
    } else {
        console.log('Using plain code string:', source);
        code = source; // Assume it's a plain code string
    }

    if (source.endsWith('.ipynb')) {
        code = JSON.parse(code);
        const cells = code.cells.filter(cell => cell.cell_type === 'code');
        const pyoutCell = cells.find(cell => cell.source.join('').includes('pyout'));
        if (pyoutCell) {
            const pyoutCellSource = pyoutCell.source.join('');
            console.log('Code cell containing "pyout":', pyoutCellSource);
            return pyoutCellSource;
        } else {
            throw new Error('No code cell containing "pyout" found.');
        }
    }

    return code;
}

// Function to run Python code using the Pyodide worker
async function runPython({ code, data1 }) {
    try {
        // Fetch code from URL, or use as plain string
        code = await fetchCode(code);

        const { result, stdout } = await messageWorker(pyworker, { code, data1 });

        // Write stdout to the progress div
        document.getElementById('progress').innerText = stdout;

        // Conditionally emit gtag event
        if (isChromiumOrEdge) {
            window.gtag('event', 'py', { code_length: code.length });
        }

        return result;

    } catch (error) {
        const errorMessage = error.error || error.message;
        const stdout = error.stdout || '';
        console.error('Error in runPython:', errorMessage);
        document.getElementById('progress').innerText = `${stdout}\n${errorMessage}`;

        // Conditionally emit gtag error event
        if (isChromiumOrEdge) {
            window.gtag('event', 'py_err', { error: errorMessage });
        }
        const notice = "Error, see console for details.";
        return [[notice]];
    }
}

// Export the function to be used in `functions.js`
export async function runPy(code, data1) {
    const args = { code, data1 };
    return await queueTask(args, runPython);
}