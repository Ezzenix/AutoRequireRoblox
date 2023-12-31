import { readdirSync } from "fs";
import { basename, join, relative } from "path";
import { FileSystemWatcher, Uri } from "vscode";
import { COLLECTION_FILE_IDENTIFIER } from "../../constants";
import { fileStat, readFile, writeFile } from "../../utilities/fsWrapper";
import getGamePath from "../../utilities/getGamePath";
import { CollectionHandler } from "../handlers/collectionHandler";
import { Session } from "..";

type SubModule = {
	name: string;
	filePath: string;
	gamePath: string;
};

export class Collection {
	dirPath: string;
	collectionHandler: CollectionHandler;
	watcher: FileSystemWatcher;
	hasQueuedUpdate: boolean; // for batching updates

	constructor(dirPath: string, collectionHandler: CollectionHandler) {
		this.dirPath = dirPath;
		this.collectionHandler = collectionHandler;
		this.hasQueuedUpdate = false;

		this.updateFile();

		this.collectionHandler.collections.push(this);
	}

	isMyDirectoryValid() {
		const stat = fileStat(this.dirPath);
		if (!stat) return false;
		if (!stat.isDirectory) return false;

		const initFile = readFile(join(this.dirPath, "init.lua"));
		if (!initFile) return false;
		return (initFile as string).includes(COLLECTION_FILE_IDENTIFIER);
	}

	updateFile() {
		if (!this.isMyDirectoryValid()) {
			return this.dispose();
		}

		// Get subModules
		const subModules: SubModule[] = [];
		readdirSync(this.dirPath).forEach((subFile) => {
			if (!subFile.endsWith(".lua") || subFile === "init.lua") return;

			const filePath = join(this.dirPath, subFile);
			subModules.push({
				name: basename(filePath, ".lua"),
				filePath: filePath,
				gamePath: getGamePath(
					filePath,
					this.collectionHandler.session.rojoMap,
					this.collectionHandler.session.workspacePath,
					this.collectionHandler.session
				),
			});
		});

		// Get list of requires
		const requireList = subModules
			.map((subModule) => {
				return `	["${subModule.name}"] = require(${subModule.gamePath})`;
			})
			.join(",\n");

		/* prettier-ignore */
		const lines = [
			COLLECTION_FILE_IDENTIFIER,
			``,
			`return {\n${requireList}\n}`
		];

		const finalContent = lines.join("\n");

		const initPath = join(this.dirPath, "init.lua");
		const currentContent = readFile(initPath);
		if (currentContent !== finalContent) {
			writeFile(initPath, finalContent);
		}
	}

	fileChanged(uri: Uri) {
		if (this.hasQueuedUpdate) return;

		const isFileWithinCollection = relative(uri.fsPath, this.dirPath) === "..";

		if (isFileWithinCollection) {
			this.hasQueuedUpdate = true;
			setTimeout(() => {
				this.updateFile();
				this.hasQueuedUpdate = false;
			}, 500);
		}
	}

	dispose() {
		if (this.watcher && this.watcher.dispose) {
			this.watcher.dispose();
		}

		const collections = this.collectionHandler.collections;
		const indexOf = collections.indexOf(this);
		if (indexOf !== -1) {
			collections.splice(indexOf, 1);
		}
	}
}
