async function fetchJupyterlite({ path }) {
    try {
        const databases = await indexedDB.databases();
        const dbName = 'JupyterLite Storage';

        console.log('Databases in IndexedDB:', databases);
        const dbExists = databases.some(db => db.name === dbName);
        if (!dbExists) {
            throw new Error(`Database "${dbName}" does not exist in IndexedDB.`);
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName);

            request.onsuccess = (event) => {

                const db = event.target.result;

                if (!db.objectStoreNames.contains('files')) {
                    console.error('Object store "files" does not exist in IndexedDB.');
                    reject(new Error('Object store "files" does not exist in IndexedDB.'));
                    return;
                }

                const transaction = db.transaction(['files'], 'readonly');
                const store = transaction.objectStore('files');

                const getRequest = store.get(path);
                getRequest.onsuccess = (event) => {
                    if (event.target.result) {
                        console.log('Result from key in IndexedDB:', event.target.result.content);
                        let content = event.target.result.content;
                        if (path.endsWith('.ipynb')) {
                            const cells = content.cells.filter(cell => cell.cell_type === 'code');
                            const functionCell = cells.find(cell => cell?.metadata?.tags?.includes('function'));
                            if (functionCell) {
                                // Jupyterlite stores source as a single string, not an array of strings
                                const functionCellSource = functionCell.source;
                                console.log('Code cell containing "function" tag:', functionCellSource);
                                resolve(functionCellSource);
                                return;
                            } else {
                                reject(new Error('No code cell containing "function" tag found.'));
                                return;
                            }
                        }
                        resolve(content);
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
    } catch (error) {
        console.error('Error listing databases:', error);
        throw error;
    }
}

export async function fetchCode(source) {
    let code;
    if (source.startsWith('https://')) {
        try {
            const response = await fetch(source);
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`URL does not exist:\n ${source}\n Status: ${response.status} ${response.statusText}`);
                } else if (response.status === 401) {
                    throw new Error(`URL requires authorization:\n ${source}\n Status: ${response.status} ${response.statusText}`);
                } else {
                    throw new Error(`Error fetching code from:\n ${source}\n Status: ${response.status}`);
                }
            }
            code = await response.text();
            if (source.endsWith('.ipynb')) {
                code = JSON.parse(code);
                const cells = code.cells.filter(cell => cell.cell_type === 'code');
                const functionCell = cells.find(cell => cell.metadata?.tags?.includes('function'));
                if (functionCell) {
                    // Regular Jupyter notebooks store source as an array of strings
                    const functionCellSource = functionCell.source.join('');
                    return functionCellSource;
                } else {
                    throw new Error('No code cell containing "function" tag found.');
                }
            }
        } catch (error) {
            if (error instanceof TypeError) {
                throw new Error(`Error fetching code from URL:\n ${source}\n This might be due to missing CORS headers.\n Original error: ${error.message}`);
            } else {
                throw new Error(`Error fetching code from URL:\n ${source}\n Error: ${error.message}`);
            }
        }
        // Loads code using path only from prod or jupyterlite
    } else if (source.endsWith('.ipynb') || source.endsWith('.py')) {
        try {
            const response = await fetch(`https://addins.boardflare.com/functions/prod/notebooks/${source}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch code from local path: ${response.statusText}`);
            }
            code = await response.text();
            if (source.endsWith('.ipynb')) {
                code = JSON.parse(code);
                const cells = code.cells.filter(cell => cell.cell_type === 'code');
                const functionCell = cells.find(cell => cell.metadata?.tags?.includes('function'));
                if (functionCell) {
                    // Regular Jupyter notebooks store source as an array of strings
                    const functionCellSource = functionCell.source.join('');
                    return functionCellSource;
                } else {
                    throw new Error('No code cell containing "function" tag found.');
                }
            }
        } catch (error) {
            try {
                code = await fetchJupyterlite({ path: source });
            } catch (fetchJupyterliteError) {
                throw fetchJupyterliteError;
            }
        }
    } else {
        // Use code string as is
        code = source;
    }

    return code;
}