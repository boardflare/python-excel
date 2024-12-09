from pathlib import Path
import json

def update_notebook_metadata(input_dir: str, output_dir: str):
    # Define target metadata
    new_metadata = {
        "kernelspec": {
            "display_name": "Pyodide",
            "language": "python",
            "name": "python"
        },
        "language_info": {
            "codemirror_mode": {
                "name": "python",
                "version": 3
            },
            "file_extension": ".py",
            "mimetype": "text/x-python",
            "name": "python",
            "nbconvert_exporter": "python",
            "pygments_lexer": "ipython3",
            "version": "3.12"
        }
    }

    # Create output directory
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    # Process all notebooks recursively
    input_path = Path(input_dir)
    for notebook_path in input_path.rglob("*.ipynb"):
        # Calculate relative path to maintain structure
        rel_path = notebook_path.relative_to(input_path)
        output_file = output_path / rel_path
        
        # Create parent directories if needed
        output_file.parent.mkdir(parents=True, exist_ok=True)

        # Read notebook
        with open(notebook_path, 'r', encoding='utf-8') as f:
            notebook = json.load(f)

        # Update metadata
        notebook['metadata'] = new_metadata

        # Write updated notebook
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(notebook, f, indent=2)

if __name__ == "__main__":
    # Example usage
    update_notebook_metadata(r"C:\Users\brent\Code\functions\app\notebooks", r"C:\Users\brent\Code\jupyterlite\files")