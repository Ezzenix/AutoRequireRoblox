import { readFileSync } from "fs";
import { FileSystemWatcher, Uri, workspace } from "vscode";

type ListenerCallback = () => any;

export class ConfigReader {
	path: string;
	storedValue?: any;
	watcher?: FileSystemWatcher;
	defaultValue: any;
	callback: ListenerCallback;

	constructor(path: string, defaultValue?: any) {
		this.defaultValue = defaultValue;

		this.setPath(path);
	}

	private fileChanged() {
		try {
			const fileContent = readFileSync(this.path).toString();
			const json = JSON.parse(fileContent);
			if (json) {
				this.storedValue = json;
			} else if (this.defaultValue) {
				this.storedValue = this.defaultValue;
			}
		} catch (err) {
			this.storedValue = this.defaultValue;
			console.log(err);
		}

		if (this.callback) {
			this.callback();
		}
	}

	onDidChange(callback: ListenerCallback) {
		this.callback = callback;
	}

	setPath(path: string) {
		this.path = path;

		this.watcher = workspace.createFileSystemWatcher(path, false, false, false);
		const fileChanged = this.fileChanged.bind(this);
		this.watcher.onDidChange(fileChanged);
		this.watcher.onDidCreate(fileChanged);
		this.watcher.onDidDelete(fileChanged);
		fileChanged();
	}

	dispose() {
		if (this.watcher) {
			this.watcher.dispose();
			this.watcher = undefined;
		}
	}
}
