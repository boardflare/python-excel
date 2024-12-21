// Cloudflare Worker to fetch a code by timestamp from Azure Table Storage

import { getUserCode, getAnonCode } from './tables.js';

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

			const uid = url.searchParams.get('uid');
			const name = url.searchParams.get('name');
			const timestamp = url.searchParams.get('timestamp');

			if (!uid || !timestamp) {
				throw new Error('Missing required query parameters. Use: ?uid=xxx&timestamp=xxx');
			}
			console.log('UID:', uid, 'Function:', name, 'Timestamp:', timestamp);

			let entity;
			if (uid.startsWith('ANON:')) {
				// For anonymous: PK=timestamp, RK=uid
				entity = await getAnonCode(env, timestamp, uid);
			} else {
				// For users: PK=uid, RK=function|timestamp
				entity = await getUserCode(env, uid, `${name}|${timestamp}`);
			}

			if (!entity) {
				throw new Error('Entity not found');
			}

			const returnParam = url.searchParams.get('return');
			if (returnParam === 'code') {
				return new Response(entity.Code, {
					headers: {
						...cacheHeaders,
						'Content-Type': 'text/plain'
					}
				});
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
