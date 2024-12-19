export async function addDemo(parsedCode) {
    return Excel.run(async (context) => {
        try {
            // Create sheet name based on function name
            const sheetName = `${parsedCode.name}_demo`;
            let sheet = context.workbook.worksheets.getItemOrNullObject(sheetName);
            await context.sync();

            // If sheet exists, delete it and recreate
            if (!sheet.isNullObject) {
                sheet.delete();
                await context.sync();
            }

            // Create new sheet
            sheet = context.workbook.worksheets.add(sheetName);
            await context.sync();

            // Set different column widths for Case and Result columns
            sheet.getRangeByIndexes(0, 0, 1, 1).format.columnWidth = 50;  // Case column
            sheet.getRangeByIndexes(0, 1, 1, 1).format.columnWidth = 300; // Result column

            // Set headers with new columns
            const headerRange = sheet.getRangeByIndexes(0, 0, 1, 2);
            headerRange.values = [["Case", "Result"]];

            // Format headers like a table
            headerRange.format.fill.color = "#D9D9D9";
            headerRange.format.font.bold = true;
            headerRange.format.borders.getItem('EdgeBottom').style = 'Continuous';

            // Parse test cases
            let testCases = [];
            try {
                testCases = JSON.parse(parsedCode.testCases);
            } catch (e) {
                console.error('Failed to parse test cases:', e);
                testCases = [];
            }

            // Add test cases
            if (testCases.length > 0) {
                const dataRange = sheet.getRangeByIndexes(1, 0, testCases.length, 2);
                const values = testCases.map((args, index) => {
                    // Generate dynamic formula based on number of arguments
                    const rowIndex = index + 2; // +2 because 1-based and header row
                    let formula = `=${parsedCode.name}(`;

                    // Convert each argument to proper string format
                    const formattedArgs = args.map(arg =>
                        typeof arg === 'string' ? `"${arg}"` : arg
                    );

                    formula += formattedArgs.join(', ') + ')';

                    return [
                        index + 1,    // Case number (1-based)
                        formula       // Result formula
                    ];
                });

                dataRange.values = values;
                dataRange.format.wrapText = true;
            }

            // Activate the sheet
            sheet.activate();
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