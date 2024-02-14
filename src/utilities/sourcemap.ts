import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { window } from "vscode";

export type SourcemapObject = {
	name: string;
	className: string;
	filePaths?: string[];
	parent?: SourcemapObject;
	children?: SourcemapObject[];
};

type SourcemapListener = (sourcemap: SourcemapObject) => void;

export function isScript(obj: SourcemapObject) {
	return obj.className === "ModuleScript" || obj.className === "LocalScript" || obj.className === "Script";
}

export function isDescendantOf(obj: SourcemapObject, parent: SourcemapObject) {
	if (obj === parent) return true;
	while (obj.parent && obj.parent !== parent) {
		obj = obj.parent;
	}
	return obj.parent !== undefined;
}

export function isSubModule(obj: SourcemapObject) {
	while (obj.parent) {
		if (obj.parent.className === "ModuleScript") return obj.parent;
		obj = obj.parent;
	}
	return false;
}

export function getServiceName(obj: SourcemapObject) {
	while (obj.parent) {
		if (!obj.parent.parent) return obj.name;
		obj = obj.parent;
	}
}

export function getFilePath(obj: SourcemapObject): string | undefined {
	if (!obj.filePaths || obj.filePaths.length === 0) return;

	for (const path of obj.filePaths) {
		if (!path.endsWith(".json")) {
			return path;
		}
	}
}

export function getScripts(sourcemap: SourcemapObject) {
	const scriptObjects: SourcemapObject[] = [];

	function iterate(object: SourcemapObject) {
		for (const obj of object.children) {
			if (isScript(obj)) {
				scriptObjects.push(obj);
			}

			if (obj.children) {
				iterate(obj);
			}
		}
	}
	iterate(sourcemap);

	return scriptObjects;
}

export class SourcemapWatcher {
	private rootPath: string;
	private process: ChildProcessWithoutNullStreams;
	private listeners: SourcemapListener[];

	constructor(rootPath: string) {
		this.rootPath = rootPath;
		this.listeners = [];
		this.startProcess();
	}

	private sourcemapChanged(text: string) {
		let obj: SourcemapObject;
		try {
			obj = JSON.parse(text);
		} catch (err) {
			console.error("Failed to parse sourcemap JSON");
			return;
		}

		const setupObj = (obj: SourcemapObject) => {
			// normalize paths
			if (obj.filePaths) {
				for (const i in obj.filePaths) {
					obj.filePaths[i] = obj.filePaths[i].replace(/\\/g, "\\").replace(/\//g, "\\"); // replace all '\\' with '\' & // replace all '/' with '\'
				}
			}

			// add parent property
			if (obj.children) {
				for (const child of obj.children) {
					child.parent = obj;
					setupObj(child);
				}
			}
		};
		setupObj(obj);

		for (const listener of this.listeners) {
			listener(obj);
		}
	}

	private startProcess() {
		if (this.process && !this.process.killed) {
			this.process.kill();
		}

		this.process = spawn("rojo", ["sourcemap", "--watch"], { cwd: this.rootPath });

		this.process.stdout.on("data", (data) => {
			this.sourcemapChanged(data.toString());
		});

		this.process.stderr.on("data", (data) => {
			console.error(`Error from sourcemap watcher: ${data.toString()}`);
			window.showErrorMessage(`Error from sourcemap watcher: ${data.toString()}`);
		});

		this.process.on("exit", (code) => {
			console.log(`rojo sourcemap process exited with code ${code}`);
		});
	}

	onChange(listener: SourcemapListener) {
		this.listeners.push(listener);
	}

	dispose() {
		if (this.process && !this.process.killed) {
			this.process.kill();
		}
	}
}
