import { ExtensionContext, Uri, commands, window, workspace } from "vscode";
import { Session } from "./classes/session/index";
import { fileExists, readFile, writeFile } from "./utilities/fsWrapper";
import { join } from "path";

const defaultConfigPath = join(__dirname, "..", "src", "defaultConfig.json");
const defaultConfigRaw = readFile(defaultConfigPath, true);

export function activate(context: ExtensionContext) {
	const workspacePath = workspace.workspaceFolders[0].uri.fsPath;
	const session = new Session(context, workspacePath, JSON.parse(defaultConfigRaw));
	context.subscriptions.push(session);

	context.subscriptions.push(
		commands.registerCommand("autorequireroblox.config", () => {
			const wsPath = workspace.workspaceFolders[0]?.uri.fsPath;
			if (!wsPath) return;
			const configPath = join(wsPath, ".autorequire.json");

			if (fileExists(configPath)) {
				return window.showErrorMessage(`Configuration already exists at ${configPath}`);
			}

			if (writeFile(configPath, defaultConfigRaw)) {
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
