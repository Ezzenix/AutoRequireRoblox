import * as vscode from "vscode"
import * as pathModule from "path"
import * as Utils from "./utils"
import * as SessionManager from "./sessionManager"

// Get the 'version' from package.json
const packageJson = Utils.ReadFile(pathModule.join(__dirname, "..", "package.json"))
const version = packageJson ? packageJson.version : "<unknown>"

type Item = {
	label: string
	description?: string
	detail?: string
	action?: string
}

// Opens a QuickPickMenu for the current workspace
export function Open() {
	const workspace = Utils.GetActiveWorkspace()
	if (!workspace) return

	const isRunning = SessionManager.Get(workspace) != undefined

	// Create menu
	const menu = vscode.window.createQuickPick()
	menu.items = [
		{
			label: "$(sparkle) Luna",
			detail: `You are using version ${version}`,
		},
		{
			label: !isRunning ? `$(play) Start` : `$(debug-stop) Stop`,
			detail: !isRunning
				? "Luna is not currently running. Select to start it."
				: "Luna is running in this project. Select to stop it.",
			action: !isRunning ? "start" : "stop",
		},
		{
			label: `$(link-external) View on GitHub`,
			detail: `Open the GitHub page for help.`,
			action: "viewGithub",
		},
	] as Item[]

	menu.onDidChangeSelection((selection) => {
		if (selection.length <= 0) return
		const selectedItem: Item = selection[0]

		if (!selectedItem || !selectedItem.action) return
		menu.hide()

		switch (selectedItem.action) {
			case "start":
				SessionManager.Start(workspace, false)
				setTimeout(Open, 50)
				break

			case "stop":
				SessionManager.Destroy(workspace)
				setTimeout(Open, 50)
				break

			case "viewGithub":
				vscode.env.openExternal(vscode.Uri.parse("https://github.com/Ezzenix/Luna"))
				break
		}
	})

	menu.onDidHide(() => menu.dispose())
	menu.show()
}
