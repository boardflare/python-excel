import { CreateWebWorkerMLCEngine, prebuiltAppConfig } from "https://esm.run/@mlc-ai/web-llm";

let engine = null;

async function initializeEngine() {
    try {
        const initProgressCallback = function (initProgress) {
            console.log(initProgress);
            document.getElementById('progress').innerText = initProgress.text;
        };

        const modelId = 'gemma-2-2b-it-q4f16_1-MLC-1k';

        if (!engine) {
            engine = await CreateWebWorkerMLCEngine(
                new Worker(new URL("./webllm-worker.js", import.meta.url), { type: "module" }),
                modelId,
                { initProgressCallback: initProgressCallback }
            );
            document.getElementById('progress').innerText = "Model loaded successfully!";
        }

        return engine;
    } catch (error) {
        console.error("Error initializing engine:", error);
        document.getElementById('progress').innerText = "Error loading model. Please try again.";
    }
}

export async function textgen(prompt, options) {
    if (!engine) {
        const adapter = await navigator.gpu.requestAdapter();
        const supportsF16 = adapter?.features.has('shader-f16');
        if (supportsF16) {
            engine = await initializeEngine();
        } else {
            document.getElementById('progress').innerText = "Your device does not support WebGPU so this function is not available.";
            return;
        }
    }

    const messages = [
        { role: "system", content: "You are a helpful AI assistant." },
        { role: "user", content: prompt },
    ];
    // Chunks is an AsyncGenerator object
    const chunks = await engine.chat.completions.create({
        messages,
        max_tokens: 250,
        temperature: 0,
        stream: true,
        stream_options: { include_usage: true },
    });

    let progress = "";
    for await (const chunk of chunks) {
        progress += chunk.choices[0]?.delta.content || "";
        document.getElementById('progress').innerText = progress;
        console.log(progress);
        if (chunk.usage) {
            console.log(chunk.usage); // only last chunk has usage
        }
    }

    const fullReply = await engine.getMessage();
    console.log(fullReply);
    return fullReply;
}