import { join } from "path";
import { Session } from "../session";
import { DEFAULT_CONFIG } from "../constants";
import { ConfigReader } from "./configReader";
import path = require("path");

type MainConfig = {
	enableModuleCollection: boolean;
	alwaysShowSubModules: boolean;
	serverDirectories?: string[];
	clientDirectories?: string[];
	ignoreEnvironment: boolean;
};

function normalizeDirs(dirs: any) {
	return (Array.isArray(dirs) ? dirs : Object.values(dirs ?? {})).map((dir) => path.normalize(dir as any));
}

export class ConfigHandler {
	session: Session;
	extensionConfig: ConfigReader<MainConfig>;

	constructor(session: Session) {
		this.session = session;

		this.extensionConfig = new ConfigReader<MainConfig>(
			join(session.workspacePath, ".autorequire.json"),
			DEFAULT_CONFIG as MainConfig
		);
		this.extensionConfig.onDidChange((data) => {
			if (!data) return;

			data.clientDirectories = normalizeDirs(data.clientDirectories);
			data.serverDirectories = normalizeDirs(data.serverDirectories);

			this.session.sourcemapWatcher.reload();
			this.session.collectionHandler?.update();
		});

		this.session.disposables.push(this.extensionConfig);
	}
}
