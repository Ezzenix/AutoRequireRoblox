import { FileSystemWatcher, workspace } from "vscode";
import { readFile } from "../utilities/fsWrapper";

type ListenerCallback<T> = (data: T) => any;

function reconcile(value: any, template: any): any {
	if (typeof value !== "object" || typeof template !== "object" || value === null || template === null) {
		return value;
	}

	const reconciled: any = {};

	for (const key in template) {
		if (template.hasOwnProperty(key)) {
			if (value.hasOwnProperty(key)) {
				reconciled[key] = reconcile(value[key], template[key]);
			} else {
				reconciled[key] = template[key];
			}
		}
	}

	for (const key in value) {
		if (value.hasOwnProperty(key) && !reconciled.hasOwnProperty(key)) {
			reconciled[key] = value[key];
		}
	}

	return reconciled;
}

export class ConfigReader<T> {
	path: string;
	storedValue?: T;
	watcher?: FileSystemWatcher;
	defaultValue: T;
	callback: ListenerCallback<T>;
	doReconcile: boolean;

	constructor(path?: string, defaultValue?: T, reconcile?: boolean) {
		this.defaultValue = defaultValue;
		this.doReconcile = reconcile === true;

		if (path) {
			this.setPath(path);
		}
	}

	/** Evaluate a new storedValue when the file content changes */
	private fileChanged() {
		try {
			let json = readFile(this.path);
			if (json) {
				if (this.defaultValue && this.doReconcile) {
					json = reconcile(json, this.defaultValue);
				}
				this.storedValue = json as T;
			} else if (this.defaultValue) {
				this.storedValue = this.defaultValue;
			}
		} catch (err) {
			this.storedValue = this.defaultValue;
		}

		if (this.callback) {
			this.callback(this.storedValue);
		}
	}

	/** Provide a callback for when the configuration content changes */
	onDidChange(callback: ListenerCallback<T>) {
		this.callback = callback;
		callback(this.storedValue); // call at startup
	}

	/** Sets a new path to listen for and reinitializes everything */
	setPath(path: string) {
		this.dispose(); // cleanup

		this.path = path;

		this.watcher = workspace.createFileSystemWatcher(path, false, false, false);
		const fileChanged = this.fileChanged.bind(this);
		this.watcher.onDidChange(fileChanged);
		this.watcher.onDidCreate(fileChanged);
		this.watcher.onDidDelete(fileChanged);
		fileChanged();
	}

	/** Cleanup */
	dispose() {
		if (this.watcher) {
			this.watcher.dispose();
			this.watcher = undefined;
		}
	}
}
