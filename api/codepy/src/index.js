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
			const { genText } = await request.json();

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
