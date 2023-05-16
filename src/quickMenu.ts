import * as vscode from "vscode";
import * as pathModule from "path";
import * as Utils from "./utils";
import * as SessionManager from "./sessionManager";

// Get the 'version' from package.json
console.log(__dirname);
const packageJson = Utils.ReadFile(pathModule.join(__dirname, "..", "package.json"));
const version = packageJson ? packageJson.version : "<unknown>";

// Opens a QuickPickMenu in the current workspace
export function Open() {
    const workspace = Utils.GetActiveWorkspace();
    if (!workspace) return;

    // Create menu
    const menu = vscode.window.createQuickPick();
    menu.items = [
        {
            label: "Luna",
            detail: `You are using version ${version}`,
        },
        {
            label: `${SessionManager.Get(workspace) ? "Stop" : "Start"} Luna`,
            detail: SessionManager.Get(workspace)
                ? "Luna is not currently running. Select to start it."
                : "Luna is running in this project. Select to stop it.",
        },
        {
            label: `View on GitHub`,
            detail: `Open the GitHub page for help.`,
        },
    ];

    menu.onDidChangeSelection((selection) => {
        if (selection.length <= 0) return;
        const selectedItem: vscode.QuickPickItem = selection[0];

        if (!selectedItem || selectedItem.label == "Luna") return;
        menu.hide();

        switch (selectedItem.label) {
            case "Start Luna":
                SessionManager.Start(workspace, false);
                setTimeout(Open, 50);
                break;

            case "Stop Luna":
                SessionManager.Destroy(workspace);
                setTimeout(Open, 50);
                break;

            case "View on GitHub":
                vscode.env.openExternal(vscode.Uri.parse("https://github.com/Ezzenix/Luna"));
                break;
        }
    });

    menu.onDidHide(() => menu.dispose());
    menu.show();
}
