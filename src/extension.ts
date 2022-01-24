// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { NodeDependenciesProvider } from './feature-dependencies-provider';
import { loadXrayConf } from './fileUtils';
import { loadTestPlans } from './jira-connector';
import { XrayConf } from './model/xray';

// Xray configuration global file
let xrayConfiguration : XrayConf

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "cucumber-xray-connector" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('cucumber-xray-connector.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from cucumber-xray-connector!');
	});

	// Xray Configuration json file
	xrayConfiguration = loadXrayConf();

	// Load Test plans from JIRA
	loadTestPlans();

	// Enable tree view for feature files
	vscode.window.registerTreeDataProvider('feature_treeview', new NodeDependenciesProvider());

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

// Return global Xray Configuration
export function getXrayConfiguration(){
	return xrayConfiguration;
}