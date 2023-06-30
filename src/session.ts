import { ExtensionContext } from "vscode";

export class Session {
	context: ExtensionContext;

	constructor(context: ExtensionContext) {
		this.context = context;
	}

	// When the workspace is closed
	dispose() {}
}
