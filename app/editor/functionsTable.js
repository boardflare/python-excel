export async function updateFunctionsTable(parsedCode) {
    return Excel.run(async (context) => {
        try {
            let sheet = context.workbook.worksheets.getItemOrNullObject("Boardflare_Functions");
            await context.sync();

            if (sheet.isNullObject) {
                sheet = context.workbook.worksheets.add("Boardflare_Functions");
                await context.sync();

                // Set column widths
                sheet.getRange("A:A").format.columnWidth = 100; // Name
                sheet.getRange("B:B").format.columnWidth = 100; // Signature
                sheet.getRange("C:C").format.columnWidth = 150; // Description
                sheet.getRange("D:D").format.columnWidth = 300; // Code
                sheet.getRange("E:E").format.columnWidth = 100; // Requirements
                sheet.getRange("F:F").format.columnWidth = 200; // TestCases
                await context.sync();

                // Add title cell and merge
                const titleRange = sheet.getRange("A1:F1");
                titleRange.values = [["⚠️ WARNING ⚠️:  The table below is used to store the functions you create with Boardflare Python for Excel. DO NOT EDIT IT DIRECTLY.  It is protected to help prevent you from doing this by accident.  If you delete it your functions will stop working.  However, feel free to hide it.", "", "", "", "", ""]];
                titleRange.format.horizontalAlignment = "left";
                titleRange.format.verticalAlignment = "top";
                titleRange.merge();
                titleRange.format.wrapText = true;
                titleRange.format.font.size = 13;
                titleRange.format.fill.color = "yellow";
                titleRange.format.rowHeight = 40;
                await context.sync();

                // Create Functions table
                const functionsHeaderRange = sheet.getRange("A2:F2");
                functionsHeaderRange.values = [["Name", "Signature", "Description", "Code", "Requirements", "TestCases"]];
                const functionsTable = sheet.tables.add(functionsHeaderRange, true);
                functionsTable.name = "Boardflare_Functions";

                // Protect the worksheet immediately after creation
                sheet.protection.protect();

                await context.sync();
            }

            // Unprotect sheet before making changes
            sheet.protection.unprotect();
            await context.sync();

            const functionsTable = sheet.tables.getItem("Boardflare_Functions");

            // Add new row to functions table
            const functionsRow = [[
                parsedCode.name,
                parsedCode.signature,
                parsedCode.description,
                parsedCode.code,
                null,  // Requirements
                parsedCode.testCases  // TestCases
            ]];

            functionsTable.rows.add(null, functionsRow);

            // Set wrap text for all columns except code
            functionsTable.getRange().format.wrapText = true;
            functionsTable.getRange().format.verticalAlignment = "top";

            // Set row height only for data rows
            const dataRange = functionsTable.getDataBodyRange();
            dataRange.format.rowHeight = 100;

            await context.sync();

            // Reprotect sheet after changes
            sheet.protection.protect();
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