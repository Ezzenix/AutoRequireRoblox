import { Position, Range, TextEdit } from "vscode";
import { SourcemapObject, isSubModule } from "./sourcemap";
import getGamePath from "./getGamePath";

// Services
export function getServiceVariableName(source: string, serviceName: string): string | undefined {
	const pattern = new RegExp(`^local\\s+(\\w+)\\s+=\\s+game:GetService\\("${serviceName}"\\)`, "gm");
	const match = pattern.exec(source);

	if (match && match.length > 1) {
		return match[1];
	}
}

function getFirstGetServiceLine(source: string): number | undefined {
	const lines = source.split("\n");
	for (let i = 0; i < lines.length; i++) {
		if (/local\s+\w+\s*=\s*game:GetService\("[^"]+"\)/.test(lines[i])) {
			return i;
		}
	}
}

export function createGetServiceEdit(source: string, serviceName: string) {
	const line = getFirstGetServiceLine(source) || 0;
	const range = new Range(new Position(line, 0), new Position(line, 0));
	return new TextEdit(range, `local ${serviceName} = game:GetService("${serviceName}")\n`);
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

function getFirstRequireLine(source: string): number | undefined {
	const lines = source.split("\n");
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].startsWith(`local `) && lines[i].includes("require(")) {
			return i;
		}
	}
}

export function createRequireEdits(source: string, fromObj: SourcemapObject, moduleObj: SourcemapObject) {
	const edits = [];

	let relativeTo: SourcemapObject;
	const isFromSubModule = isSubModule(fromObj);
	const isModuleSubModule = isSubModule(moduleObj);
	if (isFromSubModule && isModuleSubModule && isFromSubModule === isModuleSubModule) {
		relativeTo = fromObj;
	}

	const line = getFirstRequireLine(source) || 0;
	const range = new Range(new Position(line, 0), new Position(line, 0));
	const mainEdit = new TextEdit(range, `local ${moduleObj.name} = require(${getGamePath(moduleObj, relativeTo)})\n`);

	edits.push(mainEdit);
	return edits;
}
