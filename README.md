<div align="center">
	<img src="assets/Luna.png" alt="Luna" height="250">
</div>

<hr />

### Features
**Luna** creates a module containing all your modules and keeps it updated as you edit your project. It works as a 'module loader' but with intellisense.

#
### Important
You have to use [Rojo](https://rojo.space/) in your project for this to work.\
For intellisene you have to use something like [Roblox LSP](https://github.com/NightrainsRbx/RobloxLsp).

#
### How to use

1. Install the extension [here](https://www.youtube.com/watch?v=dQw4w9WgXcQ&ab_channel=RickAstley).
2. Run the '**Luna: Open Menu**' command.
3. Select '**Start Luna**' and a configuration file will be generated for you to edit. See below for information about the config.
4. After customizing the configuration select '**Start Luna**' again to start it.
5. You can now start using it!


**Example:**

```lua
-- Require the module created by the extension, the path depends
-- on your "ModuleName" property and your Rojo project configuratin.
local Library = require(game:GetService("ReplicatedStorage").Library)

Library.MyModule.Say("Hello") -- This will now have intellisense unlike 'normal' module loaders.
```

#
### Config

|Name|Description|Default|
|-|-|-|
|ModuleName|The path of the module to insert into, created automatically|"ReplicatedStorage/Library"|
|RojoProject|The name of your rojo project, usually default.project|"default.project"|
|ClientRestricted|Directories that are only required client-side.|["StarterPlayerScripts"]|
|ServerRestricted|Directories that are only required server-side.|["ServerScriptService"]|
|IndexedFolders|Directories that will be put in their own category.|["ReplicatedStorage/Utils"]|

###### Paths in the config are file paths in your project, not game paths.
###### After configuring your project the extension will automatically start when you open it the next time.

#
### Ideas
- [ ] Automatic dependency checking to require the modules in the correct order.

#
### Contact

If you need help you can add me on discord **Ezzenix#5500**.