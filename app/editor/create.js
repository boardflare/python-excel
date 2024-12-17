import { parsePython } from './codeparser.js';
import { updateNameManager } from './nameManager.js';
import { updateFunctionsTable } from './functionsTable.js';
import { updateDemoTable } from './demoTable.js';

const progress = document.getElementById('progress');

export async function createNewFunction() {
    const currentUrl = window.location.href;
    const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/'));
    const dialogUrl = `${baseUrl}/editor/monaco.html`;

    Office.context.ui.displayDialogAsync(dialogUrl,
        { height: 80, width: 80 },
        function (result) {
            if (result.status === Office.AsyncResultStatus.Failed) {
                console.error(`Dialog failed: ${result.error.message}`);
                return;
            }

            const dialog = result.value;
            dialog.addEventHandler(Office.EventType.DialogMessageReceived, async (arg) => {
                try {
                    // Handle empty or invalid messages
                    if (!arg.message) return;

                    // Handle string messages (save function case)
                    if (typeof arg.message === 'string' && !arg.message.startsWith('{')) {
                        if (arg.message) {
                            await addFunction(arg.message);
                        }
                        dialog.close();
                        return;
                    }

                    // Handle JSON messages
                    const message = JSON.parse(arg.message);
                    switch (message.action) {
                        case 'getFunctionsList':
                            const functions = await getFunctionsList();
                            console.log('Sending functions list:', functions);
                            try {
                                dialog.messageChild(JSON.stringify({
                                    type: 'functionsList',
                                    functions: functions
                                }));
                            } catch (e) {
                                console.error('Error sending message to dialog:', e);
                            }
                            break;

                        case 'getFunctionCode':
                            const code = await getFunctionCode(message.name);
                            try {
                                dialog.messageChild(JSON.stringify({
                                    type: 'functionCode',
                                    code: code
                                }));
                            } catch (e) {
                                console.error('Error sending message to dialog:', e);
                            }
                            break;
                    }
                } catch (error) {
                    console.error('Dialog message handling error:', error);
                    progress.textContent = "Error handling dialog message";
                    progress.style.color = "red";
                    clearProgress();
                }
            });
        }
    );
}

async function addFunction(code) {
    try {
        const parsedCode = parsePython(code);
        console.log('parsedCode:', parsedCode);

        if (parsedCode.error) {
            progress.textContent = parsedCode.error;
            progress.style.color = "orange";
            clearProgress();
            return;
        }

        // Update functions worksheet and demo worksheet
        await Promise.all([
            updateFunctionsTable(parsedCode),
            //updateDemoTable(parsedCode),
            updateNameManager(parsedCode)
        ]);

        progress.textContent = "Function saved successfully!";
        progress.style.color = "green";
        clearProgress();
    } catch (error) {
        progress.textContent = error.message;
        progress.style.color = "red";
        console.error('Error saving function:', error);
        clearProgress();
    }
}

async function getFunctionsList() {
    try {
        const context = new Excel.RequestContext();

        // Check if table exists first
        const tables = context.workbook.tables;
        tables.load("items");
        await context.sync();

        if (!tables.items.some(table => table.name === 'Boardflare_Functions')) {
            return [];
        }

        const table = tables.getItem('Boardflare_Functions');
        const nameColumn = table.columns.getItem('Name');
        const range = nameColumn.getDataBodyRange();
        range.load(['values', 'text']);

        await context.sync();

        // Ensure we have values before mapping
        if (!range.values || range.values.length === 0) {
            return [];
        }

        // Map the values to the expected format
        return range.values.map(row => ({
            name: row[0] || ''
        })).filter(item => item.name); // Filter out empty names

    } catch (error) {
        console.error('Error getting functions list:', error);
        return [];
    }
}

async function getFunctionCode(functionName) {
    // Retrieve the code of the specified function
    const context = new Excel.RequestContext();
    const table = context.workbook.tables.getItem('Boardflare_Functions');
    const nameColumn = table.columns.getItem('Name');
    const codeColumn = table.columns.getItem('Code');
    const nameRange = nameColumn.getDataBodyRange().load('values');
    const codeRange = codeColumn.getDataBodyRange().load('values');
    await context.sync();
    const names = nameRange.values.map(row => row[0]);
    const codes = codeRange.values.map(row => row[0]);
    const index = names.indexOf(functionName);
    return index !== -1 ? codes[index] : '';
}

function clearProgress() {
    setTimeout(() => {
        progress.textContent = '';
    }, 3000);

    setTimeout(() => {
        progress.textContent = '';
    }, 6000);
}