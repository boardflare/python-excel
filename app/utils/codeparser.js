export function parsePython(code) {
    if (typeof code !== 'string') {
        throw new TypeError('Code must be a string');
    }
    console.log('Parsing code:', code);

    // Improved function pattern to better handle whitespace
    const functionMatch = code.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([\s\S]*?)\)\s*:/);
    if (!functionMatch) throw new Error("No function definition found");

    const name = functionMatch[1].toUpperCase();
    const args = functionMatch[2].split(',').filter(arg => arg.trim());

    // Enhanced docstring pattern to handle both styles and line endings
    const docstringMatch = code.match(/^\s*(?:'''|""")([^]*?)(?:'''|""")|^\s*["'](.+?)["']/m);
    const docstring = docstringMatch
        ? (docstringMatch[1] || docstringMatch[2]).trim().split(/[.!?](?:\s|$)/)[0].trim()
        : 'No description available';

    // Extract example - handle comments and multi-line
    const exampleMatch = code.match(/^#?\s*example\s*=\s*["'](.+?)["']/m);
    const example = exampleMatch ? exampleMatch[1] : '';

    // Generate result string with appropriate number of args
    const argList = args.map((_, index) => `arg${index + 1}`).join(', ');

    // Append result line to code string
    code = code.trim() + `\n\nresult = ${name.toLowerCase()}(${argList})`; // Add result as last line

    return {
        name,
        signature: `${name}(${functionMatch[2]})`,
        description: docstring,
        code,
        example
    };
}