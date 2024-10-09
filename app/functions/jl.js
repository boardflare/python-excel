import { queueTask } from '../../utils/common.js';

// Helper function to fetch code from IndexedDB
async function getJupyterlite({ path }) {
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

            const getRequest = store.get(path);
            getRequest.onsuccess = (event) => {
                if (event.target.result) {
                    console.log('Result from key in IndexedDB:', event.target.result.content);
                    resolve(event.target.result.content);
                } else {
                    console.error('No code found for the given key in IndexedDB.');
                    reject(new Error(`File not found in Jupyter: ${path}`));
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

// Export the function to be used in `functions.js`
export async function jl(path) {
    const args = { path };
    return await queueTask(args, getJupyterlite);
}