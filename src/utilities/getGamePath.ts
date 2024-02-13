import { SERVER_SERVICES } from "../constants";
import { SourcemapObject, getServiceName, isDescendantOf } from "./sourcemap";

export default function getGamePath(moduleObj: SourcemapObject, relativeTo?: SourcemapObject) {
	if (relativeTo === undefined) {
		// ABSOLUTE PATH
		let path = "";

		let obj = moduleObj;

		while (true) {
			if (!obj.parent) break; // root

			if (obj.parent.parent) {
				path = `.${obj.name}${path}`;
			} else {
				path = `game:GetService("${obj.name}")${path}`;
			}

			obj = obj.parent;
			if (!obj) break;
		}

		// Convert StarterPlayerScripts to Player.PlayerScripts
		const starterPlayerScriptsText = `game:GetService("StarterPlayer").StarterPlayerScripts`;
		if (path.startsWith(starterPlayerScriptsText) && !SERVER_SERVICES.includes(getServiceName(moduleObj))) {
			path = path.replace(starterPlayerScriptsText, `game:GetService("Players").LocalPlayer.PlayerScripts`);
		}

		return path;
	} else {
		// RELATIVE PATH
		let path = "script";

		let obj = moduleObj;

		if (isDescendantOf(relativeTo, obj)) {
			// .Parent spam
			while (obj !== relativeTo) {
				path = `${path}.Parent`;
				relativeTo = relativeTo.parent;
			}
		} else {
			// go up enough
			while (!isDescendantOf(obj, relativeTo)) {
				path = `${path}.Parent`;
				relativeTo = relativeTo.parent;
			}

			// go down to module
			function iterate(v: SourcemapObject) {
				if (!v.children) return;
				for (const child of v.children) {
					if (isDescendantOf(obj, child)) {
						path = `${path}.${child.name}`;
						iterate(child);
					}
				}
			}
			iterate(relativeTo);
		}

		return path;
	}
}
