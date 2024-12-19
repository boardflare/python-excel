const MAX_RETRIES = 3;

export async function updateFunctionsTable(parsedCode) {
    let retryCount = 0;

    while (retryCount < MAX_RETRIES) {
        try {
            return await Excel.run(async (context) => {
                try {
                    // Initial context validation
                    await context.sync();

                    // Load worksheets with error handling
                    const worksheets = context.workbook.worksheets;
                    worksheets.load("items/name");
                    await context.sync();

                    // Get or create sheet
                    let sheet = worksheets.getItemOrNullObject("Boardflare_Functions");
                    await context.sync();

                    if (sheet.isNullObject) {
                        sheet = worksheets.add("Boardflare_Functions");
                        await context.sync();

                        // Initialize new sheet
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

                    // Verify sheet exists before proceeding
                    if (!sheet || sheet.isNullObject) {
                        throw new Error("Failed to access Boardflare_Functions worksheet");
                    }

                    // Unprotect sheet before making changes
                    sheet.protection.unprotect();
                    await context.sync();

                    const functionsTable = sheet.tables.getItem("Boardflare_Functions");

                    // Check for existing rows with the same function name
                    const tableRange = functionsTable.getDataBodyRange();
                    const nameColumn = tableRange.getColumn(0);
                    nameColumn.load("values");
                    await context.sync();

                    // Find and delete existing row with same name
                    const values = nameColumn.values;
                    for (let i = 0; i < values.length; i++) {
                        if (values[i][0] === parsedCode.name) {
                            functionsTable.rows.getItemAt(i).delete();
                            break;
                        }
                    }
                    await context.sync();

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

                    return true;

                } catch (innerError) {
                    if (innerError.code === "InvalidRequestContext") {
                        console.log(`Retry ${retryCount + 1}/${MAX_RETRIES}: InvalidRequestContext error`);
                        throw innerError; // Propagate to outer catch for retry
                    }
                    throw innerError;
                }
            });
        } catch (error) {
            retryCount++;
            if (retryCount >= MAX_RETRIES || error.code !== "InvalidRequestContext") {
                console.error("Final operation failed:", {
                    message: error.message,
                    code: error.code,
                    debugInfo: error.debugInfo,
                    retryCount
                });
                throw error;
            }
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
    }
}