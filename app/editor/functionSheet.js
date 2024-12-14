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
                sheet.getRange("A:A").format.columnWidth = 100;  // Function
                sheet.getRange("B:B").format.columnWidth = 150;  // Description
                sheet.getRange("C:C").format.columnWidth = 300;  // Code
                sheet.getRange("D:D").format.columnWidth = 100;  // Arg1
                sheet.getRange("E:E").format.columnWidth = 100;  // RUNPY
                sheet.getRange("F:F").format.columnWidth = 100;  // LAMBDA
                sheet.getRange("G:G").format.columnWidth = 100;  // NAMED
                await context.sync();

                const headerRange = sheet.getRange("A1:G1");
                headerRange.values = [["Function", "Description", "Code", "Arg1", "RUNPY", "LAMBDA", "NAMED LAMBDA"]];
                const table = sheet.tables.add(headerRange, true);
                table.name = "Functions";
                await context.sync();
            }

            sheet.activate();
            const table = sheet.tables.getItem("Functions");

            // Add new row with values and formulas
            const newRow = [[
                parsedCode.signature,
                parsedCode.description,
                parsedCode.code,
                parsedCode.arg1,
                parsedCode.runpy,
                parsedCode.lambda,
                parsedCode.named
            ]];

            table.rows.add(null, newRow);
            await context.sync();

            // Add or update name manager entry
            let namedItem;
            try {
                namedItem = context.workbook.names.getItem(parsedCode.name);
                await context.sync();
                namedItem.formula = parsedCode.formula;
            } catch (error) {
                if (error.code === 'ItemNotFound') {
                    namedItem = context.workbook.names.add(parsedCode.name, parsedCode.formula);
                } else {
                    throw error;
                }
            }
            namedItem.visible = true;
            if (parsedCode.description) {
                namedItem.comment = parsedCode.description;
            }
            await context.sync();

            // Create cell link inline
            const url = Office.context.document.url;
            await context.sync();
            console.log("Workbook URL:", url);

        } catch (error) {
            console.error("Excel API Error:", error);
            throw error;
        }
    }).catch(error => {
        console.error("Failed to update function sheet:", error);
        throw error;
    });
}