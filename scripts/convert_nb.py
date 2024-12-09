import nbconvert
import nbformat
from pathlib import Path

def create_frontmatter(title):
    return f"""---
title: {title}
---

"""

def notebook_to_markdown(ipynb_path, md_path):
    # Get title from filename
    title = Path(ipynb_path).stem
    
    # Read notebook
    with open(ipynb_path) as f:
        nb = nbformat.read(f, as_version=4)
    
    # Convert to markdown
    exporter = nbconvert.MarkdownExporter()
    body, _ = exporter.from_notebook_node(nb)
    
    # Add frontmatter
    content = create_frontmatter(title) + body
    
    # Write markdown file
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write(content)

def convert_all_notebooks(input_dir, output_dir):
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    
    for notebook_path in input_path.rglob("*.ipynb"):
        # Calculate relative path to maintain structure
        rel_path = notebook_path.relative_to(input_path)
        output_file = output_path / rel_path.with_suffix('.md')
        
        # Create parent directories if needed
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Convert notebook to markdown
        notebook_to_markdown(notebook_path, output_file)

# Usage example
convert_all_notebooks(r"C:\Users\brent\Code\functions\app\notebooks", r"C:\Users\brent\Code\website\pages\functions")