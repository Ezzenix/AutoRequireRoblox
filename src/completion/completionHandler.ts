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
import { Instance, InstanceUtil, SourcemapUtil } from "../utilities/sourcemap";
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

	getInstanceFromDocument(document: TextDocument): Instance | undefined {
		const documentPath = document.uri.fsPath.substring(this.session.workspacePath.length + 1);
		const sourcemap = this.session.sourcemap;

		let target: Instance;
		function iterate(object: Instance) {
			for (const obj of object.children) {
				if (obj.filePaths && InstanceUtil.isScript(obj)) {
					if (obj.mainFilePath === documentPath) {
						target = obj;
						break;
					}
				}

				if (obj.children) {
					iterate(obj);
				}
			}
		}
		iterate(sourcemap);
		return target;
	}

	canRequireEnvironment(script: Instance, target: Instance) {
		const scriptService = InstanceUtil.getService(script);
		const targetService = InstanceUtil.getService(target);

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
		const sourcemap = this.session.sourcemap;
		const source = document.getText();

		const lineText = document.getText(new Range(position.with(undefined, 0), position));
		const matches = lineText.match(/\b(\w+)\s*$/);
		const lastWord = matches ? matches[1].toLowerCase() : "";
		if (!lastWord || lastWord.endsWith(".") || lastWord.endsWith(" ")) return;

		const script = this.getInstanceFromDocument(document);
		if (!script) return;
		const scriptSubModule = InstanceUtil.getParentModule(script);

		const items: CompletionItem[] = [];

		// Services
		for (const serviceName of SERVICES) {
			if (!serviceName.toLowerCase().startsWith(lastWord.toLowerCase())) continue; // vs-code already does this, but its better to do it before all the calculations

			if (getServiceVariableName(source, serviceName)) continue;

			// Create completion item
			let item = new CompletionItem(serviceName, CompletionItemKind.Interface);
			item.detail = `:GetService("${serviceName}")`;
			item.additionalTextEdits = [createGetServiceEdit(source, serviceName)];
			items.push(item);
		}

		// Modules
		for (const obj of SourcemapUtil.getScripts(sourcemap)) {
			// Check if module should be shown
			if (obj.className !== "ModuleScript") continue;
			if (obj === script) continue;
			if (obj.name.includes(" ")) continue; // no spaces in name
			if (obj.mainFilePath.startsWith("Packages\\_Index")) continue; // Wally packages index
			if (!obj.name.toLowerCase().startsWith(lastWord.toLowerCase())) continue; // vs-code already does this, but its better to do it before all the calculations
			if (isRequiringModule(source, obj)) continue;
			if (!this.canRequireEnvironment(script, obj)) continue;
			if (this.session.configHandler.extensionConfig.storedValue.alwaysShowSubModules !== true) {
				const objSubModule = InstanceUtil.getParentModule(obj);
				if (objSubModule !== false && scriptSubModule !== objSubModule && objSubModule !== script) {
					continue;
				}
			}

			// Create completion item
			let item = new CompletionItem(obj.name, CompletionItemKind.Module);
			item.detail = `Require '${obj.mainFilePath}'`;
			item.additionalTextEdits = createRequireEdits(source, script, obj);
			items.push(item);
		}

		return items;
	}
}
