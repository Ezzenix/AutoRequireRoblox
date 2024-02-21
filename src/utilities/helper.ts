import { Position, Range, TextEdit } from "vscode";
import { SourcemapObject, isDescendantOf, isSubModule } from "./sourcemap";
import getGamePath from "./getGamePath";

function getLastCommentTagLine(source: string): number | undefined {
	const lines = source.split("\n");
	for (let i = lines.length - 1; i >= 0; i--) {
		if (lines[i].trim().startsWith("--!")) {
			return i;
		}
	}
	return 0;
}

// Services
export function getServiceVariableName(source: string, serviceName: string): string | undefined {
	const pattern = new RegExp(`^local\\s+(\\w+)\\s+=\\s+game:GetService\\("${serviceName}"\\)`, "gm");
	const match = pattern.exec(source);

	if (match && match.length > 1) {
		return match[1];
	}
}

function getLastGetServiceLine(source: string): number | undefined {
	const lines = source.split("\n");
	for (let i = lines.length - 1; i >= 0; i--) {
		if (/local\s+\w+\s*=\s*game:GetService\("[^"]+"\)/.test(lines[i])) {
			return i;
		}
	}
	return 0;
}

export function createGetServiceEdit(source: string, serviceName: string) {
	const lastGetServiceLine = getLastGetServiceLine(source);
	const line = Math.max(lastGetServiceLine, getLastCommentTagLine(source));
	const range = new Range(new Position(line, 0), new Position(line, 0));
	return new TextEdit(
		range,
		`${lastGetServiceLine === 0 ? "\n" : ""}local ${serviceName} = game:GetService("${serviceName}")\n`
	);
}

// Modules
export function isRequiringModule(source: string, moduleObj: SourcemapObject) {
	const lines = source.split("\n");
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].startsWith(`local ${moduleObj.name} = require(`)) {
			return true;
		}
	}
	return false;
}

function getLastRequireLine(source: string): number | undefined {
	const lines = source.split("\n");
	for (let i = lines.length - 1; i >= 0; i--) {
		if (lines[i].startsWith(`local `) && lines[i].includes("require(")) {
			return i;
		}
	}
	return 0;
}

export function createRequireEdits(source: string, fromObj: SourcemapObject, moduleObj: SourcemapObject) {
	const edits = [];

	let relativeTo: SourcemapObject;
	const isFromSubModule = isSubModule(fromObj);
	const isModuleSubModule = isSubModule(moduleObj);
	if (isFromSubModule && isModuleSubModule && isFromSubModule === isModuleSubModule) {
		relativeTo = fromObj;
	}
	if (isDescendantOf(moduleObj, fromObj)) {
		relativeTo = fromObj;
	}
	const path = getGamePath(moduleObj, relativeTo);

	if (path[0] !== "script") {
		// if the require starts with a service
		const serviceName = path[0];
		const serviceVar = getServiceVariableName(source, serviceName);
		if (serviceVar) {
			// use already defined service variable
			path[0] = serviceVar;
		} else {
			// create new service variable
			edits.push(createGetServiceEdit(source, serviceName));
		}
	}

	const lastGetRequireLine = getLastRequireLine(source);
	const line = Math.max(getLastGetServiceLine(source), lastGetRequireLine, getLastCommentTagLine(source));
	const range = new Range(new Position(line, 0), new Position(line, 0));
	const mainEdit = new TextEdit(
		range,
		`${lastGetRequireLine === 0 ? "\n" : ""}local ${moduleObj.name} = require(${path.join(".")})\n`
	);

	edits.push(mainEdit);
	return edits;
}
