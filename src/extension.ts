// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import { FeatureItem, FeatureProvider } from './providers/feature-provider';
import { TestSuiteProvider, TestSuiteDownloadCommandProvider, TestSuiteLinkCommandProvider, TestSuiteDeleteCommandProvider, TestSuiteUnlinkCommandProvider, TestSuiteDiscardCommandProvider } from './providers/test-suite-provider';
import { loadXrayConf, deleteRelatedBlobReference, readDocMarkdown } from './fileUtils';
import { XrayConf } from './model/xray';
import { FeatureContentProvider } from './providers/feature-content-provider';
import { CucumberFileDecorationProvider } from './providers/file-decoration-provider';
import { WebviewPanel } from 'vscode';
import { ConfigurationFields, ConfigurationProvider } from './providers/configuration-provider';

var md = require('markdown-it')({ html: true});


// Xray configuration global file (for every workspaceFolder)
let xrayConfiguration : XrayConf[];
let featureMap : Map<string, string[]>[] = [];
let featureProvider : FeatureProvider;
let testSuitProvider : TestSuiteProvider;
let welcomePanel : WebviewPanel | null;
let cucumberStatusBarItem: vscode.StatusBarItem;
let configurationProvider : ConfigurationProvider;


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Initialize configuration provider
	configurationProvider = new ConfigurationProvider(context);

	if(configurationProvider.getProperty(ConfigurationFields.SHOW_WELCOME)){
		// Create Welcome Panel and set its HTML content
		createWelcomePanel(context);
		renderWelcomeWebView(context, welcomePanel as WebviewPanel);
	}

	 const ftscheme = 'feature';
	 context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(ftscheme, new FeatureContentProvider()));

	// create a new status bar item that we can now manage
	cucumberStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
	context.subscriptions.push(cucumberStatusBarItem);

	// Xray Configuration json file
	xrayConfiguration = loadXrayConf();
	xrayConfiguration.forEach((_value, index) =>  updateXrayFeatureMap(index));

	// Enable tree view for feature files
	featureProvider = new FeatureProvider();
	vscode.window.registerTreeDataProvider('feature_treeview', featureProvider);

	// Enable tree view for test suites
	testSuitProvider = new TestSuiteProvider();
	vscode.window.registerTreeDataProvider('testsuite_treeview', testSuitProvider);
	vscode.commands.registerCommand('vscode-xray-cucumber-extension.refresh-test-suite', () => {
     	testSuitProvider.refresh(true);
	}
	);

	vscode.commands.registerCommand('vscode-xray-cucumber-extension.download-feature', TestSuiteDownloadCommandProvider, testSuitProvider);
	vscode.commands.registerCommand('vscode-xray-cucumber-extension.link-feature', TestSuiteLinkCommandProvider, testSuitProvider);
	vscode.commands.registerCommand('vscode-xray-cucumber-extension.unlink-feature', TestSuiteUnlinkCommandProvider, testSuitProvider);
	vscode.commands.registerCommand('vscode-xray-cucumber-extension.delete-feature', TestSuiteDeleteCommandProvider, testSuitProvider);
	vscode.commands.registerCommand('vscode-xray-cucumber-extension.discard-changes', TestSuiteDiscardCommandProvider, testSuitProvider);

	vscode.commands.registerCommand('vscode-xray-cucumber-extension.open-settings', () => {
		vscode.commands.executeCommand("workbench.action.openSettings","Xray Cucumber Extension");
	});

	vscode.commands.registerCommand('vscode-xray-cucumber-extension.update-credentials', configurationProvider.updateCredentials, configurationProvider);
	vscode.commands.registerCommand('vscode-xray-cucumber-extension.open-doc', () => {
		if(welcomePanel == undefined || welcomePanel == null)
			createWelcomePanel(context);
		renderWelcomeWebView(context, welcomePanel as WebviewPanel);
	});
				
	vscode.window.registerFileDecorationProvider(new CucumberFileDecorationProvider());

	var watcher = vscode.workspace.createFileSystemWatcher("**/*.feature", false, false, false); //glob search string

	let refreshAction = () => {
		featureProvider.refresh();
		testSuitProvider.refresh();
	};

	let refreshActionWithDelete = (uri : vscode.Uri) => {
		deleteRelatedBlobReference(uri);
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

function createWelcomePanel(context: vscode.ExtensionContext) {
	welcomePanel = vscode.window.createWebviewPanel(
		'cucumber-welcome',
		'Cucumber Extension : Welcome',
		vscode.ViewColumn.One,
		{
			localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, "resources/doc"))]
		}
	);

	welcomePanel.onDidDispose(() => {
		welcomePanel = null;
	});
}

