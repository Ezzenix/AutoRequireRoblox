## Features

* **Module AutoCompletion**: Creates autocompletions for your modules and automatically requires them if necessary.
<img src="assets/AutoComplete.gif" width="100%" />

* **Module Collections**: Automatically requires all child modules of a module. Just put `--@AutoRequireCollection` in your `init.lua` file.
<img src="assets/Collection2.png" width="100%" />

&nbsp;

## Install
* Setup [Rojo](https://rojo.space/) in your project if you haven't already.
* Download the extension from the extensions tab.

&nbsp;

## Config
You can create a config file `.autorequire.json` by running the `AutoRequire: Create configuration file` command in the command palette.
|Option|Description|Default|
|-|-|-|
|rojoProject|Path to the Rojo project you are using|"default.project.json"|
|enableModuleCollection|Should module collections be enabled|true|