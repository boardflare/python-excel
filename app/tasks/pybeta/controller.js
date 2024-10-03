import { queueTask } from '../../utils/common.js';

// Define valid types globally
const validTypes = ['number', 'string', 'boolean'];

// Initialize the Pyodide worker
let pyworker = new Worker(new URL('./pyodide-beta-worker.js', import.meta.url));

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

// Function to validate the result matrix
function validateMatrix(result) {
    if (!Array.isArray(result) || !result.every(Array.isArray)) {
        throw new Error("pyout is not a matrix.");
    }

    const innerLength = result[0].length;

    result.forEach(innerArray => {
        if (innerArray.length !== innerLength) {
            throw new Error("pyout is not a matrix because row lengths are not equal.");
        }
        innerArray.forEach(element => {
            if (!validTypes.includes(typeof element)) {
                throw new Error("pyout matrix must only contain elements of type int, float, str or bool.");
            }
        });
    });
}

// Helper function to fetch code from IndexedDB
async function fetchCodeFromIndexedDB(key) {
    return new Promise((resolve, reject) => {

        // Ensure the IndexedDB name is unique to avoid conflicts
        const dbName = 'JupyterLite Storage';
        const request = indexedDB.open(dbName);

        request.onsuccess = (event) => {
            console.log('IndexedDB opened successfully.');
            const db = event.target.result;

            // Log the current version of the database
            console.log('Current IndexedDB version:', db.version);

            const transaction = db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');

            const getRequest = store.get(key);
            getRequest.onsuccess = (event) => {
                if (event.target.result) {
                    console.log('Result from key in IndexedDB:', event.target.result.content);
                    resolve(event.target.result.content);
                } else {
                    console.error('No code found for the given key in IndexedDB.');
                    reject(new Error(`File not found in Jupyter: ${key}`));
                }
            };

            getRequest.onerror = (event) => {
                console.error('Error fetching code from IndexedDB:', event.target.error);
                reject(event.target.error);
            };
        };

        request.onerror = (event) => {
            console.error('Error opening IndexedDB:', event.target.error);
            reject(event.target.error);
        };
    });
}

// Helper function to fetch code from a URL or IndexedDB
async function fetchCode(source) {
    let code;

    if (source.startsWith('https://')) {
        const response = await fetch(source);
        if (!response.ok) {
            throw new Error(`Failed to fetch code from URL: ${response.statusText}`);
        }
        code = await response.text();
        console.log('Code fetched from URL:', code);
    } else if (source.endsWith('.py') || source.endsWith('.ipynb')) {
        const key = source; // Use the source as the key
        code = await fetchCodeFromIndexedDB(key);
        console.log('Code fetched from IndexedDB:', code);
    } else {
        console.log('Using plain code string:', source);
        code = source; // Assume it's a plain code string
    }

    if (source.endsWith('.ipynb')) {
        const cells = code.cells.filter(cell => cell.cell_type === 'code');
        const pyoutCell = cells.find(cell => cell.source.includes('pyout'));
        if (pyoutCell) {
            const pyoutCellSource = pyoutCell.source;
            console.log('Code cell containing "pyout":', pyoutCellSource);
            return pyoutCellSource;
        } else {
            throw new Error('No code cell containing "pyout" found.');
        }
    }

    return code;
}

// Function to run Python code using the worker
async function pythonRun({ code, data1, isMatrix }) {
    try {
        // Fetch code from URL, IndexedDB, or use as plain string
        code = await fetchCode(code);

        const { result, stdout } = await messageWorker(pyworker, { code, data1 });

        // Write stdout to the progress div
        document.getElementById('progress').innerText = stdout;

        // Conditionally emit gtag event
        if (isChromiumOrEdge) {
            window.gtag('event', 'py', { code_length: code.length });
        }

        // Validate result is as expected by Excel
        if (isMatrix) {
            validateMatrix(result);
        } else {
            if (!validTypes.includes(typeof result)) {
                throw new Error("pyout must be int, float, str or bool.");
            }
        }

        return result;

    } catch (error) {
        const errorMessage = error.error || error.message;
        const stdout = error.stdout || '';
        console.error('Error in pythonRun:', errorMessage);
        document.getElementById('progress').innerText = `${stdout}\n${errorMessage}`;

        // Conditionally emit gtag error event
        if (isChromiumOrEdge) {
            window.gtag('event', 'py_err', { error: errorMessage });
        }
        const notice = "Error, see console for details.";
        return isMatrix ? [[notice]] : notice;
    }
}

// Export the function to be used in `functions.js`
export async function pybeta(code, data1) {
    const args = { code, data1, isMatrix: true };
    return await queueTask(args, pythonRun);
}