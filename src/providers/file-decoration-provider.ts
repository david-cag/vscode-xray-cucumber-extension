import { urlToOptions } from "@vscode/test-electron/out/util";
import { CancellationToken, Event, FileDecoration, FileDecorationProvider, ProviderResult, ThemeColor, Uri } from "vscode";
import { FeatureStatus } from "../model/feature";
import { StatusThemeColor } from "../style/status-theme-color";

export class CucumberFileDecorationProvider implements FileDecorationProvider {

    onDidChangeFileDecorations?: Event<Uri | Uri[] | undefined> | undefined;
    provideFileDecoration(uri: Uri, token: CancellationToken): ProviderResult<FileDecoration> {

        let decorator = undefined;
        if(uri.scheme == "cucumber"){
            let matchResult = uri.path.match(/style\/(.*?)\/.*/);
            if(matchResult && matchResult[1] != 'undefined'){
                let status : FeatureStatus = matchResult[1] as FeatureStatus;
                decorator = new FileDecoration(status.charAt(0).toUpperCase(), status, new StatusThemeColor(status));
            }
        }
        return decorator;
    }
    
}