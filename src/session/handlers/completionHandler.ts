import {
	CancellationToken,
	CompletionContext,
	CompletionItem,
	CompletionItemKind,
	Disposable,
	MarkdownString,
	Position,
	Range,
	RelativePattern,
	TextDocument,
	Uri,
	languages,
} from "vscode";
import { Session } from "..";
import { readFile } from "../../utilities/fsWrapper";
import scanModules, { ModuleInfo } from "../../utilities/scanModules";
import { createRequireInsertEdit } from "../requireHelper";

export class CompletionHandler {
	session: Session;
	moduleCache: ModuleInfo[] = [];
	completionProvider: Disposable;

	constructor(session: Session) {
		this.session = session;
		this.moduleCache = [];

		this.refreshModuleCache();

		// Completion items provider
		const srcPattern = new RelativePattern(this.session.workspacePath, "src/**/*");
		const bind = this.provideCompletions.bind(this);
		this.completionProvider = languages.registerCompletionItemProvider(
			{ language: "lua", pattern: srcPattern },
			{ provideCompletionItems: bind },
			"."
		);
	}

	refreshModuleCache() {
		this.moduleCache = scanModules(this.session.workspacePath, this.session.rojoMap);
	}

	provideCompletions(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext) {
		if (!this.session.rojoMap) return [];

		const workspacePath = this.session.workspacePath;
		const modules = this.moduleCache;

		// Filter visible modules
		const userTypedText = document.getText(new Range(position.with(undefined, 0), position)).toLowerCase();
		if (!userTypedText || userTypedText.trim() === "" || userTypedText.endsWith(".")) return [];
		const filteredModules = modules.filter((module) => {
			if (module.filePath === document.uri.fsPath) return false; // filter out the module you are currently writing in
			return module.name.toLowerCase().startsWith(userTypedText);
		});

		// Create completion items
		return filteredModules.map((module) => {
			const insertRequireEdit = createRequireInsertEdit(module, document);

			const displayPath = module.filePath.slice(workspacePath.length + 5).replace(/\\/g, "/"); // cut out the beginning of the path so its relative to src

			// Create item
			let item = new CompletionItem(module.name, CompletionItemKind.Module);
			item.detail = `${module.name}: ${displayPath}`;
			//item.preselect = true;
			//item.sortText = "!!!!!";

			// Text and source preview
			const mdString = new MarkdownString();
			mdString.appendMarkdown(`Require and use the ${module.name} module.`);
			const content = readFile(module.filePath);
			if (content) {
				mdString.appendCodeblock(content, "lua");
			}
			item.documentation = mdString;

			// Require insert edit
			item.additionalTextEdits = insertRequireEdit ? [insertRequireEdit] : []; // insert require expression if it doesn't exist

			return item;
		});
	}

	//
	documentChanged(uri: Uri) {}

	fileChanged(uri: Uri) {
		this.refreshModuleCache();
	}

	dispose() {
		if (this.completionProvider && this.completionProvider.dispose) {
			this.completionProvider.dispose();
		}
	}
}
