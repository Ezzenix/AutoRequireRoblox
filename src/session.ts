import * as vscode from "vscode";
import { join, normalize, basename, dirname } from "path";
import * as Utils from "./utils.js";

const defaultConfig = Utils.ReadFile(join(__dirname, "..", "src", "defaultConfig.json"), true);
const moduleFormat = Utils.ReadFile(join(__dirname, "..", "src", "moduleFormat.txt"), true);

const fallbackDirectory = {
	path: "*",
	name: "__FALLBACK",
	restricted: false,
	makeCategory: false,
	loadOrder: 100,
};

type Directory = {
	path: string;
	name: string;
	restricted?: string | boolean;
	makeCategory?: boolean;
	loadOrder?: number;
};

type Config = {
	modulePath: string;
	rojoProject: string;
	variableName: string;
	directories: Directory[];
};

type File = {
	type: "module" | "directory";
	name: string;
	path: string;
	children?: File[];
	deep?: boolean;
	parent?: File;
};

type ComputedModule = {
	name: string;
	dir: Directory;
	requireStatement: string;
	index: string;
	path: string;
	dependencies: string[];
	accessString: string;
};

export class Session {
	workspace: string;
	config: Config;
	rojoConfig: any;
	rojoMap: any;
	watcher: vscode.FileSystemWatcher;

	constructor(workspace: string, isAutoStart: boolean) {
		this.workspace = normalize(workspace);

		// Make sure a src folder exists
		if (!this.fileExists(`src`)) {
			throw new Error(`No src folder found.`);
		}

		// Look for own configuration
		this.config = this.readFile(`.luna.json`);
		if (!this.config) {
			if (!isAutoStart) {
				this.writeFile(".luna.json", defaultConfig);
				const p = vscode.Uri.file(`${this.workspace}/.luna.json`);
				if (p) {
					vscode.window.showTextDocument(p);
				}
			}
			throw new Error(`Could not find configuration so created one for you. Please modify it and try again.`);
		} else {
			// validate the config
			this.config.directories = this.config.directories.map((dir) => {
				const path = join(this.workspace, "src", dir.path);

				const pathSplit = path.split("\\");
				const name = pathSplit[pathSplit.length - 1];

				const restricted =
					!dir.restricted || typeof dir.restricted != "string"
						? false
						: dir.restricted.toString().toUpperCase();

				return {
					path: path,
					name: name,
					restricted: restricted,
					makeCategory: dir.makeCategory == true,
					loadOrder: dir.loadOrder || 100,
				};
			});
			this.config.directories.sort((a, b) => b.path.length - a.path.length);
		}

		// Look for rojo configuration
		this.rojoConfig = this.readFile(`${this.config.rojoProject}.json`);
		if (!this.rojoConfig) {
			throw new Error(`Could not find rojo project ${this.config.rojoProject}.`);
		}

		// Create a rojoTreeMap
		this.rojoMap = Utils.MapRojoTree(this.rojoConfig.tree);

		// Create fileSystemWatcher
		const watcher = vscode.workspace.createFileSystemWatcher("**", false, false, false);
		const refreshFunc = this.refresh.bind(this);
		watcher.onDidChange(refreshFunc);
		watcher.onDidCreate(refreshFunc);
		watcher.onDidDelete(refreshFunc);
		this.watcher = watcher;
		refreshFunc();
	}

	getFileDir(file: File): Directory {
		// Look for the directory
		for (const dir of this.config.directories) {
			if (file.path.startsWith(dir.path)) {
				return dir;
			}
		}

		// Return fallback
		return fallbackDirectory;
	}

