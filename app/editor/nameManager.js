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
    console.log("Name manager props:", parsedCode.name, parsedCode.formula);

    return Excel.run(async (context) => {
        // Get named item or null object
        const namedItem = context.workbook.names.getItemOrNullObject(parsedCode.name);
        namedItem.load(['formula', 'comment', 'isNullObject']);
        await context.sync();

        if (namedItem.isNullObject) {
            // Create new name if it doesn't exist
            const newNamedItem = context.workbook.names.add(parsedCode.name, parsedCode.formula);
            newNamedItem.visible = true;
            if (parsedCode.description) {
                newNamedItem.comment = parsedCode.description;
            }
        } else {
            // Update existing name if formula is different
            if (namedItem.formula !== parsedCode.formula) {
                namedItem.formula = parsedCode.formula;
            }
            namedItem.visible = true;
            if (parsedCode.description && parsedCode.description !== namedItem.comment) {
                namedItem.comment = parsedCode.description;
            }
        }

        await context.sync();
    });
}