import { FileSystemWatcher, workspace } from "vscode";
import { readFile } from "./fsWrapper";
import reconcile from "./reconcile";

type ListenerCallback = (data: any) => any;

export class ConfigReader {
	path: string;
	storedValue?: any;
	watcher?: FileSystemWatcher;
	defaultValue: any;
	callback: ListenerCallback;
	doReconcile: boolean;

	constructor(path?: string, defaultValue?: any, reconcile?: boolean) {
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
				this.storedValue = json;
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
	onDidChange(callback: ListenerCallback) {
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
