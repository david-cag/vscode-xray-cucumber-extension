// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { FeatureProvider } from './providers/feature-provider';
import { TestSuiteProvider, TestSuiteDownloadCommandProvider, TestSuiteLinkCommandProvider } from './providers/test-suite-provider';
import { loadXrayConf } from './fileUtils';
import { loadTestPlans } from './jira-connector';
import { XrayConf } from './model/xray';
import { FeatureContentProvider } from './providers/feature-content-provider';
import { CucumberFileDecorationProvider } from './providers/file-decoration-provider';

// Xray configuration global file
let xrayConfiguration : XrayConf;
let featureProvider : FeatureProvider;
let testSuitProvider : TestSuiteProvider;

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

	 const ftscheme = 'feature';
	 context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(ftscheme, new FeatureContentProvider()));


	// Xray Configuration json file
	xrayConfiguration = loadXrayConf();

	// Enable tree view for feature files
	featureProvider = new FeatureProvider();
	vscode.window.registerTreeDataProvider('feature_treeview', featureProvider);

	var watcher = vscode.workspace.createFileSystemWatcher("**/*.feature", false, false, false); //glob search string

	let refreshAction = (uri : vscode.Uri) => {
		vscode.window.showInformationMessage("change applied!");
		featureProvider.refresh();
		
	};

	watcher.onDidCreate(refreshAction);
	watcher.onDidChange(refreshAction);
	watcher.onDidDelete(refreshAction);
	

	// Enable tree view for test suites
	 testSuitProvider = new TestSuiteProvider();
	 vscode.window.registerTreeDataProvider('testsuite_treeview', testSuitProvider);
	 vscode.commands.registerCommand('cucumber-xray-connector.refresh-test-suite', () =>
     	testSuitProvider.refresh()
  	 );

	context.subscriptions.push(disposable);

	vscode.commands.registerCommand('cucumber-xray-connector.download-feature', TestSuiteDownloadCommandProvider, testSuitProvider);
	vscode.commands.registerCommand('cucumber-xray-connector.link-feature', TestSuiteLinkCommandProvider, testSuitProvider);
	
	vscode.window.registerFileDecorationProvider(new CucumberFileDecorationProvider());

}

// this method is called when your extension is deactivated
export function deactivate() {}

// Return global Xray Configuration
export function getXrayConfiguration(){
	return xrayConfiguration;
}

export function updateXrayConfiguration(configuration : XrayConf){
	xrayConfiguration = configuration;
}