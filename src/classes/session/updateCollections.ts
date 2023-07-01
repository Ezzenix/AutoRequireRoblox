import { readdirSync } from "fs";
import { join, isAbsolute, basename } from "path";
import { fileStat, readFile, writeFile } from "../../utilities/fsWrapper";
import getGamePath from "./utilities/getGamePath";
import { Position, Range, TextEdit, Uri, WorkspaceEdit, workspace } from "vscode";

const COLLECTION_FILE_IDENTIFIER = "--@AutoRequireCollection";

type SubModule = {
	name: string;
	filePath: string;
	gamePath: string;
};

function scanCollectionFiles(directoryPath: string) {
	const initLuaFiles: string[] = [];

	function search(directory: string) {
		const files = readdirSync(directory);
		for (const file of files) {
			const filePath = join(directory, file);
			const fileStats = fileStat(filePath);
			if (!fileStats) continue;

			if (fileStats.isDirectory()) {
				search(filePath);
			} else if (file === "init.lua") {
				const content = readFile(filePath);
				if (content && content.includes(COLLECTION_FILE_IDENTIFIER)) {
					initLuaFiles.push(filePath);
				}
			}
		}
	}

	search(directoryPath);
	return initLuaFiles;
}

function scanModulesInCollection(collectionFile: string, rojoMap: any): SubModule[] {
	const modules: SubModule[] = [];

	const directoryPath = join(collectionFile, "..");
	readdirSync(directoryPath).forEach((subFile) => {
		if (!subFile.endsWith(".lua") || subFile === "init.lua") return;

		const filePath = join(directoryPath, subFile);
		modules.push({
			name: basename(filePath, ".lua"),
			filePath: filePath,
			gamePath: getGamePath(filePath, rojoMap),
		});
	});

	return modules;
}

export default function updateCollections(workspacePath: string, rojoMap: any) {
	const collectionFiles = scanCollectionFiles(workspacePath);

	collectionFiles.forEach((collectionFile) => {
		const subModules = scanModulesInCollection(collectionFile, rojoMap);

		const requireList = subModules
			.map((subModule) => {
				return `	["${subModule.name}"] = require(${subModule.gamePath})`;
			})
			.join(",\n");

		/* prettier-ignore */
		const lines = [
			COLLECTION_FILE_IDENTIFIER,
			"",
			`return {\n${requireList}\n}`
		];

		const finalContent = lines.join("\n");

		const currentContent = readFile(collectionFile);
		if (currentContent !== finalContent) {
			writeFile(collectionFile, finalContent);
		}
	});
}
