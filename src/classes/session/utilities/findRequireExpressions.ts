import { TextDocument } from "vscode";

/** Returns all require expressions in a document */
export default function findRequireExpressions(document: TextDocument): [string[], number?] {
	const importPattern = /.*require\([^)]+\).*/g;
	const existingImports: string[] = [];

	let firstOccurrenceLineCount = 0;

	for (let i = 0; i < document.lineCount; i++) {
		const lineText = document.lineAt(i).text;
		const match = lineText.match(importPattern);
		if (match) {
			existingImports.push(...match);
			firstOccurrenceLineCount = i;
		}
	}

	return [existingImports, firstOccurrenceLineCount];
}
