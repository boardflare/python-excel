// Cloudflare Worker to fetch a code by timestamp from Azure Table Storage

import { getCodeFromTable } from './tables.js';

const headers = {
	'Access-Control-Allow-Origin': '*'
};

const cacheHeaders = {
	...headers,
	'Cache-Control': 'public, max-age=3600'
};

export default {
	async fetch(request, env, ctx) {
		try {
			if (request.method !== 'GET') {
				throw new Error('Only GET requests are supported');
			}

			const url = new URL(request.url);
			console.log('URL:', url);
			const decodedPath = decodeURIComponent(url.pathname.slice(1));
			const [partitionKey, rowKey] = decodedPath.split('|');

			if (!partitionKey || !rowKey) {
				throw new Error('Invalid key format. Use: /partitionKey|rowKey');
			}

			const entity = await getCodeFromTable(env, partitionKey, rowKey);

			if (!entity) {
				throw new Error('Entity not found');
			}

			return Response.json(entity, { headers: cacheHeaders });
		} catch (error) {
			const statusCode = error.statusCode ||
				(error.message.includes('not found') ? 404 : 500);

			return Response.json({
				error: error.message
			}, {
				status: statusCode,
				headers
			});
		}
	}
};
