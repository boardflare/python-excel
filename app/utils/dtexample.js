function createEntityFromNotebookData(data) {
    return [{
        type: "Entity",
        text: data.name,
        properties: {
            "Description": {
                type: "String",
                basicValue: data.description || ""
            },
            "Code": {
                type: "String",
                basicValue: data.code || ""
            },
            "Lambda": {
                type: "String",
                basicValue: data.lambda || ""
            }
        },
        layouts: {
            compact: {
                icon: Excel.EntityCompactLayoutIcons.code
            }
        }
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
        sheet.activate();

        // Create headers first
        const headerRange = sheet.getRange("A1:D1");
        headerRange.values = [["Function", "Description", "Code", "Lambda"]];

        // Create table
        const table = sheet.tables.add(headerRange, true);
        table.name = "Python";

        // Add entity data maintaining original structure
        const entityRow = sheet.getRange("A2");
        entityRow.valuesAsJson = createEntityFromNotebookData(entityData);

        // Format the table
        table.getHeaderRowRange().format.font.bold = true;
        sheet.getUsedRange().format.autofitColumns();

        await context.sync();
    });
}

async function createNewFunction() {
    try {
        await Excel.run(async (context) => {
            const testData = {
                type: "Entity",
                text: "TestFunction",
                properties: {
                    "Description": {
                        type: "String",
                        basicValue: "This is a test function description"
                    },
                    "Code": {
                        type: "String",
                        basicValue: "def test_function(x):\n    return x * 2"
                    },
                    "Lambda": {
                        type: "String",
                        basicValue: "=LAMBDA(x, BOARDFLARE.RUNPY(<code>, x))"
                    }
                },
                layouts: {
                    compact: {
                        icon: Excel.EntityCompactLayoutIcons.code
                    }
                },
                provider: {
                    "description": "Boardflare",
                }
            };

            // Safely delete existing sheet
            const existingSheet = context.workbook.worksheets.getItemOrNullObject("NewFunc");
            existingSheet.delete();

            // Add new sheet
            let sheet = context.workbook.worksheets.add("NewFunc");
            sheet.activate();

            // Correct range value assignment
            let range = sheet.getRange("A1");
            // Choose one of these approaches:
            //range.values = [[3]]; // For simple value
            range.valuesAsJson = [[testData]]; // For complex JSON data

            await context.sync();
            return true;
        });
    } catch (error) {
        console.error("Error in createNewFunction:", error);
        throw error;
    }
}