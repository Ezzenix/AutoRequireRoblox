import { readdirSync } from "fs";
import { join } from "path";
import { fileExists, fileStat } from "./fsWrapper";

export type File = {
	type: "module" | "directory";
	name: string;
	path: string;
	children?: File[];
	deep?: boolean;
	parent?: File;
};
/**
	Creates a 'map' of the files at the given directory
	Works with folders and modules that use 'init.lua' 
*/
export default function buildFileMap(rootPath: any) {
	rootPath = rootPath.replace(/\//g, "\\");

	const map = [];

	function traverse(path: string, m, parent = undefined) {
		const files = readdirSync(path);

		for (const fileName of files) {
			try {
				const filePath = `${path}\\${fileName}`;

				const stat = fileStat(filePath);
				if (stat) {
					if (stat.isDirectory()) {
						const isDeepModule = fileExists(join(filePath, "init.lua"));

						if (isDeepModule) {
							// folders with a 'init.lua' file
							const obj = {
								type: "module",
								name: fileName,
								path: filePath,
								deep: true,
								parent: parent,
							};
							m.push(obj);
						} else {
							// normal directory / folder
							const obj = {
								type: "directory",
								name: fileName,
								path: filePath,
								children: [],
								parent: parent,
							};
							traverse(filePath, obj.children, obj);
							m.push(obj);
						}
					}
					if (stat.isFile()) {
						if (fileName.endsWith(".lua") && !fileName.endsWith(".server.lua") && !fileName.endsWith(".client.lua")) {
							// normal lua module file
							const obj = {
								type: "module",
								name: fileName.split(".")[0],
								path: filePath,
								deep: false,
								parent: parent,
							};
							m.push(obj);
						}
					}
				}
			} catch (err) {
				console.warn(err);
			}
		}
	}

	traverse(rootPath, map);
	return map;
}
