import { Disposable, ExtensionContext } from "vscode";
import { CollectionHandler } from "../collections/collectionHandler";
import { CompletionHandler } from "../completion/completionHandler";
import { ConfigHandler } from "../config/configHandler";
import { Instance, SourcemapWatcher } from "../utilities/sourcemap";

export class Session {
	context: ExtensionContext;
	workspacePath: string;

	configHandler: ConfigHandler;
	completionHandler: CompletionHandler;
	collectionHandler: CollectionHandler;

	sourcemap: Instance;

	disposables: Disposable[];

	constructor(context: ExtensionContext, workspacePath: string) {
		this.disposables = [];
		this.context = context;
		this.workspacePath = workspacePath;

		const sourcemapWatcher = new SourcemapWatcher(workspacePath);
		sourcemapWatcher.onChange((sourcemap) => {
			this.sourcemap = sourcemap;
			this.collectionHandler.update();
		});
		this.disposables.push(sourcemapWatcher);

		this.configHandler = new ConfigHandler(this);
		this.completionHandler = new CompletionHandler(this);
		this.collectionHandler = new CollectionHandler(this);
	}

	dispose() {
		for (const disposable of this.disposables) {
			disposable.dispose();
		}
	}
}
