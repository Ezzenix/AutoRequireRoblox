import * as vscode from "vscode";
import { Session } from "./session";

var Sessions: Session[] = [];

export function Start(workspace: string, isAutoStart?: boolean) {
    // For example: workspace = /c:/Users/_/Desktop/Dev

    // Attempt to find a workspace if none was provided
    if (!workspace) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || !workspaceFolders[0]) {
            if (!isAutoStart) {
                vscode.window.showErrorMessage("Could not find workspace.");
            }
            return;
        }
        workspace = workspaceFolders[0].uri.fsPath;
    }

    // Remove any existing session
    Destroy(workspace);

    // Make a new session
    var session: Session;
    try {
        session = new Session(workspace, isAutoStart);
    } catch (err: any) {
        if (!isAutoStart) {
            vscode.window.showErrorMessage(err.message);
        }
        return;
    }

    // Store the session and return it
    Sessions[workspace] = session;
    return session;
}

export function Destroy(workspace: string) {
    const session = Get(workspace);
    if (session) {
        session.cleanup();
        delete Sessions[workspace];
    }
}

export function Get(workspace: string): Session {
    return Sessions[workspace];
}

export function GetAll(): Session[] {
    return Sessions;
}

export function CleanupAll() {
    for (let workspace in Sessions) {
        Destroy(workspace);
    }
}
