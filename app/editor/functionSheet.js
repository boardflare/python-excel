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
                sheet.getRange("A:A").format.columnWidth = 75;  // Name
                sheet.getRange("B:B").format.columnWidth = 100;  // Signature
                sheet.getRange("C:C").format.columnWidth = 100;  // Description
                sheet.getRange("D:D").format.columnWidth = 300;  // Code
                sheet.getRange("E:E").format.columnWidth = 100;  // Arg1
                sheet.getRange("F:F").format.columnWidth = 100;  // RUNPY
                sheet.getRange("G:G").format.columnWidth = 100;  // LAMBDA
                sheet.getRange("H:H").format.columnWidth = 100;  // NAMED
                await context.sync();

                const headerRange = sheet.getRange("A1:H1");
                headerRange.values = [["Name", "Signature", "Description", "Code", "Arg1", "RUNPY", "LAMBDA", "NAMED LAMBDA"]];
                const table = sheet.tables.add(headerRange, true);
                table.name = "Functions";

                // Add placeholder row
                const placeholderRow = [[
                    "Example Function",
                    "foo",
                    "This is a sample function description",
                    "Your function code here",
                    "arg1",
                    "foo",
                    "foo",
                    "food"
                ]];
                table.rows.add(null, placeholderRow);

                await context.sync();
            }

            sheet.activate();
            const table = sheet.tables.getItem("Functions");

            // Add new row with values and formulas
            const newRow = [[
                parsedCode.name,
                parsedCode.signature,
                parsedCode.description,
                parsedCode.code,
                parsedCode.arg1,
                parsedCode.runpy,
                parsedCode.lambda,
                parsedCode.named
            ]];

            table.rows.add(null, newRow);

            // Set wrap text for all columns
            table.getRange().format.wrapText = true;

            // Disable wrap text for code column using direct name reference
            const codeColumn = table.columns.getItem("Code");
            codeColumn.getRange().format.wrapText = false;

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