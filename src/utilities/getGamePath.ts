import * as configReader from "./configReader";
import { Session } from "./../session";
import { basename, dirname, normalize } from "path";

/** Gets the gamePath from filePath */
export default function getGamePath(path: string, rojoMap: any, workspacePath: string, session: Session) {
	path = normalize(path);
	path = path.substring(workspacePath.length + 1);

	const dirPath = dirname(path);
	const fileName = basename(path, ".lua");
	var rojoKey: any;

	//console.log("file path", path);
	//console.log("rojo map", rojoMap);

	let gamePath: string;
	for (const key in rojoMap) {
		if (dirPath.startsWith(key)) {
			rojoKey = key;
			const rojoDir = rojoMap[key];
			const remainingPath = dirPath.slice(key.length).replace(/^\\/, ""); // slice everything after the main part and remove the first \
			// .replace(/\\/g, ".")   <-- Replaces all \ with .
			gamePath =
				rojoDir.replace(/\\/g, ".") +
				(remainingPath !== "" ? `.${remainingPath.replace(/\\/g, ".")}` : "") +
				`.${fileName}`;
		}
	}
	if (!gamePath) {
		return;
	}

	const useWaitForChild = !(session.configHandler.extensionConfig.storedValue?.useWaitForChild === false);

	let final = "";
	const splitPath = gamePath.split(".");
	for (let i = 0; i < splitPath.length; i++) {
		if (i === 0) {
			final = final + `game:GetService("${splitPath[i]}")`;
		} else {
			if (useWaitForChild) {
				final = final + `:WaitForChild("${splitPath[i]}")`;
			} else {
				final = final + `.${splitPath[i]}`;
			}
		}
	}
	return final;
}
