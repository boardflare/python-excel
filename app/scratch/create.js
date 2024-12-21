import { parsePython } from '../editor/codeparser.js';
import { updateNameManager } from '../editor/nameManager.js';
import { addDemo } from './demo.js';
import { saveFunction, getFunctionNames, getFunctionCode } from '../editor/functions.js';

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

                    // Handle cancel action
                    if (message.action === 'cancel') {
                        dialog.close();
                        return;
                    }

                    // If message contains code and testCases, it's a save operation
                    if (message.code) {
                        await addFunction(message);
                        dialog.close();
                        return;
                    }

                    // Handle other actions
                    switch (message.action) {
                        case 'getFunctionsList':
                            const functions = await getFunctionNames();
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
            saveFunction(parsedCode),
            updateNameManager(parsedCode),
            addDemo(parsedCode),
        ]);

        progress.textContent = `${parsedCode.signature} has been saved!  You can now use it by typing =${parsedCode.name} in a cell.\n\n`;
        progress.style.color = "green";
    } catch (error) {
        progress.textContent = error.message;
        progress.style.color = "red";
        console.error('Error saving function:', error);
    }
}