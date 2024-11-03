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
        // Loads code using path only
    } else if (source.endsWith('.ipynb') || source.endsWith('.py')) {
        try {
            const response = await fetch(`https://functions.boardflare.com/notebooks/${source}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch code from path. Status: ${response.status}`);
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
            throw error; // Simply rethrow the error instead of trying jupyterlite
        }
    } else {
        // Use code string as is
        code = source;
    }

    return code;
}