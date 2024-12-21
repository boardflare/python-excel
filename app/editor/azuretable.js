import { parsePython } from './codeparser.js';

const url = "https://boardflarewest.table.core.windows.net/CodeByTimestamp";
const sas = "?sv=2019-02-02&st=2024-12-19T22%3A12%3A48Z&se=2034-12-20T22%3A12%3A00Z&sp=a&sig=KWho482PTywCGota3Ccvdz50t0RHNoicFqm61Rp8go0%3D&tn=CodeByTimestamp";

export async function addToAzure(parsedFunction) {
    const functionEntity = {
        PartitionKey: parsedFunction.timestamp,
        RowKey: parsedFunction.uid,
        Name: parsedFunction.name,
        Code: parsedFunction.code,
        Description: parsedFunction.description,
        Signature: parsedFunction.signature,
        Formula: parsedFunction.formula,
        Demo: parsedFunction.demo || ''  // Add demo property
    };
    console.log("Adding to Azure Table:", functionEntity);

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
        const response = await fetch(`${url}${sas}`, {
            method: 'POST',
            headers,
            body
        });
        console.log("save to azure table", response.ok);
        return response.ok;
    } catch (error) {
        console.error('Error:', error);
        return false;
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
