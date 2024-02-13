import { Session } from "../session";
import { readFile, writeFile } from "../utilities/fsWrapper";
import { SourcemapObject, getScripts } from "../utilities/sourcemap";

const COLLECTION_FILE_IDENTIFIER = "--@AutoRequireCollection";

export class CollectionHandler {
	session: Session;

	constructor(session: Session) {
		this.session = session;
	}

	update() {
		if (this.session.configHandler.extensionConfig.storedValue.enableModuleCollection !== true) return;

		const modules = this.getCollectionModules();

		for (const module of modules) {
			let requires = [];
			for (const child of module.children) {
				if (child.className !== "ModuleScript") continue;
				requires.push(`	["${child.name}"] = require(script["${child.name}"])`);
			}

			/* prettier-ignore */
			const lines = [
				COLLECTION_FILE_IDENTIFIER,
				``,
				`return {\n${requires.join(",\n")}\n}`
			];

			writeFile(`${this.session.workspacePath}\\${module.filePaths[0]}`, lines.join("\n"));
		}
	}

	getCollectionModules() {
		const modules: SourcemapObject[] = [];

		for (const script of getScripts(this.session.sourcemap)) {
			if (script.className !== "ModuleScript") continue;

			const source = readFile(`${this.session.workspacePath}\\${script.filePaths[0]}`);
			if (source) {
				if (source.startsWith(COLLECTION_FILE_IDENTIFIER)) {
					modules.push(script);
				}
			}
		}

		return modules;
	}
}
