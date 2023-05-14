<div align="center">
	<img src="assets/Luna.png" alt="Luna" height="250">
</div>

### Features
Creates a module containing all your modules and keeps it updated as you edit your project. It works as a 'module loader' but with intellisense.

### Important
You have to use [Rojo](https://rojo.space/) in your project for this to work.\
For intellisene you have to use something like [Roblox LSP](https://github.com/NightrainsRbx/RobloxLsp).

### How to use

1. Install the extension.
2. Run the 'Luna: Open Menu' command.
3. Select 'Start Luna' and a configuration file will be generated for you to edit.

	```json
    {
        // The path/name of the module to insert into.
        // Make sure you do not already have an existing module.
        "ModuleName": "ReplicatedStorage/Library",

        // The name of your rojo project, usually default.project.
        "RojoProject": "default.project",

        // Directories that are only required client-side.
        // Note: This is your file path, NOT the game path.
        "ClientRestricted": ["StarterPlayerScripts"],

        // Directories that are only required server-side.
        // Note: This is your file path, NOT the game path.
        "ServerRestricted": ["ServerScriptService"],

        // Directories that will be put in their own category.
        "IndexedFolders": ["ReplicatedStorage/Utils"]
    }
    ```
4. After customizing the configuration select 'Start Luna' again to start it.
5. You can now start using it!

#
Example:

```lua
-- Require the module created by the extension, the path depends
-- on your "ModuleName" property and your Rojo project configuratin.
local Library = require(game:GetService("ReplicatedStorage").Library)

Library.MyModule.Say("Hello") -- This will now have intellisense unlike 'normal' module loaders.
```

#
###### After configuring your project the extension will automatically start when you open it the next time.


### Contact

If you need help you can add me on discord **Ezzenix#5500**.