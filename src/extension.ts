import { join } from "path";
import { ExtensionContext, Uri, commands, window, workspace } from "vscode";
import { DEFAULT_CONFIG } from "./constants";
import { Session } from "./session/index";
import { fileExists, writeFile } from "./utilities/fsWrapper";

export function activate(context: ExtensionContext) {
	if (workspace.workspaceFolders && workspace.workspaceFolders.length >= 1) {
		const workspacePath = workspace.workspaceFolders[0].uri.fsPath;
		const session = new Session(context, workspacePath);
		context.subscriptions.push(session);
	}

	context.subscriptions.push(
		commands.registerCommand("autorequireroblox.config", () => {
			const wsPath = workspace.workspaceFolders[0]?.uri.fsPath;
			if (!wsPath) return;
			const configPath = join(wsPath, ".autorequire.json");

			if (fileExists(configPath)) {
				return window.showErrorMessage(`Configuration already exists at ${configPath}`);
			}

			if (writeFile(configPath, JSON.stringify(DEFAULT_CONFIG))) {
				const uri = Uri.file(configPath);
				if (uri) {
					window.showTextDocument(uri);
				}
				return window.showInformationMessage("Configuration successfully created");
			} else {
				return window.showErrorMessage("Something went wrong when creating configuration");
			}
		})
	);

	console.log("auto-require-roblox activated");
}

export function deactivate() {
	console.log("auto-require-roblox deactivated");
}
