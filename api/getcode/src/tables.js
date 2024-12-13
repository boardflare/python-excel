const url = "https://boardflare.table.core.windows.net/Code";

export async function getCodeFromTable(env, partitionKey, rowKey) {
	try {
		const response = await fetch(`${url}(PartitionKey='${partitionKey}',RowKey='${rowKey}')${env.CODE_TABLE_READ}`, {
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