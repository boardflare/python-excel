https://learn.microsoft.com/en-us/office/dev/add-ins/develop/persisting-add-in-state-and-settings#custom-properties-in-excel-and-word

```javascript

export async function codePy(prompt, arg1) {
    const context = new Excel.RequestContext();

    // Get all settings
    const settings = context.workbook.settings;
    settings.load("items");

    // Sync to get values
    await context.sync();

    // Log regular output
    console.log("Regular forEach output:");
    settings.items.forEach(setting => {
        console.log(setting.key, setting.value);
    });

    // Log JSON output
    console.log("JSON output:");
    const jsonOutput = settings.toJSON();
    console.log(JSON.stringify(jsonOutput, null, 2));

    // create largeString with 100000 characters of letter 'a'
    const largeString = "a".repeat(1000000);
    settings.add("largeString", largeString);

    // Sync to save the new setting
    await context.sync();


    return [["Done"]];
}

```