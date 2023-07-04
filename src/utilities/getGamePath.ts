import { basename, dirname, normalize } from "path";

/** Gets the gamePath from filePath */
export default function getGamePath(path: string, rojoMap: any) {
	path = normalize(path);

	// remove everything before until src
	const i = path.indexOf("src");
	if (i !== -1) {
		path = path.slice(i);
	}

	const dirPath = dirname(path);
	const fileName = basename(path, ".lua");
	var rojoKey: any;

	let gamePath: string;
	for (const key in rojoMap) {
		if (dirPath.startsWith(key)) {
			rojoKey = key;
			const rojoDir = rojoMap[key];
			const remainingPath = dirPath.slice(key.length).replace(/^\\/, ""); // slice everything after the main part and remove the first \
			// .replace(/\\/g, ".")   <-- Replaces all \ with .
			gamePath = rojoDir.replace(/\\/g, ".") + (remainingPath !== "" ? `.${remainingPath.replace(/\\/g, ".")}` : "") + `.${fileName}`;
		}
	}
	if (!gamePath) {
		return;
	}

	let final = "";
	const splitPath = gamePath.split(".");
	for (let i = 0; i < splitPath.length; i++) {
		if (i === 0) {
			final = final + `game:GetService("${splitPath[i]}")`;
		} else {
			final = final + `:WaitForChild("${splitPath[i]}")`;
		}
	}
	return final;
}
