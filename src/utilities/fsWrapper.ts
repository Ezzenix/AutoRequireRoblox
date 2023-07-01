import * as fs from "fs";

/*
	Reads the file at the given path
	Automatically parses .json if 'doNotParse' is not true
*/
export function readFile(path: string, doNotParse = false) {
	path = path.replace(/\//g, "\\");
	try {
		const contents = fs.readFileSync(path);
		if (contents) {
			if (path.endsWith(".json") && !doNotParse) {
				return JSON.parse(contents.toString());
			} else {
				return contents.toString();
			}
		}
	} catch (err) {
		return;
	}
}

/*
	Writes to the file at the given path
*/
export function writeFile(path: string, contents: string) {
	path = path.replace(/\//g, "\\");
	try {
		fs.writeFileSync(path, contents, `utf8`);
		return true;
	} catch (err) {
		console.warn(`Failed to write ${path}: ${err}`);
		return false;
	}
}

/*
	Returns true or false depending on if a file exists
*/
export function fileExists(path: string) {
	path = path.replace(/\//g, "\\");
	try {
		fs.accessSync(path);
		return true;
	} catch (err) {
		return false;
	}
}

/*
	Gets the stat of a file at the given path
*/
export function fileStat(path: string) {
	path = path.replace(/\//g, "\\");
	try {
		const stat = fs.statSync(path);
		return stat;
	} catch (err) {
		return false;
	}
}
