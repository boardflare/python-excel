import { parsePython } from './codeparser.js';
import { updateNameManager } from './nameManager.js';
import { updateFunctionsTable } from './functionsTable.js';
import { addDemo } from './demo.js';

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
                    if (!arg.message) return;

                    // Parse the message first
                    const message = JSON.parse(arg.message);

                    // If message contains code and testCases, it's a save operation
                    if (message.code) {
                        await addFunction(message);
                        dialog.close();
                        return;
                    }

                    // Handle other actions
                    switch (message.action) {
                        case 'getFunctionsList':
                            const functions = await getFunctionsList();
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
                                    ...JSON.parse(code)
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
                }
            });
        }
    );
}

async function addFunction(message) {
    try {
        const parsedCode = parsePython(message.code);
        console.log('parsedCode:', parsedCode);
        parsedCode.testCases = message.testCases;

        if (parsedCode.error) {
            progress.textContent = parsedCode.error;
            progress.style.color = "orange";
            return;
        }

        await Promise.all([
            updateFunctionsTable(parsedCode),
            updateNameManager(parsedCode),
            addDemo(parsedCode)
        ]);

        progress.textContent = `${parsedCode.signature} has been saved!  You can now use it by typing =${parsedCode.name} in a cell.  Disregard the error messages below, they are due to a bug in Excel and only appear when creating or updated the code.\n\n\n`;
        progress.style.color = "green";
    } catch (error) {
        progress.textContent = error.message;
        progress.style.color = "red";
        console.error('Error saving function:', error);
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
    const context = new Excel.RequestContext();
    const table = context.workbook.tables.getItem('Boardflare_Functions');
    const nameColumn = table.columns.getItem('Name');
    const codeColumn = table.columns.getItem('Code');
    const testCasesColumn = table.columns.getItem('TestCases');

    const nameRange = nameColumn.getDataBodyRange().load('values');
    const codeRange = codeColumn.getDataBodyRange().load('values');
    const testCasesRange = testCasesColumn.getDataBodyRange().load('values');

    await context.sync();

    const names = nameRange.values.map(row => row[0]);
    const codes = codeRange.values.map(row => row[0]);
    const testCases = testCasesRange.values.map(row => row[0]);

    const index = names.indexOf(functionName);
    return index !== -1 ? JSON.stringify({
        code: codes[index],
        testCases: testCases[index]
    }) : '';
}