// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { FeatureItem, FeatureProvider } from './providers/feature-provider';
import { TestSuiteProvider, TestSuiteDownloadCommandProvider, TestSuiteLinkCommandProvider, TestSuiteDeleteCommandProvider } from './providers/test-suite-provider';
import { loadXrayConf, deleteBlobReference } from './fileUtils';
import { XrayConf } from './model/xray';
import { FeatureContentProvider } from './providers/feature-content-provider';
import { CucumberFileDecorationProvider } from './providers/file-decoration-provider';
import { WebviewPanel } from 'vscode';
import { ConfigurationProvider } from './providers/configuration-provider';


// Xray configuration global file (for every workspaceFolder)
let xrayConfiguration : XrayConf[];
let featureMap = new Map<string, string>();
let featureProvider : FeatureProvider;
let testSuitProvider : TestSuiteProvider;
let welcomePanel : WebviewPanel;
let cucumberStatusBarItem: vscode.StatusBarItem;
let configurationProvider : ConfigurationProvider;


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Initialize configuration provider
	configurationProvider = new ConfigurationProvider(context);

	welcomePanel = vscode.window.createWebviewPanel(
	'cucumber-welcome', 			// Identifies the type of the webview. Used internally
	'Cucumber Extension : Welcome', // Title of the panel displayed to the user
	vscode.ViewColumn.Beside, 		// Editor column to show the new webview panel in.
	{} // Webview options. More on these later.
	);

	// And set its HTML content
	welcomePanel.webview.html = getWebviewContent();

	 const ftscheme = 'feature';
	 context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(ftscheme, new FeatureContentProvider()));

	// create a new status bar item that we can now manage
	cucumberStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
	context.subscriptions.push(cucumberStatusBarItem);

	// Xray Configuration json file
	xrayConfiguration = loadXrayConf();

	// Enable tree view for feature files
	featureProvider = new FeatureProvider();
	vscode.window.registerTreeDataProvider('feature_treeview', featureProvider);

	// Enable tree view for test suites
	testSuitProvider = new TestSuiteProvider();
	vscode.window.registerTreeDataProvider('testsuite_treeview', testSuitProvider);
	vscode.commands.registerCommand('cucumber-xray-connector.refresh-test-suite', () => {
     	testSuitProvider.refresh(true);
	}
	);

	vscode.commands.registerCommand('cucumber-xray-connector.download-feature', TestSuiteDownloadCommandProvider, testSuitProvider);
	vscode.commands.registerCommand('cucumber-xray-connector.link-feature', TestSuiteLinkCommandProvider, testSuitProvider);
	vscode.commands.registerCommand('cucumber-xray-connector.delete-feature', TestSuiteDeleteCommandProvider, testSuitProvider);

	vscode.commands.registerCommand('cucumber-xray-connector.open-settings', () => {
		vscode.commands.executeCommand("workbench.action.openSettings","Cucumber Xray Connector");
	});

	vscode.commands.registerCommand('cucumber-xray-connector.update-credentials', configurationProvider.updateCredentials, configurationProvider);
			
	vscode.window.registerFileDecorationProvider(new CucumberFileDecorationProvider());

	var watcher = vscode.workspace.createFileSystemWatcher("**/*.feature", false, false, false); //glob search string

	let refreshAction = (uri : vscode.Uri) => {
		featureProvider.refresh();
		testSuitProvider.refresh();
	};

	let refreshActionWithDelete = (uri : vscode.Uri) => {
		deleteBlobReference(uri);
		featureProvider.refresh();
		testSuitProvider.refresh();
	};

	watcher.onDidCreate(refreshAction);
	watcher.onDidChange(refreshAction);
	watcher.onDidDelete(refreshActionWithDelete);

	return {
		confProvider : configurationProvider
	};
}

// this method is called when your extension is deactivated
export function deactivate() {

	//Ensure welcome page get closed if it isn't
	welcomePanel.dispose();
}

// Return global Xray Configuration
export function getXrayConfiguration(){
	return xrayConfiguration;
}

export function updateXrayConfiguration(workspaceIndex : number, configuration : XrayConf){
	xrayConfiguration[workspaceIndex] = configuration;
	featureMap = new Map<string, string>();
	xrayConfiguration[workspaceIndex].blobs.flatMap(testSuite => testSuite.features).forEach(feature => {
		if(feature?.localFileRef){
			featureMap.set(feature?.localFileRef.toString(), feature.filename);
		}
	})
}

export function getXrayFeatureMap(){
	return featureMap;
}

export function triggerFeatureProviderRefresh(id : string, epic : string){
	featureProvider.refresh(id, epic);
}

export function updateStatusBarItem(message : string){
	cucumberStatusBarItem.text = `$(megaphone) ${message}`;
	cucumberStatusBarItem.show();
}

export function getConfigurationProvider(){
	return configurationProvider;
}

function getWebviewContent(): string {
	return `<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Cucumber Extension : Welcome</title>
	</head>
	<body>
		<h3>Welcome to VSCode Cucumber Extension</h3>
		<ul>
			<li>1</li>
			<li>2</li>
		</ul>
	</body>
	</html>`;
}
