import {
	ExtensionContext,
	workspace,
	languages,
	Uri,
	CompletionItem,
	TextDocument,
	Position,
	Range,
	CompletionItemKind,
	CancellationToken,
	CompletionContext,
	TextEdit,
} from "vscode";
import * as fs from "fs";
import { findRequireExpressions, getModules } from "./functions";
import { Session } from "./session";
import { ConfigReader } from "./configReader";

export function activate(context: ExtensionContext) {
	console.log("extension activated");

	const session = new Session(context);
	context.subscriptions.push(session); // add the session as a subscription so its deleted when the extension deactivates for the workspace

	//const rojoConfigReader = new ConfigReader(context);

	// Rojo configuration
	let rojoConfig = undefined;
	function updateRojoConfig() {}

	// Create workspace file watcher
	const watcher = workspace.createFileSystemWatcher("**", false, false, false);
	watcher.onDidChange(fileChange);
	watcher.onDidCreate(fileChange);
	watcher.onDidDelete(fileChange);
	fileChange();

	// Handle file changes
	function fileChange(uri?: Uri) {}

	function provideCompletionItems(
		document: TextDocument,
		position: Position,
		token: CancellationToken,
		context: CompletionContext
	) {
		return getModules().map((module) => {
			const { name, gamePath } = module;

			const requireExpression = `local ${name} = require(${module.gamePath})`;

			const insertRequireEdit = new TextEdit(
				new Range(new Position(0, 0), new Position(0, 0)),
				requireExpression + `\n`
			);

			const allRequireExpressions = findRequireExpressions(document);
			const requireExists = allRequireExpressions.includes(requireExpression);

			setTimeout(() => {
				console.log(allRequireExpressions, requireExists);
			}, 10);

			let item = new CompletionItem(name, CompletionItemKind.Module);
			item.detail = `Require and use the ${name} module`;
			item.preselect = true;
			item.sortText = "!!!!!";

			item.additionalTextEdits = requireExists ? [] : [insertRequireEdit]; // insert require expression if it doesn't exist

			return item;
		});
	}

	// Register the item completion provider
	context.subscriptions.push(
		languages.registerCompletionItemProvider({ language: "lua" }, { provideCompletionItems }, ".")
	);
}

export function deactivate() {
	console.log("extension deactivated");
}
