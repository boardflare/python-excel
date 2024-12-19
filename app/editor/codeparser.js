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

    // Create lambda formula with dynamic runpy environment and sheet references
    const signature = `${name}(${params})`;
    const codeRef = `LET(range,'Boardflare_Functions'!$A$2:$D$200,XLOOKUP("${name}",INDEX(range,,1),INDEX(range,,4),""))`;
    const formula = `=LAMBDA(${params}, ${runpyEnv}(${codeRef}, ${params}))`;

    return {
        name,
        signature,
        description,
        code,
        formula,
        named: `${name}(${args.map((_, index) => `arg${index + 1}`).join(', ')})`
    };
}