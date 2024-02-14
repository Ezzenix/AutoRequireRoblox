import {
	CancellationToken,
	CompletionContext,
	CompletionItem,
	CompletionItemKind,
	Position,
	Range,
	RelativePattern,
	TextDocument,
	languages,
} from "vscode";
import { Session } from "../session";
import {
	SourcemapObject,
	getFilePath,
	getScripts,
	getServiceName,
	isScript,
	isSubModule,
} from "../utilities/sourcemap";
import {
	createGetServiceEdit,
	createRequireEdits,
	getServiceVariableName,
	isRequiringModule,
} from "../utilities/helper";
import { CLIENT_SERVICES, SERVER_SERVICES, SERVICES } from "../constants";

export class CompletionHandler {
	session: Session;

	constructor(session: Session) {
		this.session = session;

		const srcPattern = new RelativePattern(this.session.workspacePath, "**/*");
		const bind = this.provideCompletions.bind(this);
		this.session.disposables.push(
			languages.registerCompletionItemProvider(
				{ language: "luau", pattern: srcPattern },
				{ provideCompletionItems: bind },
				"."
			),
			languages.registerCompletionItemProvider(
				{ language: "lua", pattern: srcPattern },
				{ provideCompletionItems: bind },
				"."
			)
		);
	}

	getSourcemapObjectFromDocument(document: TextDocument): SourcemapObject | undefined {
		const documentPath = document.uri.fsPath.substring(this.session.workspacePath.length + 1);
		const sourcemap = this.session.sourcemap;

		let targetObj: SourcemapObject;
		function iterate(object: SourcemapObject) {
			for (const obj of object.children) {
				if (obj.filePaths && isScript(obj)) {
					if (getFilePath(obj) === documentPath) {
						targetObj = obj;
						break;
					}
				}

				if (obj.children) {
					iterate(obj);
				}
			}
		}
		iterate(sourcemap);
		return targetObj;
	}

	canRequireEnvironment(scriptObj: SourcemapObject, targetObj: SourcemapObject) {
		const scriptService = getServiceName(scriptObj);
		const targetService = getServiceName(targetObj);

		const isScriptClient = CLIENT_SERVICES.includes(scriptService);
		const isScriptServer = SERVER_SERVICES.includes(scriptService);
		const isTargetClient = CLIENT_SERVICES.includes(targetService);
		const isTargetServer = SERVER_SERVICES.includes(targetService);

		if (!(isScriptClient || isScriptServer) && (isTargetClient || isTargetServer)) return false;
		if ((isScriptClient && isTargetServer) || (isScriptServer && isTargetClient)) return false;
		return true;
	}

	provideCompletions(
		document: TextDocument,
		position: Position,
		token: CancellationToken,
		context: CompletionContext
	) {
		const workspacePath = this.session.workspacePath;
		const sourcemap = this.session.sourcemap;
		const source = document.getText();

		const lineText = document.getText(new Range(position.with(undefined, 0), position));
		const matches = lineText.match(/\b(\w+)\s*$/);
		const lastWord = matches ? matches[1].toLowerCase() : "";
		if (!lastWord || lastWord.endsWith(".") || lastWord.endsWith(" ")) return;

		const scriptObj = this.getSourcemapObjectFromDocument(document);
		if (!scriptObj) return;
		const scriptSubModule = isSubModule(scriptObj);

		const items: CompletionItem[] = [];

		// Services
		for (const serviceName of SERVICES) {
			if (!serviceName.toLowerCase().startsWith(lastWord.toLowerCase())) continue; // vs-code already does this, but its better to do it before all the calculations

			if (getServiceVariableName(source, serviceName)) continue;

			let item = new CompletionItem(serviceName, CompletionItemKind.Interface);
			item.detail = `:GetService("${serviceName}")`;
			item.additionalTextEdits = [createGetServiceEdit(source, serviceName)];
			items.push(item);
		}

		// Modules
		for (const obj of getScripts(sourcemap)) {
			if (obj.className !== "ModuleScript") continue;

			if (!obj.name.toLowerCase().startsWith(lastWord.toLowerCase())) continue; // vs-code already does this, but its better to do it before all the calculations

			if (obj === scriptObj) continue;
			if (isRequiringModule(source, obj)) continue;
			if (!this.canRequireEnvironment(scriptObj, obj)) continue;

			if (this.session.configHandler.extensionConfig.storedValue.alwaysShowSubModules !== true) {
				const objSubModule = isSubModule(obj);
				if (objSubModule !== false && scriptSubModule !== isSubModule(obj)) continue;
			}

			let item = new CompletionItem(obj.name, CompletionItemKind.Module);
			item.detail = `Require '${getFilePath(obj)}'`;
			item.additionalTextEdits = createRequireEdits(source, scriptObj, obj);
			items.push(item);
		}

		return items;
	}
}
