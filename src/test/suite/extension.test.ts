import * as assert from 'assert';
import { anything, capture, instance, mock, spy, when } from 'ts-mockito';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { activate } from '../../extension';
import { ConfigurationProvider } from '../../providers/configuration-provider';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test('Configuration Provider test', () => {

		const testUser = "TEST_USER";
		const spiedVscodeWindow = spy(vscode.window);
		
		when(spiedVscodeWindow.showInputBox(anything(), anything())).thenReturn(
			Promise.resolve(testUser)
		);
		const myExtensionContext = extensionActivate();

		return myExtensionContext.then( (configurationProvider) => {
			let provider = new ConfigurationProvider(null);
			let configuredUser = provider.getUsername();
			return configuredUser.then( (user) => {
				assert.strictEqual(testUser, user)
			});
		});
	}).timeout(50000);
});

async function extensionActivate() {

	const ext = vscode.extensions.getExtension("dcasagu.cucumber-xray-connector");
	await ext?.activate();
	return ext?.exports;
}
