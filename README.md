<div align="center">
	<img src="assets/Luna.png" alt="Luna" height="230">
</div>

<hr />

### About
**Luna** creates a module containing all your modules and keeps it updated as you edit your project. It works as a 'module loader' but with intellisense.
You have to use [Rojo](https://rojo.space/) in your project for this to work.\
For intellisene you have to use something like [Roblox LSP](https://github.com/NightrainsRbx/RobloxLsp).

&nbsp;

### Getting Started

1. Install the extension [here](https://marketplace.visualstudio.com/items?itemName=Ezzenix.luna-roblox).
2. Run the '**Luna: Open Menu**' command.
3. Select '**Start Luna**' and a configuration file will be generated for you to edit. See below for information about the config.
4. After customizing the configuration select '**Start Luna**' again to start it.
5. You can now start using it!

\
**Example:**

```lua
-- Require the module created by the extension, the path depends
-- on your "ModuleName" property and your Rojo project configuratin.
local Library = require(game:GetService("ReplicatedStorage").Library)

Library.MyModule.Say("Hello") -- This will now have intellisense unlike 'normal' module loaders.
```

&nbsp;

### Config
|Option|Description|Default Value|
|-|-|-|
|ModuleName|Path of the generated module, automatically created|"ReplicatedStorage/Library"|
|RojoProject|Name of your rojo project|"default.project"|
|ClientRestricted|Directories for client only|["StarterPlayerScripts"]|
|ServerRestricted|Directories for server only|["ServerScriptService"]|
|IndexedFolders|Directories to put in their own category|["ReplicatedStorage/Utils"]|

###### Paths in the config are file paths in your project, not game paths.
###### After configuring your project the extension will automatically start when you open it the next time.

&nbsp;

### Ideas
- [ ] Automatic dependency checking to require the modules in the correct order.

&nbsp;

### Contact
If you need help you can add me on discord **Ezzenix#5500**.