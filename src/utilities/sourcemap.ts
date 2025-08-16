import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { window } from "vscode";

export type Instance = {
	name: string;
	className: string;
	filePaths?: string[];
	mainFilePath: string;
	parent?: Instance;
	children: Instance[];
};

type SourcemapListener = (sourcemap: Instance) => void;

export namespace InstanceUtil {
	export function isScript(instance: Instance) {
		return (
			instance.className === "ModuleScript" ||
			instance.className === "LocalScript" ||
			instance.className === "Script"
		);
	}

	export function isDescendantOf(instance: Instance, parent: Instance) {
		if (instance === parent) return true;
		while (instance.parent && instance.parent !== parent) {
			instance = instance.parent;
		}
		return instance.parent !== undefined;
	}

	export function getParentModule(instance: Instance) {
		while (instance.parent) {
			if (instance.parent.className === "ModuleScript") return instance.parent;
			instance = instance.parent;
		}
		return false;
	}

	export function getService(instance: Instance) {
		while (instance.parent) {
			if (!instance.parent.parent) return instance.name;
			instance = instance.parent;
		}
	}

	export function getFilePath(instance: Instance): string | undefined {
		if (!instance.filePaths || instance.filePaths.length === 0) return;

		for (const path of instance.filePaths) {
			if (!path.endsWith(".json")) {
				return path;
			}
		}
	}
}

export namespace SourcemapUtil {
	export function getScripts(sourcemap: Instance) {
		const scriptObjects: Instance[] = [];

		function iterate(object: Instance) {
			for (const obj of object.children) {
				if (InstanceUtil.isScript(obj)) {
					scriptObjects.push(obj);
				}

				iterate(obj);
			}
		}
		iterate(sourcemap);

		return scriptObjects;
	}
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
		let sourcemap: Instance;
		try {
			sourcemap = JSON.parse(text);
		} catch (err) {
			console.error("Failed to parse sourcemap JSON");
			return;
		}

		const setup = (instanace: Instance) => {
			// normalize paths
			if (instanace.filePaths) {
				for (const i in instanace.filePaths) {
					const path = instanace.filePaths[i].replace(/\\/g, "\\").replace(/\//g, "\\"); // replace all '\\' with '\' & // replace all '/' with '\'
					instanace.filePaths[i] = path;
					if (path.endsWith(".lua") || path.endsWith(".luau")) {
						instanace.mainFilePath = path;
					}
				}
			}

			if (!instanace.children) {
				instanace.children = [];
			}

			// add parent property
			for (const child of instanace.children) {
				child.parent = instanace;
				setup(child);
			}
		};

		setup(sourcemap);

		for (const listener of this.listeners) {
			listener(sourcemap);
		}
	}

	private startProcess() {
		this.dispose();

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
