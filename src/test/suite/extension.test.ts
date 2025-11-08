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

	test('Configuration Provider test', async () => {
		const testUser = "TEST_USER";
		
		// Mock workspace configuration to track what gets updated
		let savedConfigValue: string | undefined;
		const mockConfiguration = {
			get: (key: string) => undefined,  // Return undefined to force input prompt
			update: (key: string, value: any, target: any) => {
				savedConfigValue = value;
				return Promise.resolve();
			}
		};

		// Mock workspace.getConfiguration to return our mock
		const originalGetConfiguration = vscode.workspace.getConfiguration;
		vscode.workspace.getConfiguration = () => mockConfiguration as any;

		// Mock window.showInputBox to return our test user
		const originalShowInputBox = vscode.window.showInputBox;
		vscode.window.showInputBox = () => Promise.resolve(testUser);

		try {
			// Create a mock context with secrets property
			const mockContext = {
				secrets: {
					store: (key: string, value: string) => Promise.resolve(),
					get: (key: string) => Promise.resolve(undefined),
					delete: (key: string) => Promise.resolve()
				},
				workspaceState: {
					get: (key: string) => undefined,
					update: (key: string, value: any) => Promise.resolve()
				}
			} as any;

			// Test that ConfigurationProvider can be instantiated without throwing errors
			let provider = new ConfigurationProvider(mockContext);
			
			// Test that the provider exists
			assert.ok(provider, 'ConfigurationProvider should be created successfully');
			
			// Test getUsername method with user input
			const configuredUser = await provider.getUsername();
			
			// Validate that the user provided input (TEST_USER) is properly returned
			assert.strictEqual(configuredUser, testUser, 'Username should match the test user input');
			
			// Validate that the configuration was properly saved
			assert.strictEqual(savedConfigValue, testUser, 'Configuration should be updated with the test user input');
			
		} finally {
			// Restore original methods
			vscode.workspace.getConfiguration = originalGetConfiguration;
			vscode.window.showInputBox = originalShowInputBox;
		}
	}).timeout(50000);

	test('Configuration Provider password test', async () => {
		const testPassword = "TEST_PASSWORD";
		
		// Track what gets stored in secrets
		let storedSecret: string | undefined;
		let storedSecretKey: string | undefined;
		
		// Mock window.showInputBox to return our test password
		const originalShowInputBox = vscode.window.showInputBox;
		vscode.window.showInputBox = (options?: any) => {
			// Check if it's asking for password (password field should be true)
			if (options?.password) {
				return Promise.resolve(testPassword);
			}
			return Promise.resolve("default");
		};

		try {
			// Create a mock context with secrets property that tracks storage
			const mockContext = {
				secrets: {
					store: (key: string, value: string) => {
						storedSecretKey = key;
						storedSecret = value;
						return Promise.resolve();
					},
					get: (key: string) => Promise.resolve(undefined),
					delete: (key: string) => Promise.resolve()
				},
				workspaceState: {
					get: (key: string) => undefined,
					update: (key: string, value: any) => Promise.resolve()
				}
			} as any;

			// Test that ConfigurationProvider can be instantiated without throwing errors
			let provider = new ConfigurationProvider(mockContext);
			
			// Test getPassword method with user input
			const configuredPassword = await provider.getPassword();
			
			// Validate that the user provided password input is properly returned
			assert.strictEqual(configuredPassword, testPassword, 'Password should match the test password input');
			
			// Validate that the password was properly stored in secrets
			assert.strictEqual(storedSecret, testPassword, 'Password should be stored in secrets with the test password input');
			assert.strictEqual(storedSecretKey, 'JIRA_PWD', 'Password should be stored with the correct key');
			
		} finally {
			// Restore original methods
			vscode.window.showInputBox = originalShowInputBox;
		}
	}).timeout(50000);
});

async function extensionActivate() {

	const ext = vscode.extensions.getExtension("dcasagu.vscode-xray-cucumber-extension");
	await ext?.activate();
	return ext?.exports;
}
