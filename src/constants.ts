import { join } from "path";
import { readFile } from "./utilities/fsWrapper";

const defaultConfigPath = join(__dirname, "..", "src", "defaultConfig.json");
const defaultConfig = readFile(defaultConfigPath);
if (!defaultConfig) {
	throw new Error("Couldn't read default configuration");
}

export const DEFAULT_CONFIG = defaultConfig;
export const COLLECTION_FILE_IDENTIFIER = "--@AutoRequireCollection";
