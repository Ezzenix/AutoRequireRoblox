import * as fs from "fs";
import * as vscode from "vscode";

/*
	Reads the file at the given path
	Automatically parses .json if 'doNotParse' is not true
*/
export function ReadFile(path: string, doNotParse = false) {
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
export function WriteFile(path: string, contents: string) {
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
export function FileExists(path: string) {
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
export function FileStat(path: string) {
    path = path.replace(/\//g, "\\");
    try {
        const stat = fs.statSync(path);
        return stat;
    } catch (err) {
        return false;
    }
}

/*
	Gets the workspace of the active editor
*/
export function GetActiveWorkspace() {
    const activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor) return;
    const documentUri = activeTextEditor.document.uri;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(documentUri);
    if (!workspaceFolder) return;
    return workspaceFolder.uri.fsPath;
}

/*
	Converts the rojo tree to a easier form
	["filePath"] = "gamePath"
*/
export function MapRojoTree(rojoTree: any) {
    const rojoMap = {};
    function traverse(obj, parentPath = "") {
        for (let key in obj) {
            let value = obj[key];
            if (typeof value === "object") {
                // new directory
                const currentPath = parentPath ? `${parentPath}/${key}` : key;
                traverse(value, currentPath);
            } else if (key === "$path") {
                // path value
                rojoMap[`${value}`] = parentPath.replace("/", ".");
            }
        }
    }
    traverse(rojoTree);
    return rojoMap;
}

/*
	Creates a 'map' of the files at the given directory
	Works with folders and modules that use 'init.lua' 
*/
export function BuildFileMap(rootPath: any) {
    rootPath = rootPath.replace(/\//g, "\\");

    const map = [];

    function traverse(path: string, m, parent = undefined) {
        const files = fs.readdirSync(path);

        for (const fileName of files) {
            try {
                const filePath = `${path}\\${fileName}`;

                const stat = fs.statSync(filePath);
                if (stat) {
                    if (stat.isDirectory()) {
                        let isDeepModule = false;
                        try {
                            fs.accessSync(`${filePath}\\init.lua`);
                            isDeepModule = true;
                        } catch (err) {}

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
                        if (
                            fileName.endsWith(".lua") &&
                            !fileName.endsWith(".server.lua") &&
                            !fileName.endsWith(".client.lua")
                        ) {
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

/*
	Gets the gamePath from filePath
*/
export function GetGamePath(path: string, rojoMap: any) {
    path = path.replace(/\\/g, "/");

    // remove everything before until src
    const srcIndex = path.indexOf("src");
    if (srcIndex !== -1) {
        path = path.slice(srcIndex);
    }

    // remove the fileName so the directory is last
    const lastIndex = path.lastIndexOf("/");
    if (lastIndex !== -1) {
        path = path.substring(0, lastIndex);
    }

    // gets directory path from rojo + remaining directories, thank you ChatGPT
    let remainingPath = "";
    let value = null;
    for (const key in rojoMap) {
        if (path.startsWith(key)) {
            const pathWithoutKey = path.slice(key.length).replace(/^\//, "");
            const parts = pathWithoutKey.split("/");
            if (!value || parts.length < remainingPath.split(".").length) {
                remainingPath = parts.join(".");
                value = rojoMap[key];
            }
        }
    }
    const gamePath = value ? `${value}${remainingPath == "" ? "" : "."}${remainingPath}` : null;

    // add :GetService()
    var split = gamePath.split(".");
    var service = `game:GetService("${split[0]}")`;
    split.shift();
    return split.length > 0 ? `${service}.${split.join(".")}` : service;
}
