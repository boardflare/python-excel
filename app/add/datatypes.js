import { parsePython } from '../utils/codeparser.js';

async function getEntityDataFromNotebook() {
    try {
        const response = await fetch('./notebooks/capitalize.ipynb');
        const notebook = await response.json();

        const codeCell = notebook.cells.find(cell =>
            cell.metadata.tags?.includes('code'));
        if (!codeCell) return null;

        const code = codeCell.source.join('');
        return parsePython(code);
    } catch (error) {
        console.error('Error loading notebook:', error);
        return null;
    }
}

export async function addFunctionsSheet() {
    await Excel.run(async (context) => {
        const entityData = await getEntityDataFromNotebook();
        if (!entityData?.name) {
            throw new Error("Could not find function name in notebook");
        }

        // Delete existing sheet if present
        context.workbook.worksheets.getItemOrNullObject("Functions").delete();
        let sheet = context.workbook.worksheets.add("Functions");

        // Create header
        const headerRange = sheet.getRange("A1");
        headerRange.values = [["Function"]];

        // Add data in A2
        const dataRange = sheet.getRange("A2");
        dataRange.valuesAsJson = [createEntityFromNotebookData(entityData)];

        // Format column width
        sheet.getRange("A:A").format.autofitColumns();

        // Activate the sheet
        sheet.activate();

        await context.sync();
    });
}

function createEntityFromNotebookData(data) {
    return [{
        type: Excel.CellValueType.entity,
        text: data.name,
        properties: {
            "Signature": { type: "String", basicValue: data.signature || "Not available" },
            "Description": { type: "String", basicValue: data.description || "Not available" },
            "Args": { type: "String", basicValue: data.args || "Not available" },
            "Returns": { type: "String", basicValue: data.returns || "Not available" },
            "Examples": { type: "String", basicValue: data.examples || "Not available" },
            "Code": { type: "String", basicValue: data.code || "Not available" }
        },
        layouts: {
            compact: { icon: Excel.EntityCompactLayoutIcons.code },
            card: {
                title: { property: "Signature" },
                sections: [
                    { layout: "List", properties: ["Description", "Args", "Returns", "Examples"] },
                    { layout: "List", title: "Code", collapsible: true, collapsed: true, properties: ["Code"] }
                ]
            }
        },
        provider: {
            "description": "Boardflare",
            logoSourceAddress: "https://localhost:4000/datatype-logo.png",
            logoTargetAddress: "https://www.boardflare.com",
        },
    }];
}