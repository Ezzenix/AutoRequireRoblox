import * as vscode from "vscode";
import * as SessionManager from "./sessionManager";
import * as QuickMenu from "./quickMenu";

export function activate(context: vscode.ExtensionContext) {
    // Silently attempt to initialize a new session
    SessionManager.Start(undefined, true);

    // Menu command
    context.subscriptions.push(vscode.commands.registerCommand("luna.menu", QuickMenu.Open));

    // Done
    console.log("luna activated");
}

export function deactivate() {
    SessionManager.CleanupAll();
}
