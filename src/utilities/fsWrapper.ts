import * as fs from "fs";

/*
	Reads the file at the given path
	Automatically parses .json if 'doNotParse' isn't true
*/
export function readFile(path: string, doNotParse = false): string | undefined {
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
		console.error(`Failed to read ${path}: ${err}`);
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
		console.error(`Failed to write ${path}: ${err}`);
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
		console.error("fileStat error:", err);
		return false;
	}
}
