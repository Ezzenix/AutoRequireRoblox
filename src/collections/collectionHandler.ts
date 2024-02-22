import { Session } from "../session";
import { readFile, writeFile } from "../utilities/fsWrapper";
import { Instance, InstanceUtil, SourcemapUtil } from "../utilities/sourcemap";

const COLLECTION_FILE_IDENTIFIER = "--@AutoRequireCollection";

export class CollectionHandler {
	session: Session;

	constructor(session: Session) {
		this.session = session;
	}

	/* Updates all collection modules */
	update() {
		if (this.session.configHandler.extensionConfig.storedValue.enableModuleCollection !== true) return;

		const modules = this.getCollectionModules();

		for (const module of modules) {
			let requires: string[] = [];
			for (const child of module.children) {
				if (child.className !== "ModuleScript") continue;

				if (child.name.includes(" ")) {
					requires.push(`	["${child.name}"] = require(script["${child.name}"])`);
				} else {
					requires.push(`	${child.name} = require(script.${child.name})`);
				}
			}
			requires.sort(function (a, b) {
				if (a < b) {
					return -1;
				}
				if (a > b) {
					return 1;
				}
				return 0;
			});

			/* prettier-ignore */
			const lines = [
				COLLECTION_FILE_IDENTIFIER,
				``,
				`return {\n${requires.join(",\n")}\n}`
			];

			const filePath = `${this.session.workspacePath}\\${InstanceUtil.getFilePath(module)}`;
			const newSource = lines.join("\n");
			const currentSource = readFile(filePath, true);
			if (currentSource === newSource) continue;
			writeFile(`${this.session.workspacePath}\\${InstanceUtil.getFilePath(module)}`, lines.join("\n"));
		}
	}

	/* Gets all module instances that are collections */
	getCollectionModules() {
		const modules: Instance[] = [];

		for (const script of SourcemapUtil.getScripts(this.session.sourcemap)) {
			if (script.className !== "ModuleScript") continue;

			const moduleFilePath = InstanceUtil.getFilePath(script);
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
