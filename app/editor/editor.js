require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.0/min/vs' } });

Office.onReady().then(() => {
    require(['vs/editor/editor.main'], function () {
        const defaultCode = [
            'def foo(text):',
            '    """ This is a sample function. """',
            '    print(text)',
            '    return text.capitalize()',
        ].join('\n');

        const defaultTestCases = [
            '[',
            '    ["hello world"],',
            '    ["testing"]',
            ']'
        ].join('\n');

        // Initialize editors
        const editor = monaco.editor.create(document.getElementById('editor'), {
            value: defaultCode,
            language: 'python',
            theme: 'vs-dark',
            fontSize: 16,
            minimap: { enabled: false }
        });

        const testEditor = monaco.editor.create(document.getElementById('testEditor'), {
            value: defaultTestCases,
            language: 'json',
            theme: 'vs-dark',
            fontSize: 16,
            minimap: { enabled: false }
        });

        function showConfirmDialog(message, onConfirm) {
            const overlay = document.getElementById('confirmOverlay');
            const messageEl = document.getElementById('confirmMessage');
            messageEl.textContent = message;
            overlay.style.display = 'block';

            const handleYes = () => {
                overlay.style.display = 'none';
                onConfirm();
                cleanup();
            };

            const handleNo = () => {
                overlay.style.display = 'none';
                cleanup();
            };

            const cleanup = () => {
                document.getElementById('confirmYes').removeEventListener('click', handleYes);
                document.getElementById('confirmNo').removeEventListener('click', handleNo);
            };

            document.getElementById('confirmYes').addEventListener('click', handleYes);
            document.getElementById('confirmNo').addEventListener('click', handleNo);
        }

        // Event Handlers
        Office.context.ui.addHandlerAsync(
            Microsoft.Office.WebExtension.EventType.DialogParentMessageReceived,
            function (arg) {
                try {
                    if (!arg.message) return;
                    const message = JSON.parse(arg.message);

                    if (message.type === 'functionsList') {
                        const dropdown = document.getElementById('functionDropdown');
                        dropdown.innerHTML = '<option value="">Select a function...</option>';

                        message.functions.forEach(func => {
                            if (func && func.name) {
                                const option = document.createElement('option');
                                option.value = func.name;
                                option.textContent = func.name;
                                dropdown.appendChild(option);
                            }
                        });
                    } else if (message.type === 'functionCode') {
                        editor.setValue(message.code || defaultCode);
                        testEditor.setValue(message.testCases || defaultTestCases);
                    }
                } catch (error) {
                    console.error('Error in dialog message handler:', error);
                }
            }
        );

        // Initialize by requesting function list
        Office.context.ui.messageParent(JSON.stringify({ action: 'getFunctionsList' }));

        // DOM event listeners
        document.getElementById('functionDropdown').onchange = function () {
            Office.context.ui.messageParent(JSON.stringify({
                action: 'getFunctionCode',
                name: this.value
            }));
        };

        document.getElementById('saveBtn').onclick = function () {
            const dropdown = document.getElementById('functionDropdown');
            const isEditingExisting = dropdown.value !== '';

            const saveFunction = () => {
                const messageData = {
                    code: editor.getValue(),
                    testCases: testEditor.getValue()
                };
                Office.context.ui.messageParent(JSON.stringify(messageData));
                this.disabled = true;
                this.setAttribute('disabled', 'disabled');
            };

            if (isEditingExisting) {
                showConfirmDialog(
                    `Are you sure you want to overwrite the function "${dropdown.value}" with your changes?`,
                    saveFunction
                );
            } else {
                saveFunction();
            }
        };

        document.getElementById('cancelBtn').onclick = function () {
            Office.context.ui.messageParent(JSON.stringify({ action: 'cancel' }));
        };
    });
});
