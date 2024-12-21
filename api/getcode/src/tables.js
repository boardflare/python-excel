// Functions to get code from tables

export async function getUserCode(env, partitionKey, rowKey) {
	try {
		const response = await fetch(`https://boardflare.table.core.windows.net/Code(PartitionKey='${partitionKey}',RowKey='${rowKey}')${env.CODE_TABLE_READ}`, {
			method: 'GET',
			headers: {
				'Accept': 'application/json;odata=nometadata',
				'x-ms-date': new Date().toUTCString(),
				'x-ms-version': '2024-05-04',
			}
		});

		if (response.ok) {
			return await response.json();
		} else {
			throw new Error(`Failed to fetch data: ${response.status}`);
		}
	} catch (error) {
		console.error('Error:', error);
		throw error;
	}
}

export async function getAnonCode(env, partitionKey, rowKey) {
	const url = `https://boardflarewest.table.core.windows.net/CodeByTimestamp(PartitionKey='${partitionKey}',RowKey='${rowKey}')${env.CODEBYTIMESTAMP_TABLE_READ}`;
	console.log('url:', url);
	try {
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Accept': 'application/json;odata=nometadata',
				'x-ms-date': new Date().toUTCString(),
				'x-ms-version': '2024-05-04',
			}
		});

		if (response.ok) {
			return await response.json();
		} else {
			throw new Error(`Failed to fetch data: ${response.status}`);
		}
	} catch (error) {
		console.error('Error:', error);
		throw error;
	}
}