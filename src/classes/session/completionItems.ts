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
	modules: ModuleInfo[]
) {
	// Filter visible modules
	const userTypedText = document.getText(new Range(position.with(undefined, 0), position)).toLowerCase();
	if (!userTypedText || userTypedText.trim() === "" || userTypedText.endsWith(".")) return [];
	const filteredModules = modules.filter((module) => {
		module.name.toLowerCase().startsWith(userTypedText);
		return true;
	});

	// Create completion items
	return filteredModules.map((module) => {
		const insertRequireEdit = makeInsertRequireEdit(module, document);

		let item = new CompletionItem(module.name, CompletionItemKind.Module);
		item.detail = `Require and use the ${module.name} module`;
		item.preselect = true;
		item.sortText = "!!!!!";

		item.additionalTextEdits = insertRequireEdit ? [insertRequireEdit] : []; // insert require expression if it doesn't exist
		return item;
	});
}
