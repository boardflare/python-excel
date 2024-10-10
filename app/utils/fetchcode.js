// Helper function to fetch code from IndexedDB
async function fetchJupyterlite({ path }) {
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

// Helper function to fetch code from a URL
export async function fetchCode(source) {
    let code;

    if (source.startsWith('https://')) {
        const response = await fetch(source);
        if (!response.ok) {
            throw new Error(`Failed to fetch code from URL: ${response.statusText}`);
        }
        code = await response.text();
        console.log('Code fetched from URL:', code);
    } else if (source.endsWith('.ipynb') || source.endsWith('.py')) {
        try {
            code = await fetchJupyterlite({ path: source });
        } catch (error) {
            console.warn('Failed to fetch from IndexedDB, trying local path:', error);
            const response = await fetch(`./notebooks/${source}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch code from local path: ${response.statusText}`);
            }
            code = await response.text();
            console.log('Code fetched from local path:', code);
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
    } else {
        console.log('Using plain code string:', source);
        code = source; // Assume it's a plain code string
    }

    return code;
}