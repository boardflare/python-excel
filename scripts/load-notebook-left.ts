// Office script to extract data from a Jupyter notebook and create an Excel sheet with the extracted data.

async function main(workbook: ExcelScript.Workbook) {
    // Step 1: Get the URL from cell A1 of the first worksheet.
    let currentSheet: ExcelScript.Worksheet = workbook.getActiveWorksheet();
    let url: string = currentSheet.getRange("B3").getValue() as string;

    // Step 2: Fetch the content of the notebook from the URL.
    let fetchResult: Response = await fetch(url);
    let notebookContent: NotebookContent = await fetchResult.json();
    console.log(notebookContent);

    // Step 3: Parse the JSON content of the notebook.
    let cells: NotebookCell[] = notebookContent.cells;
    console.log(cells);

    // Step 4: Extract title, overview, and compatibility from the notebook cells.
    let title: string = extractTitle(cells);
    let overview: string = extractOverview(cells);
    console.log(overview);
    //let compatibility: string = extractCompatibility(cells).join(' ');

    // Set the extracted title to cell B1
    currentSheet.getRange("B1").setValue(title);

    // Set the extracted overview to cell B7
    currentSheet.getRange("B7").setValue(overview);

    // Set the extracted compatibility to cell B6
    //currentSheet.getRange("B6").setValue(compatibility);

    // Add after the initial extractions:
    console.log("=== Extracted Basic Information ===");
    console.log("Title:", title);
    console.log("Overview:", overview);
    //console.log("Compatibility:", compatibility);

    // Step 5: Extract code, arguments, headers, and docstring from the notebook cells.
    let code: string = "";
    let args: unknown[] = [];
    let headers: string[] = [];
    let docstring: string = "";

    for (let cell of cells) {
        if (cell.metadata?.tags?.includes("function")) {
            code = cell.source.join('');
        }
        for (let i = 1; i <= 5; i++) {
            if (cell.metadata?.tags?.includes(`arg${i}`)) {
                args[i - 1] = extractValue(cell);
            }
        }
        if (cell.metadata?.tags?.includes("headers")) {
            headers = extractValue(cell) as string[];
        }
        if (cell.metadata?.tags?.includes("docstring")) {
            docstring = extractDocstring(cell);
        }
    }

    // Add after the cell loop that extracts code, args, headers and docstring:
    console.log("\n=== Extracted Function Details ===");
    console.log("Code:", code);
    console.log("Arguments:", args);
    console.log("Headers:", headers);
    //console.log("Docstring:", docstring);

    // Function to extract values for args and headers
    function extractValue(cell: NotebookCell): unknown {
        let output: string | undefined = cell.outputs?.[0]?.data?.["text/plain"]?.[0];
        if (output) {
            output = output.trim();

            // Remove leading and trailing quotes if present
            if (
                (output.startsWith("'") && output.endsWith("'")) ||
                (output.startsWith('"') && output.endsWith('"'))
            ) {
                output = output.slice(1, -1);
            }

            try {
                // Parse the output as JSON to handle arrays and objects
                return JSON.parse(output);
            } catch (e) {
                // Return the output as is if it's not valid JSON
                return output;
            }
        }
        return undefined;
    }

    // Function to extract and format the docstring
    function extractDocstring(cell: NotebookCell): string {
        let output: string | undefined = cell.outputs?.[0]?.data?.["text/plain"]?.[0];
        if (output) {
            output = output.trim();

            // Remove leading and trailing quotes if present
            if (
                (output.startsWith("'") && output.endsWith("'")) ||
                (output.startsWith('"') && output.endsWith('"'))
            ) {
                output = output.slice(1, -1);
            }

            // Replace escaped characters with actual characters
            output = output.replace(/\\n/g, '\n');
            output = output.replace(/\\t/g, '\t');
            output = output.replace(/\\\\/g, '\\');
            output = output.replace(/\\"/g, '"');
            output = output.replace(/\\'/g, "'");

            return output;
        }
        return '';
    }

    // Function to extract the title from the notebook cells
    function extractTitle(cells: NotebookCell[]): string {
        for (let cell of cells) {
            if (cell.cell_type === "markdown" && cell.source[0].startsWith("# ")) {
                return cell.source[0].substring(2).trim();
            }
        }
        return '';
    }

    // Function to extract the overview from the notebook cells
    function extractOverview(cells: NotebookCell[]): string {
        for (let cell of cells) {
            if (cell.cell_type === "markdown") {
                let overviewStarted = false;
                for (let line of cell.source) {
                    if (line.startsWith("## Overview")) {
                        overviewStarted = true;
                        continue;
                    }
                    if (overviewStarted) {
                        if (line.trim() !== "") {
                            return line.trim();
                        }
                    }
                }
            }
        }
        return '';
    }

    // Function to extract the compatibility from the notebook cells
    function extractCompatibility(cells: NotebookCell[]): string[] {
        for (let cell of cells) {
            if (cell.cell_type === "markdown") {
                let compatibilityStarted = false;
                let compatibility: string[] = [];
                for (let line of cell.source) {
                    if (line.startsWith("## Compatibility")) {
                        compatibilityStarted = true;
                        continue;
                    }
                    if (compatibilityStarted) {
                        if (line.trim() !== "") {
                            compatibility.push(line.trim());
                            if (compatibility.length === 2) {
                                return compatibility;
                            }
                        }
                    }
                }
            }
        }
        return ['', ''];
    }

    // Step 6: Add code from notebook.
    currentSheet.getRange("B20").setValue(code);
    currentSheet.getRange("B20").getFormat().setWrapText(true); // Set text wrap to true

    // Add before setting arg values:
    console.log("\n=== Setting Arguments ===");
    args.forEach((arg, index) => {
        console.log(`Argument ${index + 1}:`, arg);
    });

    // Helper function to set arg values to the worksheet
    function setArgValue(arg: unknown, column: string) {
        if (Array.isArray(arg) && Array.isArray(arg[0])) {
            const range = currentSheet.getRange(`${column}3`).getResizedRange(arg.length - 1, (arg[0] as unknown[]).length - 1);
            range.setValues(arg as (string | number | boolean)[][]);
            range.getFormat().setWrapText(false);
        } else {
            currentSheet.getRange(`${column}3`).setValue(arg as string | number | boolean);
        }
    }

    // Function to convert column index to Excel column letter
    function getColumnLetter(index: number): string {
        let letter = '';
        while (index >= 0) {
            letter = String.fromCharCode((index % 26) + 65) + letter;
            index = Math.floor(index / 26) - 1;
        }
        return letter;
    }

    // Set argument values dynamically
    for (let i = 0; i < args.length; i++) {
        setArgValue(args[i], getColumnLetter(3 + i)); // Columns start from D (index 3)
    }

    // Add before setting headers:
    console.log("\n=== Setting Headers ===");
    console.log("Headers to set:", headers);

    // Add headers to the worksheet starting at cell D2
    if (headers.length > 0) {
        const headerRange = currentSheet.getRange("D2").getResizedRange(0, headers.length - 1);
        headerRange.setValues([headers]);
        headerRange.getFormat().setWrapText(false);
    }
}

// Define the data types for the notebook content
interface NotebookContent {
    cells: NotebookCell[];
}

interface NotebookCell {
    cell_type: string;
    metadata: {
        tags: string[];
    };
    source: string[];
    outputs: Output[];
}

interface Output {
    data: {
        "text/plain": string[];
    };
    execution_count: number;
    metadata: object;
    output_type: string;
}