	computeModules(): ComputedModule[] {
		const computed: ComputedModule[] = [];

		const session = this;
		const variableName = session.config.variableName;
		const fileMap = Utils.BuildFileMap(`${this.workspace}/src`);

		function traverseFiles(files: File[]) {
			files.forEach((file) => {
				if (file.path == join(session.workspace, "src", session.config.modulePath) + ".lua") return; // do not add our own module

				if (file.type == "directory") {
					traverseFiles(file.children);
					return;
				}

				const dir = session.getFileDir(file);
				const gamePath = Utils.GetGamePath(file.path, session.rojoMap);
				const moduleName = basename(file.name, ".lua");

				let index: string;
				if (dir.makeCategory) {
					index = dir.name;
				}

				computed.push({
					name: moduleName,
					dir: dir,
					requireStatement: `require(${gamePath})`,
					index: index,
					path: file.path,
					dependencies: [],
					accessString: `${variableName}.${index && index != "" ? `${index}.` : ""}${moduleName}`,
				});
			});
		}
		traverseFiles(fileMap);

		// sort by loadOrder: lowest to highest
		computed.sort((a, b) => {
			return a.dir.loadOrder - b.dir.loadOrder;
		});

		// check dependencies
		computed.forEach((module: ComputedModule) => {
			const fileContent = Utils.ReadFile(module.path);
			if (!fileContent) return;

			const lines = fileContent.split("\n");
			lines.forEach((line: string) => {
				if (!line.startsWith(variableName)) return;

				computed.forEach((otherModule: ComputedModule) => {
					if (line.startsWith(otherModule.accessString)) {
						if (!module.dependencies.includes(otherModule.path)) {
							module.dependencies.push(otherModule.path);
						}
					}
				});
			});
		});

		// sort by dependencies
		const MAX_ATTEMPTS = 250;
		let sortAttempts = 0;
		let sortCompleted = false;
		let previousIteration: ComputedModule[] = [];

		function doSort() {
			for (let index = 0; index < computed.length; index++) {
				for (let otherIndex = index + 1; otherIndex < computed.length; otherIndex++) {
					const module = computed[index];
					const otherModule = computed[otherIndex];

					if (module.dependencies.includes(otherModule.path)) {
						Utils.ArraySwap(computed, otherIndex, index);
						previousIteration = [module, otherModule];
						return true;
					}
				}
			}

			return false;
		}

		while (sortCompleted == false && sortAttempts <= MAX_ATTEMPTS) {
			const didAnything = doSort();
			if (!didAnything) {
				sortCompleted = true;
			}
			sortAttempts++;
		}
		if (sortAttempts >= MAX_ATTEMPTS) {
			vscode.window.showInformationMessage(
				`Luna: Detected possible circular dependency with "${previousIteration[0].name}" and "${previousIteration[1].name}"`
			);
		}

		// return final modules
		return computed;
	}

	// Refreshes everything
	refresh(uri?: vscode.Uri) {
		// don't detect our own changes
		if (uri && uri.path.endsWith(`/src/${this.config.modulePath}.lua`)) return;

		// Check if an unknown module already exists to prevent overwrite
		var exists = this.readFile(`src/${this.config.modulePath}.lua`);
		if (exists && !exists.includes("Generated by the Luna extension") && exists != "") {
			vscode.window.showErrorMessage(
				`Luna: Could not write! Found an already existing file at the specified path, cancelled to prevent overwrite.`
			);
			return;
		}

		const startDate = new Date();

		const session = this;
		const computed = this.computeModules();

		const requireLines = [];
		const categories = {};
		function addCategory(name) {
			// name can have seperator .
			const splitName: string[] = name.split(".");
			if (splitName.length <= 0) return;
			for (let i = 0; i < splitName.length; i++) {
				const completeToNow = splitName.slice(0, i + 1).join(".");
				if (categories[completeToNow]) continue;
				categories[completeToNow] = true;
				requireLines.push(`modules.${completeToNow} = {}`);
			}
		}

		computed.forEach((module) => {
			if (module.index) {
				addCategory(module.index);
			}

			const prefix = `modules${module.index ? "." + module.index : ""}.${module.name}`;
			let line = `${prefix} = ${module.requireStatement}`;

			const restrictedFormat = `if game:GetService("RunService"):Is(SIDE)() then\n	(LINE)\nend`;
			if (module.dir.restricted == "SERVER") {
				line = restrictedFormat.replace("(SIDE)", "Server").replace("(LINE)", line);
			} else if (module.dir.restricted == "CLIENT") {
				line = restrictedFormat.replace("(SIDE)", "Client").replace("(LINE)", line);
			}

			requireLines.push(line);
		});

		const timeTaken = new Date().getTime() - startDate.getTime();

		const content = moduleFormat
			.replace("--REQUIRE_HERE", requireLines.join("\n").replace(/\n/g, "\n	"))
			.replace("(TIME)", `${Math.floor(timeTaken)}ms`)
			.replace("(STARTDATE)", startDate)
			.replace("(MODULES_AMOUNT)", computed.length);

		this.writeFile(`src/${session.config.modulePath}.lua`, content);
	}

	cleanup() {
		this.watcher.dispose();
	}

	writeFile(path: string, contents: string) {
		return Utils.WriteFile(`${this.workspace}/${path}`, contents);
	}
	readFile(path: string) {
		return Utils.ReadFile(`${this.workspace}/${path}`);
	}
	fileExists(path: string) {
		return Utils.FileExists(`${this.workspace}/${path}`);
	}
}
