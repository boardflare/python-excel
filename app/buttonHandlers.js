/* global Excel */

const iconNames = Excel.EntityCompactLayoutIcons;

Office.onReady(() => {
    document.getElementById("addFunctionsSheet").onclick = addFunctionsSheet;
    document.getElementById("createNewFunction").onclick = createNewFunction;
});

async function getEntityDataFromNotebook() {
    try {
        const response = await fetch('./notebooks/capitalize.ipynb');
        const notebook = await response.json();

        const codeCell = notebook.cells.find(cell =>
            cell.metadata.tags && cell.metadata.tags.includes('code')
        );

        const functionName = codeCell ?
            (codeCell.source.join('').match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/)?.[1]?.toUpperCase()) : null;

        const signature = codeCell ?
            (codeCell.source.join('').match(/def\s+([^:]+):/)?.[1]?.replace(
                /([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*)\)/,
                (_, name, args) => `${name.toUpperCase()}(${args})`
            )) : '';

        // Extract docstring sections
        const docstring = codeCell.source.join('').match(/"""([\s\S]*?)"""/)?.[1] || '';
        const description = docstring.split('\n')[0].trim();

        const argsSection = docstring.match(/Args:([\s\S]*?)(?=Returns:|Raises:|Examples:|$)/)?.[1]?.trim() || '';
        const returnsSection = docstring.match(/Returns:([\s\S]*?)(?=Raises:|Examples:|$)/)?.[1]?.trim() || '';
        const examplesSection = docstring.match(/Examples:([\s\S]*?)(?=$)/)?.[1]?.trim() || '';

        return {
            name: functionName,
            signature,
            code: codeCell ? codeCell.source.join('') : '',
            description,
            args: argsSection,
            returns: returnsSection,
            examples: examplesSection
        };
    } catch (error) {
        console.error('Error loading notebook:', error);
        return null;
    }
}

function createEntityFromNotebookData(data) {
    return [{
        type: Excel.CellValueType.entity,
        text: data.name,
        properties: {
            "Signature": {
                type: Excel.CellValueType.string,
                basicValue: data.signature || "Not available"
            },
            "Description": {
                type: Excel.CellValueType.string,
                basicValue: data.description || "Not available"
            },
            "Args": {
                type: Excel.CellValueType.string,
                basicValue: data.args || "Not available"
            },
            "Returns": {
                type: Excel.CellValueType.string,
                basicValue: data.returns || "Not available"
            },
            "Examples": {
                type: Excel.CellValueType.string,
                basicValue: data.examples || "Not available"
            },
            "Code": {
                type: Excel.CellValueType.string,
                basicValue: data.code || "Not available"
            }
        },
        layouts: {
            compact: {
                icon: Excel.EntityCompactLayoutIcons.code
            },
            card: {
                title: {
                    property: "Signature"
                },
                sections: [
                    {
                        layout: "List",
                        properties: ["Description", "Args", "Returns", "Examples"]
                    },
                    {
                        layout: "List",
                        title: "Code",
                        collapsible: true,
                        collapsed: true,
                        properties: ["Code"]
                    }
                ]
            }
        },
        provider: {
            "description": "Boardflare",
            logoSourceAddress: "https://localhost:4000/datatype-logo.png", // Logo image URL.
            // logoSourceAddress: "https://addins.boardflare.com/python/prod/favicon.ico",
            logoTargetAddress: "https://www.boardflare.com", // Logo link URL.
        },
    }];
}

async function addFunctionsSheet() {
    await Excel.run(async (context) => {
        const entityData = await getEntityDataFromNotebook();
        if (!entityData?.name) {
            throw new Error("Could not find function name in notebook");
        }

        context.workbook.worksheets.getItemOrNullObject("Functions").delete();
        let sheet = context.workbook.worksheets.add("Functions");

        // Create table
        const functionsTable = sheet.tables.add("A1", true);
        functionsTable.name = "PythonFunctions";
        functionsTable.getHeaderRowRange().values = [["Function"]];

        // Get existing Function column and update values
        const functionColumn = functionsTable.columns.getItem("Function");
        functionColumn.getDataBodyRange().valuesAsJson = [createEntityFromNotebookData(entityData)];
        functionColumn.getRange().format.autofitColumns();

        sheet.activate();

        await context.sync();
    });
}

async function createNewFunction() {
    Office.context.ui.displayDialogAsync('https://localhost:4000/monaco.html',
        { height: 60, width: 50 },
        function (result) {
            if (result.status === Office.AsyncResultStatus.Failed) {
                console.error(`Dialog failed: ${result.error.message}`);
                return;
            }

            // Store dialog instance
            const dialog = result.value;
            dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
                const code = arg.message;
                if (code) {
                    parseAndCreateFunction(code);
                    dialog.close();
                }
            });
        }
    );
}

function parsePythonCode(code) {
    try {
        const functionMatch = code.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*?)\):/);
        if (!functionMatch) throw new Error("No function definition found");

        const functionName = functionMatch[1].toUpperCase();
        const signature = `${functionName}(${functionMatch[2]})`;

        const docstringMatch = code.match(/"""([\s\S]*?)"""/);
        if (!docstringMatch) throw new Error("No docstring found");

        const docstring = docstringMatch[1];
        const description = docstring.split('\n')[0].trim();
        const args = docstring.match(/Args:([\s\S]*?)(?=Returns:|$)/)?.[1]?.trim() || '';
        const returns = docstring.match(/Returns:([\s\S]*?)(?=Examples:|$)/)?.[1]?.trim() || '';
        const examples = docstring.match(/Examples:([\s\S]*?)$/)?.[1]?.trim() || '';

        return {
            name: functionName,
            signature,
            code,
            description,
            args,
            returns,
            examples
        };
    } catch (error) {
        throw new Error(`Failed to parse Python code: ${error.message}`);
    }
}

async function parseAndCreateFunction(code) {
    const progress = document.getElementById('progress');
    try {
        const entityData = parsePythonCode(code);

        await Excel.run(async (context) => {
            const sheet = context.workbook.worksheets.getItem("Functions");
            const table = sheet.tables.getItem("PythonFunctions");

            const range = table.rows.add(null, [createEntityFromNotebookData(entityData)]);
            await context.sync();
        });

        progress.textContent = "Function created successfully!";
        progress.style.color = "green";
    } catch (error) {
        progress.textContent = error.message;
        progress.style.color = "red";
    }

    setTimeout(() => {
        progress.textContent = "";
    }, 3000);
}