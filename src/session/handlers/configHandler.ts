import { join } from "path";
import { Session } from "..";
import { DEFAULT_CONFIG } from "../../constants";
import { ConfigReader } from "../../utilities/configReader";
import mapRojoTree from "../../utilities/mapRojoTree";

export class ConfigHandler {
	session: Session;
	extensionConfig: ConfigReader;
	rojoConfig: ConfigReader;

	constructor(session: Session) {
		this.session = session;

		this.extensionConfig = new ConfigReader(join(session.workspacePath, ".autorequire.json"), DEFAULT_CONFIG, true);
		this.rojoConfig = new ConfigReader();
		this.rojoConfig.onDidChange((data) => {
			if (!data || !data.tree) return;
			const map = mapRojoTree(data.tree);
			if (map) {
				session.rojoMap = map;
			}
			setTimeout(() => {
				this.session.completionHandler.refreshModuleCache();
			}, 2000);
		});
		this.extensionConfig.onDidChange((data) => {
			if (!data) return;
			this.rojoConfig.setPath(join(session.workspacePath, data.rojoProject));

			this.session.collectionHandler?.reload();

			setTimeout(() => {
				this.session.completionHandler.refreshModuleCache();
			}, 2000);
		});
	}

	dispose() {
		this.rojoConfig.dispose();
		this.extensionConfig.dispose();
	}
}
