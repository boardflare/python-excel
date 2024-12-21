import { parsePython } from './codeparser.js';
import { addToAzure } from './azuretable.js';
import { updateNameManager } from './nameManager.js';

async function getRunpyFunctions() {
    try {
        await Office.onReady();
        return await Excel.run(async (context) => {
            const names = context.workbook.names.load("items");
            await context.sync();

            return names.items
                .filter(name => name.formula.includes("RUNPY"))
                .map(name => ({
                    name: name.name,
                    url: name.formula.match(/https:\/\/getcode\.boardflare\.workers\.dev[^"']*/)?.[0] || ''
                }));
        });
    } catch (error) {
        console.error('Failed to get RUNPY functions:', error);
        return [];
    }
}

async function fetchFunctionCode(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch code');
        return await response.text();
    } catch (error) {
        console.error('Failed to fetch function code:', error);
        return null;
    }
}

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

# Function code: arg1, arg2, ... will be inserted by RUNPY
import numpy
import textdistance

def greet(name):
    test = textdistance.hamming('text', 'test')
    return "Hello, " + name + str(test) + "!"

result = greet(arg1)

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

    function insertCode(code) {
        try {
            const codeContent = document.querySelector('.cm-content');
            if (codeContent) {
                // Clear existing lines
                const existingLines = codeContent.querySelectorAll('.cm-line');
                existingLines.forEach(line => line.textContent = '');

                // Insert new code line by line
                const lines = code.split('\n');
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

    // Initialize function dropdown
    async function initFunctionDropdown() {
        const select = document.getElementById('functionSelect');
        const functions = await getRunpyFunctions();

        select.innerHTML = '<option value="">Select a function...</option>' +
            functions.map(f => `<option value="${f.url}">${f.name}</option>`).join('');

        select.addEventListener('change', async (e) => {
            const url = e.target.value;
            if (url) {
                const code = await fetchFunctionCode(url);
                if (code) {
                    insertCode(code);
                }
            }
        });
    }

    // Initialize dropdown after Office.js is ready
    Office.onReady(() => {
        initFunctionDropdown();
    });

    document.getElementById('extractButton')?.addEventListener('click', extractGradioCode);
    document.getElementById('insertButton')?.addEventListener('click', () => insertCode(extractGradioCode()));
    document.getElementById('saveButton')?.addEventListener('click', saveGradioCode);
}