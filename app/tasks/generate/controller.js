import { queueTask } from '../../utils/common.js';
import { textgen } from "../../utils/webllm/webllm.js";

async function textGenerationInference({ prompt, data }) {
    if (data) {
        data = data.flat();
        prompt = `${prompt}  Data to use: ${data}`;
    }
    const webllmResponse = await textgen(prompt);
    return webllmResponse;
}

export async function textGeneration(prompt, data) {
    const args = { prompt, data };
    return await queueTask(args, textGenerationInference);
}