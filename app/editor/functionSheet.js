export async function updateFunctionSheet(parsedCode) {
    return Excel.run(async (context) => {
        try {
            // Get or create Boardflare worksheet
            let sheet = context.workbook.worksheets.getItemOrNullObject("Boardflare");
            await context.sync();

            if (sheet.isNullObject) {
                sheet = context.workbook.worksheets.add("Boardflare");
                await context.sync();

                // Updated column widths
                sheet.getRange("A:A").format.columnWidth = 75;  // Function
                sheet.getRange("B:B").format.columnWidth = 150;  // Description
                sheet.getRange("C:C").format.columnWidth = 75;  // Code
                sheet.getRange("D:D").format.columnWidth = 100;  // Arg1
                sheet.getRange("E:E").format.columnWidth = 100;   // RUNPY
                sheet.getRange("F:F").format.columnWidth = 120;   // LAMBDA
                sheet.getRange("G:G").format.columnWidth = 120;  // NAMED
                await context.sync();  // Ensure widths are applied

                const headerRange = sheet.getRange("A1:G1");
                headerRange.values = [["Function", "Description", "Python", "Arg1", "RUNPY", "LAMBDA", "NAMED LAMBDA"]];
                const table = sheet.tables.add(headerRange, true);
                table.name = "Functions";
                await context.sync();
            }

            sheet.activate();

            // Get table and add new row
            const table = sheet.tables.getItem("Functions");
            const newRow = [[
                parsedCode.signature,
                parsedCode.description,
                null,
                parsedCode.arg1,
                parsedCode.runpy,
                parsedCode.lambda,
                parsedCode.named
            ]];
            table.rows.add(null, newRow);

            // Update the code and named lambda columns with entity
            const tableRange = table.getRange();
            tableRange.load("rowCount");

            await context.sync();

            const codeCell = sheet.getRange(`C${tableRange.rowCount}`);
            codeCell.valuesAsJson = [[{
                type: Excel.CellValueType.entity,
                text: parsedCode.name,
                properties: {
                    "Code": { type: "String", basicValue: parsedCode.code || "Not available" }
                },
                layouts: {
                    compact: { icon: Excel.EntityCompactLayoutIcons.code },
                },
                provider: {
                    "description": "Boardflare"
                },
            }]];

            // await context.sync();

            // const namedLambdaCell = sheet.getRange(`G${tableRange.rowCount}`);
            // namedLambdaCell.formulas = [["=[@Example]"]];

            await context.sync();
        } catch (error) {
            console.error("Excel API Error:", error);
            throw error;
        }
    }).catch(error => {
        console.error("Failed to update function sheet:", error);
        throw error;
    });
}