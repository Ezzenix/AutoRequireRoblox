import { join } from "path";
import { Session } from "../session";
import { DEFAULT_CONFIG } from "../constants";
import { ConfigReader } from "./configReader";

type MainConfig = {
	enableModuleCollection: boolean;
	alwaysShowSubModules: boolean;
	serverDirectories?: string[];
	clientDirectories?: string[];
};

export class ConfigHandler {
	session: Session;
	extensionConfig: ConfigReader<MainConfig>;

	constructor(session: Session) {
		this.session = session;

		this.extensionConfig = new ConfigReader<MainConfig>(
			join(session.workspacePath, ".autorequire.json"),
			DEFAULT_CONFIG as MainConfig,
			true
		);
		this.extensionConfig.onDidChange((data) => {
			if (!data) return;

			console.log(data);

			this.session.collectionHandler?.update();
		});

		this.session.disposables.push(this.extensionConfig);
	}
}
