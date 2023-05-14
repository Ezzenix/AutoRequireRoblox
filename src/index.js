const vscode = require("vscode");
const pathModule = require("path");
const Session = require("./classes/session.js");
const utils = require("./utils.js");

const version = require("../package.json").version;

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
        const actionText =
            action == "Start"
                ? "Luna is not currently running. Select to start it."
                : "Luna is running in this project. Select to stop it.";

        const menu = vscode.window.createQuickPick();
        menu.items = [
            {
                label: "Luna",
                detail: `You are using version ${version}`,
            },
            {
                label: `${action} Luna`,
                detail: actionText,
            },
            {
                label: `View on GitHub`,
                detail: `Open the GitHub page for help.`,
            },
        ];

        menu.onDidHide(() => menu.dispose());

        menu.onDidChangeSelection((selection) => {
            selection = selection[0];
            if (!selection || selection.label == "Luna") return;
            menu.hide();

            switch (selection.label) {
                case "Start Luna":
                    initialize(workspace, false);
                    setTimeout(openMenu, 50);
                    break;

                case "Stop Luna":
                    removeSession(workspace);
                    setTimeout(openMenu, 50);
                    break;

                case "View on GitHub":
                    vscode.env.openExternal(vscode.Uri.parse("https://github.com/Ezzenix/Luna"));
                    break;
            }
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
