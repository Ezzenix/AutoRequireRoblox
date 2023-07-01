import {
	CancellationToken,
	CompletionContext,
	CompletionItem,
	CompletionItemKind,
	Disposable,
	ExtensionContext,
	FileSystemWatcher,
	Position,
	Range,
	RelativePattern,
	TextDocument,
	TextEdit,
	Uri,
	languages,
	workspace,
} from "vscode";
import { ConfigReader } from "../configReader";
import { join } from "path";
import { readFile } from "../../utilities/fsWrapper";
import mapRojoTree from "./utilities/mapRojoTree";
import scanModules, { ModuleInfo } from "./scanModules";
import completionItems from "./completionItems";
import updateCollections from "./updateCollections";

export class Session {
	context: ExtensionContext;
	workspacePath: string;
	extensionConfig: ConfigReader;
	rojoConfig: ConfigReader;
	cachedModules: ModuleInfo[];
	rojoMap?: any;
	completionProvider: Disposable;
	watcher: FileSystemWatcher;
	hasQueuedUpdateCollections: boolean;

	constructor(context: ExtensionContext, workspacePath: string, defaultConfig: any) {
		this.context = context;
		this.workspacePath = workspacePath;
		this.cachedModules = [];

		this.hasQueuedUpdateCollections = false; // used to defer UpdateCollections for more efficiency

		// Initialize configurations
		this.extensionConfig = new ConfigReader(join(workspacePath, ".autorequire.json"), defaultConfig, true);
		this.rojoConfig = new ConfigReader();
		this.rojoConfig.onDidChange((data) => {
			if (!data || !data.tree) return;
			const map = mapRojoTree(data.tree);
			if (map) {
				this.rojoMap = map;
			}
		});
		this.extensionConfig.onDidChange((data) => {
			if (!data) return;
			this.rojoConfig.setPath(join(workspacePath, data.rojoProject));
		});

		const srcPattern = new RelativePattern(workspacePath, "src/**/*");

		// Create file watcher
		this.watcher = workspace.createFileSystemWatcher(srcPattern, false, false, false);
		const documentChangedBind = this.documentChanged.bind(this);
		const fileChangedBind = this.fileChanged.bind(this);
		this.watcher.onDidChange(documentChangedBind);
		this.watcher.onDidCreate(fileChangedBind);
		this.watcher.onDidDelete(fileChangedBind);

		// Register completion items provider
		const bind = this.provideCompletion.bind(this);
		this.completionProvider = languages.registerCompletionItemProvider(
			{ language: "lua", pattern: srcPattern },
			{ provideCompletionItems: bind },
			"."
		);
		context.subscriptions.push(this.completionProvider);

		// Initialize
		this.refreshModuleCache();
		this.updateCollections();
	}

	provideCompletion(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext) {
		if (!this.rojoMap) return [];
		return completionItems(document, position, token, context, this.cachedModules, this.workspacePath);
	}

	// Executed when a documents content changes
	documentChanged(uri: Uri) {
		this.updateCollections();
	}

	// Executed when the file structure changes
	fileChanged(uri: Uri) {
		this.refreshModuleCache();
		this.updateCollections();
	}

	updateCollections() {
		if (!this.rojoMap) return;
		if (!this.extensionConfig.storedValue.enableModuleCollection) return;
		if (this.hasQueuedUpdateCollections) return;
		this.hasQueuedUpdateCollections = true;
		setTimeout(() => {
			updateCollections(this.workspacePath, this.rojoMap);
			this.hasQueuedUpdateCollections = false;
		}, 1000);
	}

	refreshModuleCache() {
		this.cachedModules = scanModules(this.workspacePath, this.rojoMap);
	}

	dispose() {
		this.completionProvider.dispose();
		this.watcher.dispose();
	}
}
