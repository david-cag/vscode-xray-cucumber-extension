import * as vscode from 'vscode';
import * as path from 'path';
import { loadTestPlans } from '../jira-connector';
import { TestPlan } from '../model/testPlan';
import { FeatureProvider } from './feature-provider';
import { Feature } from '../model/feature';
import { Uri } from 'vscode';
import * as fileUtils from '../fileUtils';
import * as fs from 'fs';

export class TestSuiteProvider implements vscode.TreeDataProvider<TestSuite> {

  data: TestPlan[];

  constructor() {
    this.data = [];
  }

  getTreeItem(element: TestSuite): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TestSuite): Promise<TestSuite[]> {

    if(vscode.workspace.workspaceFolders){
      if(!element){
        let testPlans = loadTestPlans();
        let testSuites : TestSuite[] = [];
        return testPlans.then((data) => {
          if(data){
            this.data = data;
            data.forEach(testPlan => {
              testSuites.push( new TestSuite(
                testPlan.key,
                testPlan.key,
                testPlan.name,
                `${testPlan.name}-${testPlan.key}`,
                testPlan.key,
                false
              ));
            });

          }
          else{
            testSuites = [];
          }
          return Promise.resolve(testSuites);
        }) as Promise<TestSuite[]>;
      }
      else{
        let features : TestSuite[] = [];
        this.data.find(elm => elm.key === element.id)?.features?.forEach(feature => {
          let desc = feature.blob.match(/.*?Feature.*?\n/)?.shift() || feature.blob.substring(0,30);
          features.push(new TestSuite(
            feature.filename, 
            element.id as string,
            feature.filename, 
            desc,
            desc,
            true,
            feature));
        });
        return Promise.resolve(features);
      }
    }
    else{
      return Promise.resolve([new TestSuite("", "", "<No workspace loaded>", "", "", false)]);
    }
  }

  private _onDidChangeTreeData: vscode.EventEmitter<TestSuite | undefined | null | void> = new vscode.EventEmitter<TestSuite | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TestSuite | undefined | null | void> = this._onDidChangeTreeData.event;
  
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}

class TestSuite extends vscode.TreeItem {

  constructor(
    id: string,
    public readonly testSuiteKey: string,
    public label: string, // | vscode.TreeItemLabel,
    tooltip: string,
    description: string,
    leaf: boolean,
    public readonly feature? : Feature){

    // { 'label' : label, 'highlights': [[0,3]] } as vscode.TreeItemLabel
    super(Uri.parse(`cucumber:style/${feature?.status}/${id}`), leaf? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Expanded);
    this.id = id;
    this.testSuiteKey = testSuiteKey;
    this.tooltip = tooltip;
    this.description = description;
    this.label = label;
    this.command = leaf && feature? new DiffCommand(id, feature): undefined;
    this.contextValue = leaf ? 'LEAF' : 'ROOT'; // view TreeItem discrim.
  }

  iconPath = {
    light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
    dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
  };

}
 
class DiffCommand implements vscode.Command {
    
  command = 'vscode.diff';
  title = "Title";
  tooltip = "tooltip";
  arguments = [] as any[];

  constructor(remoteFilename : string, feature : Feature){
    
    let remoteBlobUri : Uri = this.setDiff(remoteFilename, feature.blob);
    let diffName = feature.localFileRef? `${feature.localFileRef.path}↔${remoteFilename}`:`${remoteFilename} (Not sync)`;
    this.arguments = [ feature.localFileRef, remoteBlobUri, diffName];
  }

  setDiff(remoteFilename : string, remoteBlob : string) : vscode.Uri {

    return vscode.Uri.parse(`feature:${remoteFilename}:${Buffer.from(remoteBlob).toString('base64')}`);
  }
}

export function TestSuiteDownloadCommandProvider(node : TestSuite):void {
  
  let featuresPath : string = fileUtils.getFeaturesPath(0);

  vscode.window.showSaveDialog({
    defaultUri : Uri.file(`${featuresPath}/${node.label}`),
    filters : {
      'Cucumber files': ['feature']
    }
  }).then(fileInfos => {
    if(fileInfos){
      fs.writeFileSync(fileInfos.fsPath, node.feature?.blob || "");
      let savedFileUri = Uri.file(fileInfos.fsPath);
      fileUtils.mergeBlobReference(node.testSuiteKey, node.label, savedFileUri);
    }
  });
}

export function TestSuiteLinkCommandProvider(this: TestSuiteProvider, node : TestSuite): void {

  let featuresPath : string = fileUtils.getFeaturesPath(0);
  
  vscode.window.showOpenDialog({
    defaultUri : Uri.file(`${featuresPath}/${node.label}`),
    canSelectMany : false,
    filters : {
      'Cucumber files': ['feature']
    }

  }).then(uris => {
    fileUtils.mergeBlobReference(node.testSuiteKey, node.label, uris?.shift() as vscode.Uri);
    this.refresh();
  });

}
