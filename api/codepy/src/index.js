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
			const { description, arg1 } = await request.json();

			const genText = {
				model: 'codestral-2405',
				messages: [
					{ role: 'system', content: "You are writing Python code to accomplish the requirements provided by the user.  Your code should comprise a single function which is called at the end with the arguments named arg1, arg2, etc.  Arguments are either a scalar or an array in the form of a Pandas DataFrame.  Function must return a standard Python scalar (int, float, str, bool) or a nested list of scalars.  Return only code without markdown." },
					{ role: 'user', content: "Take the dot product of two DataFrames arg1 and arg2, where each DataFrame is a column vector, using Numpy. For example, arg1=pd.DataFrame([[1], [2], [3]]), arg2=pd.DataFrame([[4], [5], [6]])" },
					{ role: 'assistant', content: "import numpy as np\nimport pandas as pd\n\ndef dot_product(arg1, arg2):\n    return np.dot(arg1.values.flatten(), arg2.values.flatten())\n\ndot_product(arg1, arg2)" },
					{ role: 'user', content: description }
				],
				max_tokens: 1000,
				temperature: 0.1
			};

			const response = await fetch('https://gateway.ai.cloudflare.com/v1/92d55664b831823cc914de02c9a0d0ae/codepy/mistral/chat/completions', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${env.MISTRAL_API_KEY}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(genText),
			});

			if (!response.ok) {
				throw new Error(`Mistral API error: ${response.statusText}`);
			}

			const result = await response.json();
			const text = result.choices[0].message.content;

			const now = new Date().toISOString();
			await env.DB
				.prepare("INSERT INTO functions (created, function) VALUES (?, ?)")
				.bind(now, text)
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
