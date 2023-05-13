const fs = require("fs");

module.exports = {
    ReadFile: (path) => {
        path = path.replace(/\//g, "\\");
        try {
            const contents = fs.readFileSync(path);
            if (path.endsWith(".json")) {
                return JSON.parse(contents);
            } else {
                return contents;
            }
        } catch (err) {
            return;
        }
    },
    WriteFile: (path, contents) => {
        path = path.replace(/\//g, "\\");
        try {
            fs.writeFileSync(path, contents, `utf8`);
            return true;
        } catch (err) {
            return false;
        }
    },
    FileExists: (path) => {
        path = path.replace(/\//g, "\\");
        try {
            fs.accessSync(path);
            return true;
        } catch (err) {
            return false;
        }
    },
    FileStat: (path) => {
        path = path.replace(/\//g, "\\");
        try {
            const stat = fs.stat(path);
            return stat;
        } catch (err) {
            return false;
        }
    },

    MapRojoTree: (rojoTree) => {
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
    },

    BuildFileMap: (rootPath) => {
        rootPath = rootPath.replace(/\//g, "\\");

        const map = [];

        function traverse(path, m, parent) {
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
    },

    GetInGamePath: (path, rojoMap) => {
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
    },
};
