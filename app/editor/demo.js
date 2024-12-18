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

            // Set uniform column widths for 6 columns now
            sheet.getRangeByIndexes(0, 0, 1, 6).format.columnWidth = 100;

            // Set headers with new column
            const headerRange = sheet.getRangeByIndexes(0, 0, 1, 6);
            headerRange.values = [["Case", "Arg1", "Arg2", "Arg3", "Expected Result", "Actual Result"]];

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
                const dataRange = sheet.getRangeByIndexes(1, 0, testCases.length, 6);
                const values = testCases.map((testCase, index) => {
                    // Generate dynamic formula based on actual args present
                    const rowIndex = index + 2; // +2 because 1-based and header row
                    let formula = parsedCode.named.replace('[@Arg1]', `B${rowIndex}`);
                    if (testCase.arg2) formula = formula.replace(`B${rowIndex}`, `B${rowIndex},C${rowIndex}`);
                    if (testCase.arg3) formula = formula.replace(`B${rowIndex}`, `B${rowIndex},C${rowIndex},D${rowIndex}`);

                    return [
                        index + 1,                // Case number (1-based)
                        testCase.arg1 || '',      // Arg1
                        testCase.arg2 || '',      // Arg2
                        testCase.arg3 || '',      // Arg3
                        testCase.result || '',    // Expected result
                        formula                   // Actual result formula
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