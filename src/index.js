const vscode = require("vscode");

const Session = require("./classes/session.js");

var sessions = [];

async function initialize(workspace, autoStart) {
    // For example: workspace = /c:/Users/Anton/Desktop/Dev

    // Attempt to find a workspace if none has been provided
    if (!workspace) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders && !workspaceFolders[0]) {
            if (!autoStart) {
                vscode.window.showErrorMessage("Failed to find workspace.");
            }
            return;
        }
        workspace = workspaceFolders[0].uri.fsPath;
    }

    var session;

    try {
        session = new Session(workspace, true);
    } catch (err) {
        console.warn(err);
        if (!autoStart) {
            vscode.window.showErrorMessage(err);
        }
        return;
    }

    sessions[workspace] = session;
    return session;
}

async function activate(context) {
    // Quietly attempt to initialize a new session on activation
    initialize(undefined, false);

    // Initialize startCommand
    const startCommand = vscode.commands.registerCommand("modulehelper.start", async () => {
        const activeTextEditor = vscode.window.activeTextEditor;
        if (!activeTextEditor) return vscode.window.showErrorMessage("No active text editor!");

        const documentUri = activeTextEditor.document.uri;
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(documentUri);
        if (!workspaceFolder) return vscode.window.showErrorMessage("No active workspace!");
        const workspace = workspaceFolder.uri.fsPath;

        var existingSession = sessions[workspace];
        var isRestart = false;
        if (existingSession) {
            isRestart = true;
            existingSession.cleanup();
            sessions[workspace] = undefined;
        }

        const session = initialize(workspace, false);
        if (session) {
            vscode.window.showInformationMessage(`${isRestart ? "Restarted" : "Started"} ModuleHelper`);
        }
    });
    context.subscriptions.push(startCommand);

    // Activated
    console.log("modulehelper activated");
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
