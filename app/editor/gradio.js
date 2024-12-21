import { parsePython } from './codeparser.js';
import { addToAzure } from './azuretable.js';
import { updateNameManager } from './nameManager.js';

export function initGradioEditor() {
    function extractGradioCode() {
        const codeContent = document.querySelector('.cm-content');
        if (codeContent) {
            const codeLines = Array.from(codeContent.querySelectorAll('.cm-line'))
                .map(line => line.textContent)
                .join('\n');
            return codeLines;
        }
    }

    function insertCode() {
        try {
            const codeContent = document.querySelector('.cm-content');
            if (codeContent) {
                const codeToInsert = extractGradioCode();
                if (!codeToInsert) return;

                // Clear existing lines
                const existingLines = codeContent.querySelectorAll('.cm-line');
                existingLines.forEach(line => line.textContent = '');

                // Insert new code line by line
                const lines = codeToInsert.split('\n');
                lines.forEach((line, index) => {
                    if (index < existingLines.length) {
                        existingLines[index].textContent = line;
                    } else {
                        const newLine = document.createElement('div');
                        newLine.className = 'cm-line';
                        newLine.textContent = line;
                        codeContent.appendChild(newLine);
                    }
                });
            }
        } catch (error) {
            console.error('Failed to insert code:', error);
        }
    }

    async function saveGradioCode() {
        try {
            const code = extractGradioCode();
            if (!code) return;

            const parsedFunction = parsePython(code);
            const saveResult = await addToAzure(parsedFunction);
            if (saveResult) {
                await updateNameManager(parsedFunction);
                document.getElementById('saveNotification').innerHTML =
                    '<div class="alert alert-success">Function saved successfully!</div>';
            } else {
                document.getElementById('saveNotification').innerHTML =
                    '<div class="alert alert-danger">Failed to save function.</div>';
            }
        } catch (error) {
            console.error('Failed to save code:', error);
            document.getElementById('saveNotification').innerHTML =
                '<div class="alert alert-danger">Error: ' + error.message + '</div>';
        }
    }

    document.getElementById('extractButton')?.addEventListener('click', extractGradioCode);
    document.getElementById('insertButton')?.addEventListener('click', insertCode);
    document.getElementById('saveButton')?.addEventListener('click', saveGradioCode);
}