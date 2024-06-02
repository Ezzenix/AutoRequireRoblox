import { Position, Range, TextEdit } from "vscode";
import getGamePath from "./getGamePath";
import { Instance, InstanceUtil } from "./sourcemap";

// Generic line serach function
function getLastLineWhere(source: string, checker: (string) => boolean): [boolean, number] {
	const lines = source.split("\n");
	for (let i = lines.length - 1; i >= 0; i--) {
		if (checker(lines[i])) return [true, i];
	}
	return [false, 0];
}

function getLastCommentTagLine(source: string) {
	return getLastLineWhere(source, (line) => line.trim().startsWith("--!"));
}

function getLastGetServiceLine(source: string) {
	return getLastLineWhere(source, (line) => /local\s+\w+\s*=\s*game:GetService\("[^"]+"\)/.test(line));
}

function getLastRequireLine(source: string) {
	return getLastLineWhere(source, (line) => line.startsWith(`local `) && line.includes("require("));
}

// Services
export function getServiceVariableName(source: string, serviceName: string): string | undefined {
	const pattern = new RegExp(`^local\\s+(\\w+)\\s+=\\s+game:GetService\\("${serviceName}"\\)`, "gm");
	const match = pattern.exec(source);
	if (match && match.length > 1) {
		return match[1];
	}
}

export function createGetServiceEdit(source: string, serviceName: string) {
	const [hasCommentTagLine, lastCommentTagLine] = getLastCommentTagLine(source);
	const [hasGetServiceLine, lastGetServiceLine] = getLastGetServiceLine(source);

	let line = Math.max(lastGetServiceLine, lastCommentTagLine);
	if (hasCommentTagLine) line += 1;

	let newLinesBefore = 0;
	if (!hasGetServiceLine && line !== 0) newLinesBefore += 1;

	let newLinesAfter = 1;
	if (!hasGetServiceLine) newLinesAfter = 2;

	const text = `${"\n".repeat(newLinesBefore)}local ${serviceName} = game:GetService("${serviceName}")${"\n".repeat(
		newLinesAfter
	)}`;

	return new TextEdit(new Range(new Position(line, 0), new Position(line, 0)), text);
}

// Require
export function isRequiringModule(source: string, moduleObj: Instance) {
	return getLastLineWhere(source, (line) => line.startsWith(`local ${moduleObj.name} = require(`))[0];
}

function joinPath(path: string[]): string {
	return path.reduce((acc, str) => {
		if (str.includes(" ")) {
			return `${acc}["${str}"]`;
		} else {
			return acc ? `${acc}.${str}` : str;
		}
	}, "");
}

export function createRequireEdits(source: string, fromObj: Instance, moduleObj: Instance) {
	const edits = [];

	let relativeTo: Instance;
	const isFromSubModule = InstanceUtil.getParentModule(fromObj);
	const isModuleSubModule = InstanceUtil.getParentModule(moduleObj);
	if (isFromSubModule && isModuleSubModule && isFromSubModule === isModuleSubModule) {
		relativeTo = fromObj;
	}
	if (InstanceUtil.isDescendantOf(moduleObj, fromObj)) {
		relativeTo = fromObj;
	}
	const path = getGamePath(moduleObj, relativeTo);

	let serviceEdit: TextEdit;
	if (path[0] !== "script") {
		const serviceName = path[0];
		const serviceVar = getServiceVariableName(source, serviceName);
		if (serviceVar) {
			// use already defined service variable
			path[0] = serviceVar;
		} else {
			// create new service variable
			serviceEdit = createGetServiceEdit(source, serviceName);
			edits.push(serviceEdit);
		}
	}

	const [hasRequireLine, lastRequireLine] = getLastRequireLine(source);
	const [hasCommentTagLine, lastCommentTagLine] = getLastCommentTagLine(source);
	const [hasGetServiceLine, lastGetServiceLine] = getLastGetServiceLine(source);

	let line = Math.max(lastGetServiceLine, lastCommentTagLine, lastRequireLine);
	if (hasCommentTagLine || hasGetServiceLine) line += 1;

	let newLinesBefore = 0;
	if (!hasRequireLine && line !== 0) newLinesBefore += 1;

	let newLinesAfter = 1;
	if (!hasRequireLine) newLinesAfter = 2;

	const text = `${"\n".repeat(newLinesBefore)}local ${moduleObj.name} = require(${joinPath(path)})${"\n".repeat(
		newLinesAfter
	)}`;

	edits.push(new TextEdit(new Range(new Position(line, 0), new Position(line, 0)), text));
	return edits;
}
