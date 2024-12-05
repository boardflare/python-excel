/**
 * Welcome to Cloudflare Workers! This is your first worker.
 * env.DB is a D1 SQLite database that will persist across requests.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { createMistral } from '@ai-sdk/mistral';
import { generateText } from 'ai';

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
			const { prompt } = await request.json();

			const mistral = createMistral({
				baseURL: `https://gateway.ai.cloudflare.com/v1/92d55664b831823cc914de02c9a0d0ae/codepy/mistral`,
				apiKey: env.MISTRAL_API_KEY,
			});

			const { text } = await generateText({
				model: mistral('codestral-2405'),
				maxTokens: 1000,
				temperature: 0.1,
				maxRetries: 3,
				prompt: prompt
			});

			const now = new Date().toISOString();
			const insertCode = await env.DB
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
