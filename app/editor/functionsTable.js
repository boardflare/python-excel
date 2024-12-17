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
                sheet.getRange("B:B").format.columnWidth = 150; // Description
                sheet.getRange("C:C").format.columnWidth = 300; // Code
                await context.sync();

                // Add title cell and merge
                const titleRange = sheet.getRange("A1:C1");
                titleRange.merge();
                titleRange.values = [["Table info here", "", ""]];
                titleRange.format.wrapText = true;

                // Create Functions table
                const functionsHeaderRange = sheet.getRange("A2:C2");
                functionsHeaderRange.values = [["Name", "Description", "Code"]];
                const functionsTable = sheet.tables.add(functionsHeaderRange, true);
                functionsTable.name = "Boardflare_Functions";

                // Protect the worksheet immediately after creation
                sheet.protection.protect();

                await context.sync();
            }

            // Unprotect sheet before making changes
            sheet.protection.unprotect();
            await context.sync();

            sheet.activate();
            const functionsTable = sheet.tables.getItem("Boardflare_Functions");

            // Add new row to functions table
            const functionsRow = [[
                parsedCode.name,
                parsedCode.description,
                parsedCode.code
            ]];

            functionsTable.rows.add(null, functionsRow);

            // Set wrap text for all columns except code
            functionsTable.getRange().format.wrapText = true;

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