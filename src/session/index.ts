import { join } from "path";
import { Disposable, ExtensionContext, FileSystemWatcher, RelativePattern, Uri, workspace } from "vscode";
import scanModules from "../utilities/scanModules";
import { CollectionHandler } from "./handlers/collectionHandler";
import { CompletionHandler } from "./handlers/completionHandler";
import { ConfigHandler } from "./handlers/configHandler";

export class Session {
	context: ExtensionContext;
	workspacePath: string;

	rojoMap?: any;
	completionProvider: Disposable;
	watcher: FileSystemWatcher;

	configHandler: ConfigHandler;
	completionHandler: CompletionHandler;
	collectionHandler: CollectionHandler;

	constructor(context: ExtensionContext, workspacePath: string) {
		this.context = context;
		this.workspacePath = workspacePath;

		this.configHandler = new ConfigHandler(this);
		this.completionHandler = new CompletionHandler(this);
		this.collectionHandler = new CollectionHandler(this);

		// Create file watcher
		const srcPattern = new RelativePattern(workspacePath, "**/*");
		this.watcher = workspace.createFileSystemWatcher(srcPattern, false, false, false);
		const documentChangedBind = this.documentChanged.bind(this);
		const fileChangedBind = this.fileChanged.bind(this);
		this.watcher.onDidChange(documentChangedBind);
		this.watcher.onDidCreate(fileChangedBind);
		this.watcher.onDidDelete(fileChangedBind);
	}

	// Documents content changes
	documentChanged(uri: Uri) {
		this.completionHandler.documentChanged(uri);
		this.collectionHandler.documentChanged(uri);
	}

	// File structure changes
	fileChanged(uri: Uri) {
		this.completionHandler.fileChanged(uri);
		this.collectionHandler.fileChanged(uri);
	}

	dispose() {
		this.watcher.dispose();
		this.completionHandler.dispose();
		this.collectionHandler.dispose();
	}

	//scanModules(path = join(this.workspacePath, "src")) {
	//	if (!this.rojoMap) return [];
	//	return scanModules(path, this.rojoMap);
	//}
}
