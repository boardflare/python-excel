export async function createDemo(parsedCode) {
    return Excel.run(async (context) => {
        try {
            let sheet = context.workbook.worksheets.getItemOrNullObject("Boardflare");
            await context.sync();

            if (sheet.isNullObject) {
                sheet = context.workbook.worksheets.add("Boardflare");
                await context.sync();

                // Set column widths for both tables
                sheet.getRange("A:A").format.columnWidth = 100; // Name
                sheet.getRange("B:B").format.columnWidth = 150; // Description
                sheet.getRange("C:C").format.columnWidth = 300; // Code
                sheet.getRange("D:D").format.columnWidth = 50;  // Empty separator
                sheet.getRange("E:E").format.columnWidth = 150; // Usage
                sheet.getRange("F:F").format.columnWidth = 150; // Example
                await context.sync();

                // Create Functions table
                const functionsHeaderRange = sheet.getRange("A1:C1");
                functionsHeaderRange.values = [["Name", "Description", "Code"]];
                const functionsTable = sheet.tables.add(functionsHeaderRange, true);
                functionsTable.name = "Functions";

                // Create Examples table
                const examplesHeaderRange = sheet.getRange("E1:F1");
                examplesHeaderRange.values = [["Usage", "Example"]];
                const examplesTable = sheet.tables.add(examplesHeaderRange, true);
                examplesTable.name = "Examples";

                // Add placeholder rows
                const functionsPlaceholder = [[
                    "",
                    "Function docstring",
                    "Python code executed by RUNPY"
                ]];
                const examplesPlaceholder = [[
                    "Function signature",
                    "e.g. =FOO(\"bar\")",
                ]];

                functionsTable.rows.add(null, functionsPlaceholder);
                examplesTable.rows.add(null, examplesPlaceholder);

                await context.sync();
            }

            sheet.activate();
            const functionsTable = sheet.tables.getItem("Functions");
            const examplesTable = sheet.tables.getItem("Examples");

            // Add new rows to both tables
            const functionsRow = [[
                parsedCode.name,
                parsedCode.description,
                parsedCode.code
            ]];

            const examplesRow = [[
                parsedCode.signature,
                parsedCode.named
            ]];

            functionsTable.rows.add(null, functionsRow);
            examplesTable.rows.add(null, examplesRow);

            // Set wrap text for all columns except code
            functionsTable.getRange().format.wrapText = true;
            examplesTable.getRange().format.wrapText = true;

            // Disable wrap text for code column
            // const codeColumn = functionsTable.columns.getItem("Code");
            // codeColumn.getRange().format.wrapText = false;

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