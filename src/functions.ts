import { normalize } from "path";
import { TextDocument } from "vscode";

export type ModuleInfo = {
	name: string;
	gamePath: string;
};

/** Returns all require expressions in a document */
export function findRequireExpressions(document: TextDocument): string[] {
	const importPattern = /^local\s+\w+\s+=\s+require\(.+\)$/gm;
	const existingImports: string[] = [];

	for (let i = 0; i < document.lineCount; i++) {
		const lineText = document.lineAt(i).text;
		if (importPattern.test(lineText)) {
			existingImports.push(lineText.trim());
		}
	}

	return existingImports;
}

export function MapRojoTree(rojoTree: any) {
	const rojoMap = {};
	function traverse(obj, parentPath = "") {
		for (let key in obj) {
			let value = obj[key];
			if (typeof value === "object") {
				// new directory
				const currentPath = parentPath ? `${parentPath}/${key}` : key;
				traverse(value, currentPath);
			} else if (key === "$path") {
				// path value
				rojoMap[`${normalize(value)}`] = parentPath.replace("/", ".");
			}
		}
	}
	traverse(rojoTree);
	return rojoMap;
}

export function getModules(): ModuleInfo[] {
	return [
		{
			name: "NumberUtil",
			gamePath: "ReplicatedStorage.common.NumberUtil",
		},
	];
}
