export async function updateFunctionSheet(parsedCode) {
    return Excel.run(async (context) => {
        // Get or create Boardflare worksheet
        let sheet = context.workbook.worksheets.getItemOrNullObject("Boardflare");
        await context.sync();

        if (sheet.isNullObject) {
            sheet = context.workbook.worksheets.add("Boardflare");
            await context.sync();

            // Updated column widths
            sheet.getRange("A:A").format.columnWidth = 150;  // Function
            sheet.getRange("B:B").format.columnWidth = 200;  // Description
            sheet.getRange("C:C").format.columnWidth = 100;  // Code
            sheet.getRange("D:D").format.columnWidth = 100;  // Example
            sheet.getRange("E:E").format.columnWidth = 80;   // RUNPY
            sheet.getRange("F:F").format.columnWidth = 80;   // LAMBDA
            sheet.getRange("G:G").format.columnWidth = 100;  // NAMED
            await context.sync();  // Ensure widths are applied

            const headerRange = sheet.getRange("A1:G1");
            headerRange.values = [["Function", "Description", "Code", "Example", "RUNPY", "LAMBDA", "NAMED LAMBDA"]];
            const table = sheet.tables.add(headerRange, true);
            table.name = "Functions";
            await context.sync();
        }

        // Get table and add new row
        const table = sheet.tables.getItem("Functions");
        const newRow = [[
            parsedCode.signature,
            parsedCode.description,
            null,
            parsedCode.example,
            parsedCode.runpy,
            parsedCode.lambda,
            parsedCode.named
        ]];
        table.rows.add(null, newRow);

        // Update the code column with entity
        const tableRange = table.getRange();
        tableRange.load("rowCount");

        await context.sync();

        const codeCell = sheet.getRange(`C${tableRange.rowCount}`);
        codeCell.valuesAsJson = [[{
            type: Excel.CellValueType.entity,
            text: parsedCode.name,
            properties: {
                "Pycode": { type: "String", basicValue: parsedCode.code || "Not available" }
            },
            layouts: {
                compact: { icon: Excel.EntityCompactLayoutIcons.code },
            },
            provider: {
                "description": "Boardflare",
            },
        }]];

        sheet.activate();
        await context.sync();
    });
}