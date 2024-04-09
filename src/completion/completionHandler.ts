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

		// Add completion providers
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

	/* Gets the sourcemap instance object from a vscode document */
	getInstanceFromDocument(document: TextDocument): Instance | undefined {
		const documentPath = document.uri.fsPath.substring(this.session.workspacePath.length + 1);
		const sourcemap = this.session.sourcemap;
		if (!sourcemap) return;

		let target: Instance;
		function iterate(object: Instance) {
			for (const obj of object.children) {
				if (obj.filePaths && InstanceUtil.isScript(obj)) {
					if (obj.mainFilePath.toLowerCase() === documentPath.toLowerCase()) {
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

	/*
		Checks if document is forced server or client environment
		Returns booleans for [isServer, isClient]
	*/
	isInEnvironmentConfig(script: Instance): [boolean, boolean] {
		const config = this.session.configHandler.extensionConfig.storedValue;
		if (!config) return [false, false];

		const scriptPath = script.mainFilePath.toLowerCase();

		let isServer = false;
		let isClient = false;

		const isIn = (directories: string[]) => {
			if (typeof directories === "object") {
				for (const v of directories) {
					if (scriptPath.startsWith(v.toLowerCase().replace(/\//g, "\\"))) {
						return true;
					}
				}
			}
			return false;
		};

		if (config.serverDirectories) {
			isServer = isIn(config.serverDirectories);
		}
		if (config.clientDirectories) {
			isClient = isIn(config.clientDirectories);
		}

		return [isServer, isClient];
	}

	/* Checks if script can require target, based on client/server environment */
	canRequireEnvironment(script: Instance, target: Instance) {
		const scriptService = InstanceUtil.getService(script);
		const targetService = InstanceUtil.getService(target);

		const [isScriptForcedServer, isScriptForcedClient] = this.isInEnvironmentConfig(script);
		if (isScriptForcedServer && isScriptForcedClient) return true;

		const [isTargetForcedServer, isTargetForcedClient] = this.isInEnvironmentConfig(script);

		const isScriptClient =
			CLIENT_SERVICES.includes(scriptService) ||
			script.mainFilePath.startsWith("src\\client") ||
			isScriptForcedClient;
		const isScriptServer =
			SERVER_SERVICES.includes(scriptService) ||
			script.mainFilePath.startsWith("src\\server") ||
			isScriptForcedServer;
		const isTargetClient =
			CLIENT_SERVICES.includes(targetService) ||
			target.mainFilePath.startsWith("src\\client") ||
			isTargetForcedClient;
		const isTargetServer =
			SERVER_SERVICES.includes(targetService) ||
			target.mainFilePath.startsWith("src\\server") ||
			isTargetForcedServer;

		if (!(isScriptClient || isScriptServer) && (isTargetClient || isTargetServer)) return false;
		if ((isScriptClient && isTargetServer) || (isScriptServer && isTargetClient)) return false;
		return true;
	}

	/* Main completion provider */
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
