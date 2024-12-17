export async function updateDemoTable(parsedCode) {
    return Excel.run(async (context) => {
        try {
            let sheet = context.workbook.worksheets.getItemOrNullObject("Boardflare_Demo");
            await context.sync();

            if (sheet.isNullObject) {
                sheet = context.workbook.worksheets.add("Boardflare_Demo");
                await context.sync();

                // Set column widths for the demo table
                sheet.getRange("A:A").format.columnWidth = 150; // Signature
                sheet.getRange("B:B").format.columnWidth = 100; // Arg1
                sheet.getRange("C:C").format.columnWidth = 200; // Named LAMBDA
                await context.sync();

                // Add title cell and merge
                const titleRange = sheet.getRange("A1:C1");
                titleRange.merge();
                titleRange.values = [["Table info here", "", ""]];
                titleRange.format.wrapText = true;

                // Create Demo table (start at row 2 now)
                const demoHeaderRange = sheet.getRange("A2:C2");
                demoHeaderRange.values = [["Function", "Arg1", "Named LAMBDA"]];
                const demoTable = sheet.tables.add(demoHeaderRange, true);
                demoTable.name = "Demo";

                //Add placeholder row
                const placeholderRow = [[
                    "     ",
                    "example argument",
                    " e.g. =EXTRACTEMAIL([@Arg1])"
                ]];

                demoTable.rows.add(null, placeholderRow);
                await context.sync();
            }

            sheet.activate();
            const demoTable = sheet.tables.getItem("Demo");

            // Add new row to demo table with first two columns
            const initialRow = [[
                parsedCode.signature,
                parsedCode.arg1,
                ""  // Empty placeholder for named value
            ]];

            demoTable.rows.add(null, initialRow);

            // Set wrap text for all columns
            demoTable.getRange().format.wrapText = true;

            // Load the rows count
            demoTable.rows.load("count");
            await context.sync();

            // Now update the named value in the last column
            const rowCount = demoTable.rows.count;
            const lastRow = demoTable.rows.getItemAt(rowCount - 1);
            lastRow.getRange().getLastColumn().values = [[parsedCode.named]];

            await context.sync();

        } catch (error) {
            console.error("Excel API Error:", error);
            throw error;
        }
    }).catch(error => {
        console.error("Failed to update demo sheet:", error);
        throw error;
    });
}