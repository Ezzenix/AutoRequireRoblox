import { Instance, InstanceUtil } from "./sourcemap";

export default function getGamePath(module: Instance, relativeTo?: Instance): string[] {
	if (relativeTo === undefined) {
		// ABSOLUTE PATH
		let path = [];

		let obj = module;

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

		let obj = module;

		if (InstanceUtil.isDescendantOf(relativeTo, obj)) {
			// .Parent spam
			while (obj !== relativeTo) {
				path.push("Parent");
				relativeTo = relativeTo.parent;
			}
		} else {
			// go up enough
			while (!InstanceUtil.isDescendantOf(obj, relativeTo)) {
				path.push("Parent");
				relativeTo = relativeTo.parent;
			}

			// go down to module
			function iterate(v: Instance) {
				if (!v.children) return;
				for (const child of v.children) {
					if (InstanceUtil.isDescendantOf(obj, child)) {
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
