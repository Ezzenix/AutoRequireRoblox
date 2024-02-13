import { join } from "path";
import { Session } from "../session";
import { DEFAULT_CONFIG } from "../constants";
import { ConfigReader } from "./configReader";

export class ConfigHandler {
	session: Session;
	extensionConfig: ConfigReader;

	constructor(session: Session) {
		this.session = session;

		this.extensionConfig = new ConfigReader(join(session.workspacePath, ".autorequire.json"), DEFAULT_CONFIG, true);
		this.extensionConfig.onDidChange((data) => {
			if (!data) return;

			this.session.collectionHandler?.update();
		});

		this.session.disposables.push(this.extensionConfig);
	}
}
