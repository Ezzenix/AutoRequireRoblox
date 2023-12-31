import { normalize } from "path";

export default function mapRojoTree(rojoTree: any) {
	const rojoMap = {};
	function traverse(obj: any, parentPath = "") {
		for (let key in obj) {
			let value = obj[key];
			if (typeof value === "object") {
				// new directory
				const currentPath = parentPath ? `${parentPath}/${key}` : key;
				traverse(value, currentPath);
			} else if (key === "$path") {
				// path value
				rojoMap[`${normalize(value)}`] = parentPath.replace("/", ".").replace(/\//g, ".");
			}
		}
	}
	traverse(rojoTree);
	return rojoMap;
}
