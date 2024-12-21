import { parsePython } from './codeparser.js';
import { addToAzure } from './azuretable.js';
import { updateNameManager } from './nameManager.js';

export function initGradioEditor() {
    let currentCode = '';

    function createGradioComponent() {
        const container = document.getElementById('gradioContainer');
        if (!container) return;

        // Save current code if editor exists
        const existingCode = extractGradioCode();
        if (existingCode) {
            currentCode = existingCode;
        }

        // Clear container
        container.innerHTML = '';

        const gradioLite = document.createElement('gradio-lite');
        gradioLite.setAttribute('layout', 'vertical');
        gradioLite.setAttribute('playground', '');

        const requirements = document.createElement('gradio-requirements');
        const requirementsText = document.getElementById('requirementsText');
        requirements.textContent = requirementsText?.value || 'transformers_js_py';

        const defaultCode = currentCode || `# Install requirements:
import micropip
await micropip.install(['pandas', 'matplotlib', 'textdistance==4.6.3'])

# Function code:
import numpy
import textdistance

def greet(name):
    test = textdistance.hamming('text', 'test')
    return "Hello, " + name + str(test) + "!"

# Demo code: This will NOT be used by RUNPY
import gradio as gr
gr.Interface(greet, "textbox", "textbox", examples=[["Bob"], ["Sally"]],
live=True,submit_btn=gr.Button("Submit", visible=False),clear_btn=gr.Button("Clear", visible=False),flagging_mode="never").launch()`;

        gradioLite.appendChild(requirements);
        gradioLite.appendChild(document.createTextNode(defaultCode));

        container.appendChild(gradioLite);
    }

    // Initialize requirements textarea with default values
    document.getElementById('requirementsText').value = 'transformers_js_py';

    // Create Gradio component on init
    createGradioComponent();

    // Add reload button handler
    document.getElementById('reloadButton').addEventListener('click', createGradioComponent);

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