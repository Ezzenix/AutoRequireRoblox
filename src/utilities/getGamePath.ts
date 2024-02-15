import { SourcemapObject, isDescendantOf } from "./sourcemap";

export default function getGamePath(moduleObj: SourcemapObject, relativeTo?: SourcemapObject): string[] {
	if (relativeTo === undefined) {
		// ABSOLUTE PATH
		let path = [];

		let obj = moduleObj;

		while (true) {
			if (!obj.parent) break; // root

			path.splice(0, 0, obj.name);

			obj = obj.parent;
			if (!obj) break;
		}

		// Convert StarterPlayer.StarterPlayerScripts to Players.LocalPlayer.PlayerScripts
		if (path[0] === "StarterPlayer" && path[1] === "StarterPlayerScripts") {
			path[0] = "Players";
			path[1] = "LocalPlayer";
			path.splice(2, 0, "PlayerScripts");
		}

		return path;
	} else {
		// RELATIVE PATH
		let path = ["script"];

		let obj = moduleObj;

		if (isDescendantOf(relativeTo, obj)) {
			// .Parent spam
			while (obj !== relativeTo) {
				path.push("Parent");
				relativeTo = relativeTo.parent;
			}
		} else {
			// go up enough
			while (!isDescendantOf(obj, relativeTo)) {
				path.push("Parent");
				relativeTo = relativeTo.parent;
			}

			// go down to module
			function iterate(v: SourcemapObject) {
				if (!v.children) return;
				for (const child of v.children) {
					if (isDescendantOf(obj, child)) {
						path.push(child.name);
						iterate(child);
					}
				}
			}
			iterate(relativeTo);
		}

		return path;
	}
}
