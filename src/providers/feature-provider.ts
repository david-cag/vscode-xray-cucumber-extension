import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as fileUtils from '../fileUtils';0
import { getConfigurationProvider, getXrayFeatureMap } from '../extension';
import { getFeaturesPath } from '../fileUtils';


export class FeatureProvider implements vscode.TreeDataProvider<FeatureItem> {
  
  features : FeatureItem[] = [];

  constructor() {}

  getTreeItem(element: FeatureItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: FeatureItem): Thenable<FeatureItem[]> {

    if(vscode.workspace.workspaceFolders && getConfigurationProvider().checkConfReady()){

      if(!element && vscode.workspace.workspaceFolders.length > 1){
        // If multiple workspace folders, create a parent folder tree for each
        return Promise.resolve(vscode.workspace.workspaceFolders.map(workspaceFolder => new FeatureItem(workspaceFolder.uri, workspaceFolder.name, "")));
      }
      else{
        let workspaceFolderIndex = vscode.workspace.workspaceFolders.find(workspaceFolder => workspaceFolder.uri == element?.resourceUri)?.index;
        let featuresPath : string = fileUtils.getFeaturesPath(workspaceFolderIndex? workspaceFolderIndex : 0);

        // Evaluate features only for first multi-room workspace        
        if (fileUtils.featuresPathExists(0)) {
          this.features = this.getFeatureFiles(fileUtils.getFeaturesPath(0));
        } else {
          vscode.window.showErrorMessage(`Xray config: ${featuresPath} not found. Please review xray extension configuration`);
        }
      }
    }
    return Promise.resolve(this.features);
  }

  /**
   * Read all feature files from config location
   */
  private getFeatureFiles(featuresPath : string): FeatureItem[] {
    
    let files : FeatureItem[] = [];
    
    fs.readdirSync(featuresPath).forEach(file => {
      if (path.extname(file) == ".feature"){
        let featureFile = getXrayFeatureMap().get(vscode.Uri.file(path.join(featuresPath, file)).toString());
        files.push( new FeatureItem(
          vscode.Uri.parse(`cucumber:style/UNTRACKED/${file}`),
          file,
          featureFile? featureFile : "Untracked"
        ));
      }
    });

    return files;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<FeatureItem | undefined | null | void> = new vscode.EventEmitter<FeatureItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<FeatureItem | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(id?: string, epic?: string): void {
    let feature : FeatureItem | undefined;
    if(id){
      feature = this.features.find(f => f.id == id);
      if(feature){
        feature.setFields(id, epic || "");
        feature.resourceUri = vscode.Uri.parse(`cucumber:style/LINKED/${id}`);
      }
    }
    this._onDidChangeTreeData.fire(feature);
  }
}

export class FeatureItem extends vscode.TreeItem {
  constructor(
    public resourceUri: vscode.Uri,
    public label: string,
    public epic: string) {
      super(resourceUri, vscode.TreeItemCollapsibleState.None);
      this.id = label;
      this.setFields(label, epic);
      this.command = new OpenFeatureCommand(label);
  }

  setFields(label: string, epic: string){
    if(label != epic){
      this.tooltip = `${label} • (${epic})`;
      this.description = `(${epic})`;
    }
    else{
      this.tooltip = label;
      this.description = "";
    }
    this.label = label;
  }

  iconPath = {
    light: path.join(__filename, '..', '..', 'resources', 'light', 'test.svg'),
    dark: path.join(__filename, '..', '..','resources', 'dark', 'test.svg')
  };
}

class OpenFeatureCommand implements vscode.Command {
    
  command = 'vscode.open';
  title = "Title";
  tooltip = "tooltip";
  arguments = [] as any[];

  constructor(filename : string){
    
    this.arguments = [ vscode.Uri.file(path.join(getFeaturesPath(0), filename))];
  }

  setDiff(remoteFilename : string, remoteBlob : string) : vscode.Uri {

    return vscode.Uri.parse(`feature:${remoteFilename}:${Buffer.from(remoteBlob).toString('base64')}`);
  }
}