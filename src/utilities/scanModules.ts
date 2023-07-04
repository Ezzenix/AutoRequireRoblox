import getGamePath from "../utilities/getGamePath";
import buildFileMap, { File } from "./buildFileMap";

export type ModuleInfo = {
	name: string;
	gamePath: string;
	filePath: string;
};

export default function scanModules(path: string, rojoMap: any) {
	const fileMap = buildFileMap(path);
	const modules: ModuleInfo[] = [];

	function traverseFiles(files: File[]) {
		files.forEach((file) => {
			if (file.type === "directory") {
				traverseFiles(file.children);
			} else {
				const gamePath = getGamePath(file.path, rojoMap);
				modules.push({
					name: file.name,
					gamePath: gamePath,
					filePath: file.path,
				});
			}
		});
	}

	traverseFiles(fileMap);
	return modules;
}
