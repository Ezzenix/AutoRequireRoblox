const vscode = require("vscode");
const Session = require("./classes/session.js");
const utils = require("./utils.js");

var sessions = [];

function initialize(workspace, autoStart) {
    // For example: workspace = /c:/Users/Anton/Desktop/Dev

    // Attempt to find a workspace if none has been provided
    if (!workspace) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders && !workspaceFolders[0]) {
            if (!autoStart) {
                vscode.window.showErrorMessage("Could not find workspace.");
            }
            return;
        }
        workspace = workspaceFolders[0].uri.fsPath;
    }

    var session;

    try {
        session = new Session(workspace, autoStart);
    } catch (err) {
        if (!autoStart) {
            vscode.window.showErrorMessage(err.message);
        }
        return;
    }

    sessions[workspace] = session;
    return session;
}

function removeSession(workspace) {
    let session = sessions[workspace];
    if (session) {
        session.cleanup();
        delete sessions[workspace];
    }
}

function activate(context) {
    // Quietly attempt to initialize a new session on activation
    initialize(undefined, true);

    function openMenu() {
        // Get the workspace
        const activeTextEditor = vscode.window.activeTextEditor;
        if (!activeTextEditor) return;
        const documentUri = activeTextEditor.document.uri;
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(documentUri);
        if (!workspaceFolder) return;
        const workspace = workspaceFolder.uri.fsPath;

        // Create menu
        const action = sessions[workspace] ? "Stop" : "Start";

        const menu = vscode.window.createQuickPick();
        menu.items = [
            { label: "Luna", description: `v${require("../package.json").version}` },
            { label: `${action} Luna` },
        ];

        menu.onDidHide(() => menu.dispose());

        menu.onDidChangeSelection((selection) => {
            selection = selection[0];
            if (!selection || selection.label == "Luna") return;
            menu.hide();

            switch (selection.label) {
                case "Start Luna":
                    initialize(workspace, false);
                    break;

                case "Stop Luna":
                    removeSession(workspace);
                    break;
            }

            setTimeout(openMenu, 50);
        });

        menu.show();
    }

    // Initialize startCommand
    const disposable = vscode.commands.registerCommand("luna.menu", () => {
        openMenu();
    });

    context.subscriptions.push(disposable);
    console.log("luna activated");
}

function deactivate() {
    for (let workspace in sessions) {
        var session = sessions[workspace];
        if (session) {
            session.cleanup();
        }
    }
    sessions = [];
}

module.exports = {
    activate,
    deactivate,
};
