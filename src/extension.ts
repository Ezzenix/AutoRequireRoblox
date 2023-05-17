import * as vscode from "vscode";
import * as SessionManager from "./sessionManager";
import * as QuickMenu from "./quickMenu";
import { Session } from "./session";

export type State = {
    statusButton: vscode.StatusBarItem;
    context: vscode.ExtensionContext;
};

export function activate(context: vscode.ExtensionContext) {
    const state: State = {
        statusButton: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 250),
        context: context,
    };

    state.statusButton.text = "$(sparkle) Luna";
    state.statusButton.tooltip = "Click to open Luna menu.";
    state.statusButton.command = "luna.menu";
    state.statusButton.show();

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
