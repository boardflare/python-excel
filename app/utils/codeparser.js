export function parsePython(code) {
    if (typeof code !== 'string') {
        throw new TypeError('Code must be a string');
    }

    const functionMatch = code.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*?)\):/);
    if (!functionMatch) throw new Error("No function definition found");

    const name = functionMatch[1].toUpperCase();

    // Enhanced docstring parsing - extract only first sentence
    const docstringMatch = code.match(/"""([\s\S]*?)"""/);
    const docstring = docstringMatch
        ? docstringMatch[1].trim().split(/[.!?](?:\s|$)/)[0].trim()
        : 'No description available';

    // Extract example
    const exampleMatch = code.match(/example = "(.*?)"/);
    const example = exampleMatch ? exampleMatch[1] : '';

    return {
        name,
        signature: `${name}(${functionMatch[2]})`,
        description: docstring,
        code,
        example
    };
}