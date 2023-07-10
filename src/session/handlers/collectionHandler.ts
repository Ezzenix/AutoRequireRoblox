import { readdirSync } from "fs";
import { join } from "path";
import { Uri } from "vscode";
import { Session } from "..";
import { COLLECTION_FILE_IDENTIFIER } from "../../constants";
import { fileStat, readFile } from "../../utilities/fsWrapper";
import { Collection } from "../classes/collection";

export class CollectionHandler {
	session: Session;
	collections: Collection[];

	constructor(session: Session) {
		this.session = session;
		this.collections = [];

		this.projectChanged();
	}

	private areCollectionsEnabled() {
		return this.session.configHandler.extensionConfig.storedValue.enableModuleCollection === true;
	}

	projectChanged() {
		if (!this.areCollectionsEnabled()) return;

		const directories = this.scanCollectionDirectories(join(this.session.workspacePath, "src"));

		// create new collections that should exist
		for (const dirPath of directories) {
			if (!this.collections.find((collection) => collection.dirPath === dirPath)) {
				new Collection(dirPath, this);
			}
		}

		// remove collections that should not exist
		for (const collection of this.collections) {
			if (!directories.includes(collection.dirPath)) {
				collection.dispose();
			}
		}
	}

	//
	documentChanged(uri: Uri) {
		setTimeout(() => {
			this.projectChanged();
		}, 200);
	}

	fileChanged(uri: Uri) {
		this.projectChanged();

		for (const collection of this.collections) {
			collection.fileChanged(uri);
		}
	}

	private disposeAllCollections() {
		for (const collection of this.collections) {
			collection.dispose();
		}
	}

	reload() {
		// recreate all collections, for the config setting
		this.disposeAllCollections();
		this.projectChanged();
	}

	dispose() {
		this.disposeAllCollections();
	}

	//
	scanCollectionDirectories(directoryPath: string): string[] {
		const directoryPaths: string[] = [];

		function search(directory: string) {
			const stat = fileStat(directory);
			if (!stat) return console.error(`scanCollectionDirectories failed because there is no file at ${directory}`);
			if (!stat.isDirectory())
				return console.error(`scanCollectionDirectories failed because file at ${directory} is not a directory`);

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
						directoryPaths.push(directory);
					}
				}
			}
		}

		search(directoryPath);
		return directoryPaths;
	}
}
