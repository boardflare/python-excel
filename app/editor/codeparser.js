export function parsePython(rawCode) {
    if (typeof rawCode !== 'string') {
        throw new TypeError('Code must be a string');
    }
    console.log('Parsing code:', rawCode);

    // Improved function pattern to better handle whitespace
    const functionMatch = rawCode.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([\s\S]*?)\)\s*:/);
    if (!functionMatch) throw new Error("No function definition found");

    const name = functionMatch[1].toUpperCase();
    const params = functionMatch[2].trim();
    const args = params.split(',').filter(arg => arg.trim());

    // Extract docstring with consistent trimming
    const docstringMatch = rawCode.match(/^\s*(?:'''|""")([^]*?)(?:'''|""")|^\s*["'](.+?)["']/m);
    const description = docstringMatch
        ? (docstringMatch[1] || docstringMatch[2]).trim().slice(0, 255)
        : 'No description available';

    // Extract example
    const exampleMatch = rawCode.match(/^#?\s*example\s*=\s*["'](.+?)["']/m);
    // const example = exampleMatch ? exampleMatch[1] : 'No example set in code';
    const arg1 = "this";

    // Generate result string
    const argList = args.map((_, index) => `arg${index + 1}`).join(', ');
    const code = `${rawCode.trim()}\n\nresult = ${name.toLowerCase()}(${argList})`;

    // Determine which runpy environment to use
    let runpyEnv = 'BOARDFLARE.RUNPY';
    if (window.location.hostname === 'localhost') {
        runpyEnv = 'LOCAL.RUNPY';
    } else if (window.location.pathname.toLowerCase().includes('preview')) {
        runpyEnv = 'PREVIEW.RUNPY';
    }

    // Create lambda formula with dynamic runpy environment and table references
    const escapedCode = code.replace(/"/g, '""');
    const signature = `${name}(${params})`;
    const formula = `=LAMBDA(${params}, ${runpyEnv}("${escapedCode}", ${params}))`;
    const runpy = `=${runpyEnv}("${escapedCode}", [@Arg1])`;
    const lambda = `${formula}([@Arg1])`;
    const named = `=${name}([@Arg1])`;

    return {
        name,
        signature,
        description,
        code,
        arg1,
        runpy,
        lambda,
        named,
        formula
    };
}