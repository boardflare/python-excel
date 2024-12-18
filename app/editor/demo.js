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

            // Set uniform column widths for 2 columns now
            sheet.getRangeByIndexes(0, 0, 1, 2).format.columnWidth = 100;

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
                const values = testCases.map((testCase, index) => {
                    // Generate dynamic formula based on actual args present
                    const rowIndex = index + 2; // +2 because 1-based and header row
                    let formula = parsedCode.named;
                    formula = formula.replace('arg1', typeof testCase.arg1 === 'string' ? `"${testCase.arg1}"` : testCase.arg1 || '');
                    if (testCase.arg2) formula = formula.replace('arg2', typeof testCase.arg2 === 'string' ? `"${testCase.arg2}"` : testCase.arg2);
                    if (testCase.arg3) formula = formula.replace('arg3', typeof testCase.arg3 === 'string' ? `"${testCase.arg3}"` : testCase.arg3);

                    return [
                        index + 1,                // Case number (1-based)
                        formula                   // Result formula
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