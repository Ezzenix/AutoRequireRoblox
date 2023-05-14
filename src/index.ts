import * as vscode from "vscode";
import * as pathModule from "path";
import { Session } from "./classes/session";
import * as Utils from "./utils";

const packageJson = Utils.ReadFile(pathModule.join(__dirname, "package.json"));
const version = packageJson ? packageJson.version : "<unknown>";

var sessions: any = [];

function initialize(workspace?: string, autoStart?: boolean) {
    // For example: workspace = /c:/Users/_/Desktop/Dev

    // Attempt to find a workspace if none was provided
    if (!workspace) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || !workspaceFolders[0]) {
            if (!autoStart) {
                vscode.window.showErrorMessage("Could not find workspace.");
            }
            return;
        }
        workspace = workspaceFolders[0].uri.fsPath;
    }

    // Make a new session
    var session;
    try {
        session = new Session(workspace, autoStart);
    } catch (err: any) {
        if (!autoStart) {
            vscode.window.showErrorMessage(err.message);
        }
        return;
    }

    // Store the session and return it
    sessions[workspace] = session;
    return session;
}

function removeSession(workspace: string) {
    let session = sessions[workspace];
    if (session) {
        session.cleanup();
        delete sessions[workspace];
    }
}

export function activate(context: vscode.ExtensionContext) {
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
                //iconPath: {
                //    dark: Uri.file(pathModule.join(__dirname, "..", "assets", "Moon_128.png")),
                //    light: Uri.file(pathModule.join(__dirname, "..", "assets", "Moon_128.png")),
                //},
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

        menu.onDidChangeSelection((selection) => {
            if (selection.length <= 0) return;
            const selectedItem: vscode.QuickPickItem = selection[0];

            if (!selectedItem || selectedItem.label == "Luna") return;
            menu.hide();

            switch (selectedItem.label) {
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

        menu.onDidHide(() => menu.dispose());
        menu.show();
    }

    // Initialize startCommand
    const disposable = vscode.commands.registerCommand("luna.menu", () => {
        openMenu();
    });

    context.subscriptions.push(disposable);
    console.log("luna activated");
}

export function deactivate() {
    // Remove all sessions
    for (let workspace in sessions) {
        removeSession(workspace);
    }
}
