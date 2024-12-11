/* global Excel */

Office.onReady(() => {
    document.getElementById("addFunctionsSheet").onclick = addFunctionsSheet;
    document.getElementById("createNewFunction").onclick = createNewFunction;
});

function parseDocstring(code) {
    const msgs = {
        description: 'No description available',
        args: 'No arguments documented',
        returns: 'No return value documented',
        examples: 'No examples provided'
    };

    const docstring = code.match(/"""([\s\S]*?)"""/)?.[1];
    if (!docstring) return msgs;

    return {
        description: docstring.split('\n')[0].trim() || msgs.description,
        args: docstring.match(/Args:([\s\S]*?)(?=Returns:|Examples:|$)/)?.[1]?.trim() || msgs.args,
        returns: docstring.match(/Returns:([\s\S]*?)(?=Examples:|$)/)?.[1]?.trim() || msgs.returns,
        examples: docstring.match(/Examples:([\s\S]*?)$/)?.[1]?.trim() || msgs.examples
    };
}

function parsePythonFunction(code) {
    const functionMatch = code.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*?)\):/);
    if (!functionMatch) throw new Error("No function definition found");

    const name = functionMatch[1].toUpperCase();
    return {
        name,
        signature: `${name}(${functionMatch[2]})`,
        code,
        ...parseDocstring(code)
    };
}

async function getEntityDataFromNotebook() {
    try {
        const response = await fetch('./notebooks/capitalize.ipynb');
        const notebook = await response.json();

        const codeCell = notebook.cells.find(cell =>
            cell.metadata.tags?.includes('code'));
        if (!codeCell) return null;

        const code = codeCell.source.join('');
        return parsePythonFunction(code);
    } catch (error) {
        console.error('Error loading notebook:', error);
        return null;
    }
}

async function addFunctionsSheet() {
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

async function createNewFunction() {
    Office.context.ui.displayDialogAsync('https://localhost:4000/monaco.html',
        { height: 60, width: 50 },
        function (result) {
            if (result.status === Office.AsyncResultStatus.Failed) {
                console.error(`Dialog failed: ${result.error.message}`);
                return;
            }
            const dialog = result.value;
            dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
                if (arg.message) {
                    parseAndCreateFunction(arg.message);
                    dialog.close();
                }
            });
        }
    );
}

async function parseAndCreateFunction(code) {
    const progress = document.getElementById('progress');
    const STORAGE_KEY = 'pythonFunctions';

    try {
        console.log('Parsing code:', code);
        const entityData = parsePythonFunction(code);
        console.log('Parsed entity:', entityData);

        // Get existing functions from localStorage
        let existingFunctions = [];
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            existingFunctions = JSON.parse(stored);
        }

        // Create and add new entity
        const newEntity = createEntityFromNotebookData(entityData);
        console.log('New entity:', newEntity);
        existingFunctions.push(newEntity);
        console.log('Updated functions:', existingFunctions);

        // Save back to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existingFunctions));

        progress.textContent = "Function saved successfully!";
        progress.style.color = "green";
    } catch (error) {
        progress.textContent = error.message;
        progress.style.color = "red";
        console.error('Error saving function:', error);
    }
    setTimeout(() => progress.textContent = "", 5000);
}