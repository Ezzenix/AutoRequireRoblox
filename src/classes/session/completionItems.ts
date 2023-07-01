import { CancellationToken, CompletionContext, CompletionItem, CompletionItemKind, Position, Range, TextDocument, TextEdit } from "vscode";
import findRequireExpressions from "./utilities/findRequireExpressions";
import { ModuleInfo } from "./scanModules";

/** Creates a TextEdit that inserts a require line if it doesn't already exist */
function makeInsertRequireEdit(module: ModuleInfo, document: TextDocument): TextEdit | undefined {
	const fullRequireLine = `local ${module.name} = require(${module.gamePath})`;
	const [allRequires, firstOccurence] = findRequireExpressions(document);

	if (!allRequires.includes(fullRequireLine)) {
		const insertPos = new Position(firstOccurence + 1, 0);
		const range = new Range(insertPos, insertPos);
		return new TextEdit(range, fullRequireLine + `\n`);
	}
	return;
}

export default function completionItems(
	document: TextDocument,
	position: Position,
	token: CancellationToken,
	context: CompletionContext,
	modules: ModuleInfo[],
	workspacePath: string
) {
	// Filter visible modules
	const userTypedText = document.getText(new Range(position.with(undefined, 0), position)).toLowerCase();
	if (!userTypedText || userTypedText.trim() === "" || userTypedText.endsWith(".")) return [];
	const filteredModules = modules.filter((module) => {
		if (module.filePath === document.uri.fsPath) return false; // filter out the module you are currently writing in
		return module.name.toLowerCase().startsWith(userTypedText);
	});

	// Create completion items
	return filteredModules.map((module) => {
		const insertRequireEdit = makeInsertRequireEdit(module, document);

		const displayPath = module.filePath.slice(workspacePath.length + 5).replace(/\\/g, "/"); // cut out the beginning of the path so its relative to src

		let item = new CompletionItem(module.name, CompletionItemKind.Module);
		item.detail = `${module.name}: ${displayPath}`;
		item.documentation = `Require and use the ${module.name} module.`;
		//item.preselect = true;
		//item.sortText = "!!!!!";

		item.additionalTextEdits = insertRequireEdit ? [insertRequireEdit] : []; // insert require expression if it doesn't exist
		return item;
	});
}