import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import path = require("path");
import { window } from "vscode";
import { Session } from "../session";
import { CLIENT_SERVICES, SERVER_SERVICES } from "../constants";
import { writeFileSync } from "fs";

export enum Environment {
	SERVER = "SERVER",
	CLIENT = "CLIENT",
	SHARED = "SHARED",
	BOTH = "BOTH",
}

export type Instance = {
	name: string;
	className: string;
	filePaths?: string[];
	mainFilePath: string;
	parent?: Instance;
	children: Instance[];
	environment: Environment;
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
	private session: Session;
	private rootPath: string;
	private process: ChildProcessWithoutNullStreams;
	private listeners: SourcemapListener[];

	constructor(session: Session, rootPath: string) {
		this.session = session;
		this.rootPath = rootPath;
		this.listeners = [];
		this.reload();
	}

	private sourcemapChanged(text: string) {
		let sourcemap: Instance;
		try {
			sourcemap = JSON.parse(text);
		} catch (err) {
			console.error("Failed to parse sourcemap JSON");
			return;
		}

		const setup = (instance: Instance) => {
			// normalize paths
			if (instance.filePaths) {
				for (const i in instance.filePaths) {
					const filePath = path.normalize(instance.filePaths[i]);
					instance.filePaths[i] = filePath;
					if (filePath.endsWith(".lua") || filePath.endsWith(".luau")) {
						instance.mainFilePath = filePath;
					}
				}
			}

			if (!instance.children) instance.children = [];

			// add parent property
			for (const child of instance.children) {
				child.parent = instance;
				setup(child);
			}

			// compute environment
			const config = this.session.configHandler.extensionConfig.storedValue;
			const service = InstanceUtil.getService(instance);
			const normalizedPath = instance.mainFilePath?.toLowerCase();

			const isServerDir = config?.serverDirectories?.some((dir) => normalizedPath?.startsWith(dir.toLowerCase()));
			const isClientDir = config?.clientDirectories?.some((dir) => normalizedPath?.startsWith(dir.toLowerCase()));

			if (isServerDir && isClientDir) {
				instance.environment = Environment.BOTH;
			} else if (isServerDir) {
				instance.environment = Environment.SERVER;
			} else if (isClientDir) {
				instance.environment = Environment.CLIENT;
			} else {
				const isServer =
					SERVER_SERVICES.includes(service) || normalizedPath?.startsWith(path.normalize("src/server"));

				const isClient =
					CLIENT_SERVICES.includes(service) || normalizedPath?.startsWith(path.normalize("src/client"));

				if (isServer) instance.environment = Environment.SERVER;
				else if (isClient) instance.environment = Environment.CLIENT;
				else instance.environment = Environment.SHARED;
			}
		};

		setup(sourcemap);

		for (const listener of this.listeners) {
			listener(sourcemap);
		}
	}

	reload() {
		this.dispose();

		this.process = spawn("rojo", ["sourcemap", "--watch"], { cwd: this.rootPath });

		this.process.stdout.on("data", (data) => {
			this.sourcemapChanged(data.toString());
		});

		this.process.stderr.on("data", (data) => {
			console.error(`Error from sourcemap watcher: ${data.toString()}`);
			//window.showErrorMessage(`Error from sourcemap watcher: ${data.toString()}`);
		});

		this.process.on("exit", (code) => {
			if (code) {
				console.log(`rojo sourcemap process exited with code ${code}`);
			}
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
