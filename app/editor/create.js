import { parsePython } from './codeparser.js';
import { updateNameManager } from './nameManager.js';
import { updateFunctionSheet } from './functionSheet.js';

const progress = document.getElementById('progress');

export async function createNewFunction() {
    // Get current URL and replace the last part with editor/monaco.html
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
            dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
                if (arg.message) {
                    addFunction(arg.message);
                    dialog.close();
                }
            });
        }
    );
}

// Add function to worksheet and name manager
async function addFunction(code) {
    try {
        const parsedCode = parsePython(code);
        console.log('parsedCode:', parsedCode);

        if (parsedCode.error) {
            progress.textContent = parsedCode.error;
            progress.style.color = "orange";
            return;
        }

        // Update name manager
        await updateNameManager(parsedCode);

        // Update demo worksheet
        await updateFunctionSheet(parsedCode);

        progress.textContent = "Function saved successfully!";
        progress.style.color = "green";
    } catch (error) {
        progress.textContent = error.message;
        progress.style.color = "red";
        console.error('Error saving function:', error);
    }
}