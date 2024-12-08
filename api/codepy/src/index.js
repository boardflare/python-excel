/**
 * Welcome to Cloudflare Workers! This is your first worker.
 * env.DB is a D1 SQLite database that will persist across requests.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const headers = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
	async fetch(request, env, ctx) {
		if (request.method === 'OPTIONS') {
			return Response.json(null, { headers });
		}

		try {
			const { start, arg1 } = await request.json();

			// Extract function name and args from docstring
			const match = start.match(/(\w+)\(([\w\s,]+)\)/);

			if (!match) {
				throw new Error("Could not find function definition.");
			}

			const fname = match[1];  // Gets the function name
			const argNames = match[2].split(',').map(arg => arg.trim());  // Gets array of argument names

			// Create numbered args array like ['arg1', 'arg2', etc]
			const numberedArgs = argNames.map((_, index) => `arg${index + 1}`);

			// Create arg value assignments string 
			const argAssignments = numberedArgs.map((arg, i) => {
				const value = arg1[i];

				// Handle null/undefined case
				if (value === null || value === undefined) {
					return `# ${arg}=None`;
				}

				// All non-null values are matrices/2D arrays
				if (value.length === 0) {
					return `# ${arg}=pd.DataFrame([])`;
				}

				// For 1x1 matrix, extract the scalar value
				if (value.length === 1 && value[0].length === 1) {
					const scalar = value[0][0];
					if (scalar === null) {
						return `# ${arg}=None`;
					}
					if (typeof scalar === 'string') {
						return `# ${arg}="${scalar}"`;
					}
					return `# ${arg}=${scalar}`;
				}

				// Otherwise convert to pandas DataFrame
				return `${arg} = pd.DataFrame(${JSON.stringify(value)})`;
			}).join('\n');

			// Construct invocation with numbered args
			const invocation = `${fname}(${numberedArgs.join(', ')})`;

			// Create the combined prompt string
			const prompt = `# Set args as globals\n${argAssignments}\n\n${start}\n\n`;

			const suffix = `\n\n# Test the function\nresult = ${invocation}\nprint(result)`;

			const fimPrompt = {
				model: 'codestral-2405',
				prompt,
				suffix,
				max_tokens: 1000,
				temperature: 0
			};
			console.log("fimPrompt", fimPrompt);

			const response = await fetch('https://gateway.ai.cloudflare.com/v1/92d55664b831823cc914de02c9a0d0ae/codepy/mistral/v1/fim/completions', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${env.MISTRAL_API_KEY}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(fimPrompt),
			});

			if (!response.ok) {
				throw new Error(`Mistral API error: ${response.statusText}`);
			}

			const fimResult = await response.json();
			const fimText = fimResult.choices[0].message.content;
			console.log(fimText);

			const text = `${prompt}\n\n${fimText}${invocation}`;
			console.log(text);

			// Log LLM prompt and result to database
			const llmData = JSON.stringify({
				fimPrompt,
				fimResult
			});

			const now = new Date().toISOString();
			await env.DB
				.prepare("INSERT INTO functions (created, function, llm) VALUES (?, ?, ?)")
				.bind(now, text, llmData)
				.run();

			return Response.json({
				success: true,
				message: text
			}, { headers });
		} catch (error) {
			return Response.json({
				success: false,
				error: error.message
			}, {
				status: 500,
				headers
			});
		}
	}
};
