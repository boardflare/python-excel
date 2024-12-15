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
			const decodedPath = decodeURIComponent(url.pathname.slice(1));
			const [uid, func, timestamp] = decodedPath.split('|');

			if (!uid || !func || !timestamp) {
				throw new Error('Invalid key format. Use: /uid|function|timestamp');
			}
			console.log('UID:', uid, 'Function:', func, 'Timestamp:', timestamp);

			let entity;
			if (uid.startsWith('ANON:')) {
				// For anonymous: PK=timestamp, RK=uid|function
				entity = await getAnonCode(env, timestamp, `${uid}|${func}`);
			} else {
				// For users: PK=uid, RK=function|timestamp
				entity = await getUserCode(env, uid, `${func}|${timestamp}`);
			}

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
