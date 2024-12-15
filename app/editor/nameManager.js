export async function updateNameManager(parsedCode) {
    const platform = Office?.context?.platform || 'Unknown';
    const maxFormulaLength = platform === 'OfficeOnline' ? 255 : 8190;

    if (parsedCode.formula.length > maxFormulaLength) {
        const message = platform === 'OfficeOnline'
            ? "Excel on Web named formulas are limited to 255 characters. Function saved to worksheet only - use BOARDFLARE.RUNPY as shown."
            : "Excel desktop named formulas are limited to 8190 characters. Function saved to worksheet only - use BOARDFLARE.RUNPY as shown.";
        progress.textContent = message;
        progress.style.color = "orange";
        return;
    }


    // Create link to workbook
    const url = Office.context.document.url;
    console.log("Workbook URL:", url);

    return Excel.run(async (context) => {
        let namedItem;

        // Try to get existing name
        try {
            namedItem = context.workbook.names.getItem(parsedCode.name);
            await context.sync();

            // Update existing name
            namedItem.formula = parsedCode.formula;
        } catch (error) {
            // Create new name if it doesn't exist
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
    });
}