import { queueTask } from '../utils/common.js';
import { runPy } from '../runpy/controller.js';

let progressDiv;

// Initialize progressDiv when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    progressDiv = document.getElementById('progress');
});

async function fimLLM(start, arg1) {
    const response = await fetch('https://codepy.boardflare.workers.dev/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ start, arg1 })
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'Unknown API error');
    }

    return data.message;
}

// Gets initial draft of code
async function codePython({ prompt, arg1 }) {
    if (!prompt) {
        throw new Error('Docstring is required.');
    }

    try {
        const code = await fimLLM(prompt, arg1);
        return [[code]];

    } catch (error) {
        console.error('Error in codePython:', error);
        return [[`Error: ${error.message}`]];
    }
}

export async function codePy(start, arg1) {
    const argsObj = { start, arg1 };
    return await queueTask(argsObj, codePython);
}