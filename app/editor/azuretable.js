// Add function to Azure Table

const url = "https://boardflarewest.table.core.windows.net/CodeByTimestamp";
const sas = "?sv=2019-02-02&st=2024-12-19T22%3A12%3A48Z&se=2034-12-20T22%3A12%3A00Z&sp=a&sig=KWho482PTywCGota3Ccvdz50t0RHNoicFqm61Rp8go0%3D&tn=CodeByTimestamp";


export async function addToAzure(functionEntity) {
    const { PartitionKey, RowKey } = functionEntity;
    const body = JSON.stringify(functionEntity);

    const headers = {
        'Accept': 'application/json;odata=nometadata',
        'Content-Type': 'application/json',
        'Content-Length': body.length.toString(),
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2024-05-04',
        'Prefer': 'return-no-content'
    };

    try {
        const response = await fetch(`${url}(PartitionKey='${PartitionKey}',RowKey='${RowKey}')${sas}`, {
            method: 'POST',
            headers,
            body
        });
        console.log("create function", response.ok);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Placeholder for updating functions for signed in users
export async function updateFunction(functionEntity) {
    const { PartitionKey, RowKey } = functionEntity;
    const body = JSON.stringify(functionEntity);

    const headers = {
        'Accept': 'application/json;odata=nometadata',
        'Content-Type': 'application/json',
        'Content-Length': body.length.toString(),
        'x-ms-date': new Date().toUTCString(),
        'x-ms-version': '2024-05-04',
        'Prefer': 'return-no-content'
    };

    try {
        const response = await fetch(`${url}(PartitionKey='${PartitionKey}',RowKey='${RowKey}')${sas}`, {
            method: 'PUT',
            headers,
            body
        });
        console.log("update function", response.ok);
    } catch (error) {
        console.error('Error:', error);
    }
}
