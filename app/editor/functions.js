import { addToAzure } from './azuretable.js';

export async function saveFunction(parsedCode) {
    const functionEntity = {
        PartitionKey: parsedCode.timestamp,
        RowKey: parsedCode.uid,
        Name: parsedCode.name,
        Code: parsedCode.code,
        TestCases: JSON.stringify(parsedCode.testCases),
        Signature: parsedCode.signature,
    };

    await addToAzure(functionEntity);
}

export async function getFunctionNames() {
    try {
        const context = new Excel.RequestContext();
        const names = context.workbook.names;
        names.load("items");
        await context.sync();

        const functionNames = names.items
            .filter(name => {
                const formula = name.formula || '';
                return formula.includes('LAMBDA') && formula.includes('BOARDFLARE');
            })
            .map(name => ({
                name: name.name
            }));

        console.log('Found functions:', functionNames);
        return functionNames;
    } catch (error) {
        console.error('Error getting functions list:', error);
        return [];
    }
}

export async function getFunctionCode(functionName) {
    try {
        const context = new Excel.RequestContext();
        const functionNameItem = context.workbook.names.getItem(functionName);
        functionNameItem.load("formula");
        await context.sync();

        const formula = functionNameItem.formula;
        const urlMatch = formula.match(/https:\/\/py\.boardflare\.com\.[^\s")]+/);

        if (!urlMatch) {
            console.error('No boardflare URL found in formula:', formula);
            return '';
        }

        const response = await fetch(urlMatch[0]);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return JSON.stringify({
            code: data.code,
            testCases: data.examples
        });
    } catch (error) {
        console.error('Error getting function code:', error);
        return '';
    }
}
