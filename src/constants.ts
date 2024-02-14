import { join } from "path";
import { readFile } from "./utilities/fsWrapper";

const defaultConfigPath = join(__dirname, "..", "src", "defaultConfig.json");
const defaultConfig = readFile(defaultConfigPath);
if (!defaultConfig) {
	throw new Error("Couldn't read default configuration");
}

export const DEFAULT_CONFIG = defaultConfig;
export const COLLECTION_FILE_IDENTIFIER = "--@AutoRequireCollection";

export const SERVICES = [
	"AnalyticsService",
	"AssetService",
	"BadgeService",
	"ChangeHistoryService",
	"CollectionService",
	"ContentProvider",
	"ContextActionService",
	"DataStoreService",
	"Debris",
	"FriendService",
	"GamepadService",
	"GroupService",
	"GuiService",
	"HapticService",
	"HttpService",
	"Lighting",
	"LocalizationService",
	"LogService",
	"MarketplaceService",
	"MemoryStoreService",
	"PhysicsService",
	"Players",
	"PolicyService",
	"ReplicatedFirst",
	"ReplicatedStorage",
	"RunService",
	"ServerScriptService",
	"ServerStorage",
	"SoundService",
	"StarterGui",
	"StarterPack",
	"StarterPlayer",
	"Teams",
	"TeleportService",
	"TextService",
	"TouchInputService",
	"TweenService",
	"VRService",
	"UserInputService",
];

export const CLIENT_SERVICES = ["StarterPlayer", "StarterGui"];
export const SERVER_SERVICES = ["ServerStorage", "ServerScriptService"];
