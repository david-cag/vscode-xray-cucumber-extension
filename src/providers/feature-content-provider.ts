import * as vscode from "vscode";

export class FeatureContentProvider implements vscode.TextDocumentContentProvider {

    onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    onDidChange = this.onDidChangeEmitter.event;

    provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<string> {
        
        let uric = uri.path.split(":");
        if(uric.length != 2)
            return null;
        return Buffer.from(uric[1], 'base64').toString();
    }
}