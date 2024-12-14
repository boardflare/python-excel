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

    return Excel.run(async (context) => {
        // Check if name already exists and delete it
        try {
            const existingItem = context.workbook.names.getItem(parsedCode.name);
            existingItem.delete();
            await context.sync();
        } catch (error) {
            // Name doesn't exist, continue with creation
            if (error.code !== 'ItemNotFound') {
                throw error;
            }
        }

        // Add or update the name in the workbook
        const namedItem = context.workbook.names.add(parsedCode.name, parsedCode.formula);
        namedItem.visible = true;

        if (parsedCode.description) {
            namedItem.comment = parsedCode.description;
        }

        await context.sync();
    });
}