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
            const namedItem = context.workbook.names.add(ex.name, formula);
            namedItem.visible = true;

            if (ex.docstring) {
                namedItem.comment = ex.docstring.trim().substring(0, 255);
            }

            await context.sync();
        });
    }
}

export async function addFunctionsSheet() {
    const examples = await getExamplesFromNotebook();
    if (!examples) {
        throw new Error("Could not load examples from notebook");
    }
    console.log('Examples:', examples);

    const tableRows = examples.map(ex => [
        ex.signature,
        ex.description,
        null,
        ex.example ? `=${ex.name}("${ex.example}")` : ''
    ]);
    console.log('Table rows to be added:', tableRows);

    await Excel.run(async (context) => {
        context.workbook.worksheets.getItemOrNullObject("Python_Demo").delete();
        let sheet = context.workbook.worksheets.add("Python_Demo");

        // Create table and header
        const functionsTable = sheet.tables.add("A1:D1", true);
        functionsTable.name = "PythonFunctions";
        functionsTable.getHeaderRowRange().values = [["Function", "Description", "Code", "Example"]];

        // Add data to table using prepared rows
        functionsTable.rows.add(null, tableRows);

        // Format columns before adding entities
        sheet.getUsedRange().format.autofitColumns();
        sheet.getUsedRange().format.autofitRows();

        // Add code entities only to the Code column
        const codeColumn = functionsTable.columns.getItem("Code");
        codeColumn.getDataBodyRange().valuesAsJson = examples.map(ex => createEntity(ex));
        codeColumn.getRange().format.autofitColumns();

        sheet.activate();
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