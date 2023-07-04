import { Position, Range, TextDocument, TextEdit } from "vscode";
import { ModuleInfo } from "../utilities/scanModules";

/**
 * Makes a require line from module
 */
export function getRequireStatement(module: ModuleInfo) {
	return `local ${module.name} = require(${module.gamePath})`;
}

/**
 * Returns true if specified module is being required in the document
 */
export function isRequiring(module: ModuleInfo, document: TextDocument) {
	const fullRequireLine = getRequireStatement(module);
	const [allRequires, _] = findAllRequires(document);
	return allRequires.includes(fullRequireLine);
}

/**
 * Returns linenumber of first require statement in document or -1
 */
export function getFirstRequireOccurence(document) {
	const [_, firstOccurence] = findAllRequires(document);
	return firstOccurence;
}

/**
 * Creates a TextEdit that inserts a require line if it doesn't already exist
 */
export function createRequireInsertEdit(module: ModuleInfo, document: TextDocument) {
	if (isRequiring(module, document)) return; // already has one

	const firstRequireOccurence = getFirstRequireOccurence(document);
	const insertPos = new Position(firstRequireOccurence + 1, 0);
	const range = new Range(insertPos, insertPos);
	return new TextEdit(range, getRequireStatement(module) + `\n`);
}

/**
 * Returns all require expressions in a document
 */
export function findAllRequires(document: TextDocument): [string[], number?] {
	const requirePattern = /.*require\([^)]+\).*/g;
	const existingRequires: string[] = [];

	let firstOccurrenceLineCount = -1;

	for (let i = 0; i < document.lineCount; i++) {
		const lineText = document.lineAt(i).text;
		const match = lineText.match(requirePattern);
		if (match) {
			existingRequires.push(...match);
			firstOccurrenceLineCount = i;
		}
	}

	return [existingRequires, firstOccurrenceLineCount];
}
