import { parsePython } from '../utils/codeparser.js';

async function getExamplesFromNotebook() {
    try {
        const response = await fetch('./add/examples.ipynb');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const notebook = await response.json();

        const codeCells = notebook.cells
            .filter(cell => cell.cell_type === 'code')
            .map(cell => parsePython(cell.source.join('')));

        if (!codeCells.length) return null;

        return codeCells;
    } catch (error) {
        console.error('Error loading notebook:', error);
        throw error; // Re-throw to handle in caller
    }
}

async function addNamedFunctions(examples) {
    for (const ex of examples) {
        const params = ex.signature
            .match(/\((.*?)\)/)?.[1]
            ?.split(',')
            .map(p => p.trim())
            .join(',') || '';

        const formula = `=LAMBDA(${params}, PREVIEW.RUNPY("${ex.code.replace(/"/g, '""')}", ${params}))`;

        if (formula.length > 8190) {
            console.warn(`Skipping ${ex.name}: Function code too long (> 8190 characters)`);
            continue;
        }
        console.log('Adding:', ex.name, formula);

        await Excel.run(async (context) => {
            // Delete existing named item if it exists
            const existingItem = context.workbook.names.getItemOrNullObject(ex.name);
            await context.sync();

            if (existingItem.isNullObject === false) {
                existingItem.delete();
            }

            const namedItem = context.workbook.names.add(ex.name, formula);
            namedItem.visible = true;

            if (ex.description) {
                namedItem.comment = ex.description.trim().substring(0, 255);
            }

            await context.sync();
        });
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function addFunctionsSheet() {
    const examples = await getExamplesFromNotebook();
    if (!examples) {
        throw new Error("Could not load examples from notebook");
    }
    console.log('Examples:', examples);

    await addNamedFunctions(examples);

    const headerRow = [["Function", "Description", "Code", "Example"]];
    const dataRows = examples.map(ex => [
        ex.signature,
        ex.description,
        null,
        ex.example ? `=${ex.name}("${ex.example}")` : ''
    ]);

    await Excel.run(async (context) => {
        context.workbook.worksheets.getItemOrNullObject("Python_Demo").delete();
        let sheet = context.workbook.worksheets.add("Python_Demo");

        // Add header and data
        const numColumns = 4; // A through D
        const endRow = dataRows.length + 1; // +1 for header row
        const dataRange = sheet.getRangeByIndexes(0, 0, endRow, numColumns);
        dataRange.values = [...headerRow, ...dataRows];

        // Convert range to table
        const table = sheet.tables.add(dataRange, true);
        table.style = "TableStyleMedium2";
        table.name = "PythonFunctionsTable";

        // Format columns
        table.columns.load("items");
        await context.sync();

        // Add code entities to the Code column (C column)
        const codeRange = sheet.getRange("C2:C" + endRow);
        codeRange.valuesAsJson = examples.map(ex => createEntity(ex));

        // Initial autofit
        table.getRange().format.autofitColumns();

        sheet.activate();
        await context.sync();

        // Wait 2 seconds and autofit again
        await delay(2000);
        table.getRange().format.autofitColumns();
        await context.sync();
    });
}

function createEntity(data) {

    return [{
        type: Excel.CellValueType.entity,
        text: data.name,
        properties: {
            "Code": { type: "String", basicValue: data.code || "Not available" }
        },
        layouts: {
            compact: { icon: Excel.EntityCompactLayoutIcons.code },
        },
        provider: {
            "description": "Boardflare",
            //logoSourceAddress: 'https://.../datatype-logo.png',
            //logoTargetAddress: 'https://www.boardflare.com',
        },
    }];
}