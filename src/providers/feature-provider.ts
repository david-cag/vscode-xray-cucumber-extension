import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as fileUtils from '../fileUtils';


export class FeatureProvider implements vscode.TreeDataProvider<Dependency> {
  
  constructor() {}

  getTreeItem(element: Dependency): vscode.TreeItem {
    return element;
  }

  getChildren(element?: Dependency): Thenable<Dependency[]> {

    if(vscode.workspace.workspaceFolders){

      let featuresPath : string = fileUtils.getFeaturesPath(0);

      // Evaluate features only for first multi-room workspace        
      if (fileUtils.featuresPathExists(0)) {
        return Promise.resolve(this.getFeatureFiles(fileUtils.getFeaturesPath(0)));
      } else {
        vscode.window.showErrorMessage(`Xray config: ${featuresPath} not found. Please review xray extension configuration`);
        return Promise.resolve([new Dependency("<Configuration not properly initialized>", "")]);
      }
    }
    else{
      return Promise.resolve([new Dependency("<No workspace loaded>", "")]);
    }
  }

  /**
   * Read all feature files from config location
   */
  private getFeatureFiles(featuresPath : string): Dependency[] {
    
    let files : Dependency[] = [];
    fs.readdirSync(featuresPath).forEach(file => {
      if (path.extname(file) == ".feature"){
        files.push( new Dependency(
          file,
          "EPIC 1"
        ));
      }
    });

    return files;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<Dependency | undefined | null | void> = new vscode.EventEmitter<Dependency | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<Dependency | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}

class Dependency extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    private epic: string) {
      super(label, vscode.TreeItemCollapsibleState.None);
      this.tooltip = `${this.label}-${this.epic}`;
      this.description = this.epic;
  }

  iconPath = {
    light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
    dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
  };
}