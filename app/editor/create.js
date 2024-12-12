import { parsePython } from '../utils/codeparser.js';

export async function createNewFunction() {
    Office.context.ui.displayDialogAsync('https://localhost:4000/editor/monaco.html',
        // { height: 60, width: 50 },
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

    try {
        console.log('Code:', code);
        const entityData = parsePython(code);
        console.log('Parsed entity:', entityData);

        // Extract params outside Excel.run
        const params = entityData.signature
            .match(/\((.*?)\)/)?.[1]
            ?.split(',')
            .map(p => p.trim())
            .join(',') || '';

        // Get docstring but don't remove from code
        const docstring = entityData.docstring || '';

        console.log('Params:', params);

        await Excel.run(async (context) => {
            // Create lambda formula with inline quote escaping
            const formula = `=LAMBDA(${params}, PREVIEW.RUNPY("${entityData.code.replace(/"/g, '""')}", ${params}))`;

            if (formula.length > 8190) {
                throw new Error("Function code is too long. Excel named formulas are limited to 8190 characters.  Either reduce the size of the function or consider using a GitHub Gist to store function.");
            }

            console.log('Formula:', formula);
            console.log('Function:', entityData.name);

            // Add or update the name in the workbook
            const namedItem = context.workbook.names.add(entityData.name, formula);
            namedItem.visible = true;
            console.log('Docstring:', docstring);

            // Store truncated docstring as comment if present
            if (docstring) {
                namedItem.comment = docstring.trim().substring(0, 255);
            }

            await context.sync();
        });

        progress.textContent = "Function saved to Name Manager successfully!";
        progress.style.color = "green";
    } catch (error) {
        progress.textContent = error.message;
        progress.style.color = "red";
        console.error('Error saving function:', error);
    }
}