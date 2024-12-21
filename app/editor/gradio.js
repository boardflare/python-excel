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
        const jsonUrl = url.replace('return=code', 'return=json');
        const response = await fetch(jsonUrl);
        if (!response.ok) throw new Error('Failed to fetch code');
        const data = await response.json();
        // Remove result line and combine function code with demo code if available
        console.log('Fetched function:', data);
        const codeWithoutResult = data.Code.replace(/\n\s*result\s*=\s*.*$/m, '');
        return codeWithoutResult + (data.Demo ? '\n\n# Demo code: This will NOT be used by RUNPY\n' + data.Demo : '');
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

        const defaultCode = currentCode || `# Install requirements:
import micropip
await micropip.install(['pandas', 'matplotlib', 'textdistance==4.6.3'])

# Function code: arg1, arg2, ... will be inserted by RUNPY
import numpy
import textdistance

def greet(name):
    test = textdistance.hamming('text', 'test')
    return "Hello, " + name + str(test) + "!"

# Demo code: This will NOT be used by RUNPY
import gradio as gr
gr.Interface(greet, "textbox", "textbox", examples=[["Bob"], ["Sally"]],
live=True,submit_btn=gr.Button("Submit", visible=False),clear_btn=gr.Button("Clear", visible=False),flagging_mode="never").launch()`;

        gradioLite.appendChild(document.createTextNode(defaultCode));
        container.appendChild(gradioLite);
    }

    // Create Gradio component on init
    createGradioComponent();

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

            // Save will automatically split the code and demo sections
            const parsedFunction = parsePython(code);
            const saveResult = await addToAzure(parsedFunction);
            if (saveResult) {
                await updateNameManager(parsedFunction);
                await initFunctionDropdown(); // Refresh dropdown after successful save
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

        // Keep existing change event listener if already set
        if (!select.hasChangeListener) {
            select.addEventListener('change', async (e) => {
                const url = e.target.value;
                if (url) {
                    const code = await fetchFunctionCode(url);
                    if (code) {
                        insertCode(code);
                    }
                }
            });
            select.hasChangeListener = true;
        }
    }

    // Initialize dropdown after Office.js is ready
    Office.onReady(() => {
        initFunctionDropdown();
    });

    // Only keep the save button handler that exists in HTML
    document.getElementById('saveButton')?.addEventListener('click', saveGradioCode);
}