// this method is called when your extension is deactivated
export function deactivate() {

	//Ensure welcome page get closed if it isn't
	welcomePanel = null;
}

// Return global Xray Configuration
export function getXrayConfiguration(){
	return xrayConfiguration;
}

export function updateXrayConfiguration(workspaceIndex : number, configuration : XrayConf){
	xrayConfiguration[workspaceIndex] = configuration;
	updateXrayFeatureMap(workspaceIndex);
}

function updateXrayFeatureMap(workspaceIndex: number) {
	featureMap[workspaceIndex] = new Map<string, string[]>();
	xrayConfiguration[workspaceIndex].blobs.flatMap(testSuite => testSuite.features).forEach(feature => {
		if (feature?.localFileRef) {
			var key = feature?.localFileRef.toString();
			if (!featureMap[workspaceIndex].has(key)) {
				featureMap[workspaceIndex].set(key, [feature.filename]);
			}
			else {
				featureMap[workspaceIndex].get(key)?.push(feature.filename);
			}
		}
	});
}

export function getXrayFeatureMap(workspaceIndex : number){
	return featureMap[workspaceIndex];
}

export function triggerFeatureProviderRefresh(id : string, linkedRemoteFiles? : string[]){
	featureProvider.refresh(id, linkedRemoteFiles);
}

export function updateStatusBarItem(message : string){
	cucumberStatusBarItem.text = `$(megaphone) ${message}`;
	cucumberStatusBarItem.show();
}

export function getConfigurationProvider(){
	return configurationProvider;
}

function renderWelcomeWebView(context: vscode.ExtensionContext, webViewPanel : WebviewPanel){

	let html : string = md.render(readDocMarkdown());
	webViewPanel.webview.html = html;
	replaceResourceUri(webViewPanel.webview, context, webViewPanel,'logo.png');
	replaceResourceUri(webViewPanel.webview, context, webViewPanel,'extensions.png');
	replaceResourceUri(webViewPanel.webview, context, webViewPanel,'moreactions.png');
	replaceResourceUri(webViewPanel.webview, context, webViewPanel, 'refreshBtn.png');
	replaceResourceUri(webViewPanel.webview, context, webViewPanel, 'cucumber.png');
	replaceResourceUri(webViewPanel.webview, context, webViewPanel, 'explorerView.png');
	replaceResourceUri(webViewPanel.webview, context, webViewPanel, 'jiraCredentials.png');
	replaceResourceUri(webViewPanel.webview, context, webViewPanel, 'jiraCredentialsUser.png');
	replaceResourceUri(webViewPanel.webview, context, webViewPanel, 'jiraCredentialsPwd.png');

	// Scenarios
	replaceResourceUri(webViewPanel.webview, context, webViewPanel, 'scenarioUntracked.png');
	replaceResourceUri(webViewPanel.webview, context, webViewPanel, 'downloadBtn.png');
	replaceResourceUri(webViewPanel.webview, context, webViewPanel, 'linkBtn.png');
	replaceResourceUri(webViewPanel.webview, context, webViewPanel, 'unlinkBtn.png');
}

function replaceResourceUri(webView : vscode.Webview, context: vscode.ExtensionContext, webViewPanel: vscode.WebviewPanel, resourceName : string) {
	
	// Get path to resource on disk
	const filePath = vscode.Uri.file(
		path.join(context.extensionPath, 'resources/doc', resourceName)
	);

	// And get the special URI to use with the webview
	const uri = webViewPanel.webview.asWebviewUri(filePath);

	webView.html = webView.html.replace("//" + resourceName, uri.toString());
	
}

