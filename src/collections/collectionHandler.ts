import { Session } from "../session";
import { readFile, writeFile } from "../utilities/fsWrapper";
import { SourcemapObject, getFilePath, getScripts } from "../utilities/sourcemap";

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

				if (child.name.includes(" ")) {
					requires.push(`	["${child.name}"] = require(script["${child.name}"])`);
				} else {
					requires.push(`	${child.name} = require(script.${child.name})`);
				}
			}

			/* prettier-ignore */
			const lines = [
				COLLECTION_FILE_IDENTIFIER,
				``,
				`return {\n${requires.join(",\n")}\n}`
			];

			writeFile(`${this.session.workspacePath}\\${getFilePath(module)}`, lines.join("\n"));
		}
	}

	getCollectionModules() {
		const modules: SourcemapObject[] = [];

		for (const script of getScripts(this.session.sourcemap)) {
			if (script.className !== "ModuleScript") continue;

			const moduleFilePath = getFilePath(script);
			if (!moduleFilePath.endsWith("init.luau") && !moduleFilePath.endsWith("init.lua")) {
				continue;
			}

			const source = readFile(`${this.session.workspacePath}\\${moduleFilePath}`);
			if (source && typeof source === "string") {
				if (source.startsWith(COLLECTION_FILE_IDENTIFIER)) {
					modules.push(script);
				}
			}
		}

		return modules;
	}
}
