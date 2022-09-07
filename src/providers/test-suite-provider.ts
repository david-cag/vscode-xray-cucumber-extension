import * as vscode from 'vscode';
import * as path from 'path';
import { loadTestPlans } from '../jira-connector';
import { TestPlan } from '../model/testPlan';
import { Feature } from '../model/feature';
import { Uri } from 'vscode';
import * as fileUtils from '../fileUtils';
import * as fs from 'fs';
import { getConfigurationProvider, getXrayFeatureMap, triggerFeatureProviderRefresh } from '../extension';
import { FeatureItem } from './feature-provider';
import { discardChanges } from '../fileUtils';

export class TestSuiteProvider implements vscode.TreeDataProvider<TestSuite> {

  data: TestPlan[];
  forceUpdate : boolean = false;

  constructor() {
    this.data = [];
  }

  getTreeItem(element: TestSuite): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TestSuite): Promise<TestSuite[]> {

    if(vscode.workspace.workspaceFolders && getConfigurationProvider().checkConfReady()){
      if(!element && vscode.workspace.workspaceFolders.length > 1){
        // If multiple workspace folders, create a parent folder tree for each
        return Promise.resolve(vscode.workspace.workspaceFolders.map(workspaceFolder => TestSuite.of(workspaceFolder.name,workspaceFolder.index, workspaceFolder.name)));
      }
      else{
        if(!element || element.testSuiteKey === ""){
          let testPlans = loadTestPlans(element?.workspaceId ?? 0, this.forceUpdate);
          this.forceUpdate = false;
          let testSuites : TestSuite[] = [];
          return testPlans.then((data) => {
            if(data){
              this.data = data;
              data.forEach(testPlan => {
                testSuites.push( new TestSuite(
                  testPlan.key,
                  element?.workspaceId ?? 0, // If element carries workspace Id use it. If not (single workspace) use the first one.
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
          let testSuite = this.data.find(elm => elm.key === element.id);
          testSuite?.features?.forEach(feature => {
            let desc = feature.blob.match(/.*?Feature.*?\n/)?.shift() || feature.blob.substring(0,30);
            features.push(new TestSuite(
              testSuite?.key + "_" + feature.filename, 
              element.workspaceId, 
              element.id as string,
              feature.filename, 
              desc,
              desc,
              true,
              feature));

              // Link to features
              if(feature && feature.localFileRef){
                let fp = getXrayFeatureMap(element?.workspaceId ?? 0);
                let linkedRemoteFiles : string[] | undefined = fp.get(feature.localFileRef.toString());
                triggerFeatureProviderRefresh(feature.localFileRef.path.split("/").pop() as string, linkedRemoteFiles);
              }
          });
          return Promise.resolve(features);
        }
      }
    }
    else{
      return Promise.resolve([]);
    }
  }

  private _onDidChangeTreeData: vscode.EventEmitter<TestSuite | undefined | null | void> = new vscode.EventEmitter<TestSuite | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TestSuite | undefined | null | void> = this._onDidChangeTreeData.event;
  
  refresh(force?: boolean): void {
    this.forceUpdate = force || false;
    this._onDidChangeTreeData.fire();
  }
}

class TestSuite extends vscode.TreeItem {

  public static of(id:string, workspaceId: number, label: string){
    return new TestSuite(id, workspaceId, "", label, "", "", false, undefined);
  }

  constructor(
    id: string,
    public readonly workspaceId: number,
    public readonly testSuiteKey: string,
    public label: string, // | vscode.TreeItemLabel,
    tooltip: string,
    description: string,
    leaf: boolean,
    public readonly feature? : Feature){

    // { 'label' : label, 'highlights': [[0,3]] } as vscode.TreeItemLabel
    super(Uri.parse(`cucumber:style/${feature?.status}/${id}`), leaf? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Expanded);
    this.id = id;
    this.workspaceId = workspaceId;
    this.testSuiteKey = testSuiteKey;
    this.tooltip = tooltip;
    this.description = description;
    this.label = label;
    this.command = leaf && feature? new DiffCommand(id, feature, workspaceId, testSuiteKey, label): undefined;
    this.contextValue = leaf ? (feature?.status) : 'ROOT'; // view TreeItem discrim.

    this.iconPath = {
      light: path.join(__filename, '..','..', '..', 'resources', 'light', leaf? 'test.svg' :'test-suite.svg'),
      dark: path.join(__filename, '..','..', '..', 'resources', 'dark', leaf? 'test.svg' :'test-suite.svg')
    };
  }
}
 
class DiffCommand implements vscode.Command {
    
  command = 'vscode.diff';
  title = "Title";
  tooltip = "tooltip";
  arguments = [] as any[];
  ctx = {};

  constructor(remoteFilename : string, feature : Feature, workspaceId : number, testSuiteKey : string, label: string){
    
    let remoteBlobUri : Uri = this.setDiff(remoteFilename, feature.blob);
    let diffName = feature.localFileRef? `${feature.localFileRef.path.split("/").pop()} ↔ ${remoteFilename}`:`${remoteFilename} (Not sync)`;
    this.arguments = [ feature.localFileRef, remoteBlobUri, diffName];
    this.ctx = {workspaceId, testSuiteKey, label};
  }

  setDiff(remoteFilename : string, remoteBlob : string) : vscode.Uri {

    return vscode.Uri.parse(`feature:${remoteFilename}:${Buffer.from(remoteBlob).toString('base64')}`);
  }
}

export function TestSuiteDownloadCommandProvider(node : TestSuite):void {
  
  let featuresPath : string = fileUtils.getFeaturesPath(node.workspaceId);

  vscode.window.showSaveDialog({
    defaultUri : Uri.file(`${featuresPath}/${node.label}`),
    filters : {
      'Cucumber files': ['feature']
    }
  }).then(fileInfos => {
    if(fileInfos){
      fs.writeFileSync(fileInfos.fsPath, node.feature?.blob || "");
      let savedFileUri = Uri.file(fileInfos.fsPath);
      fileUtils.mergeBlobReference(node.workspaceId, node.testSuiteKey, node.label, savedFileUri);
    }
  });
}

export function TestSuiteLinkCommandProvider(this: TestSuiteProvider, node : TestSuite): void {

  let featuresPath : string = fileUtils.getFeaturesPath(node.workspaceId);
  let provider = this;
  vscode.window.showOpenDialog({
    defaultUri : Uri.file(`${featuresPath}/${node.label}`),
    canSelectMany : false,
    filters : {
      'Cucumber files': ['feature']
    }

  }).then(uris => {
    fileUtils.mergeBlobReference(node.workspaceId, node.testSuiteKey, node.label, uris?.shift() as vscode.Uri);
    provider.refresh();
  });

}

export function TestSuiteUnlinkCommandProvider(this: TestSuiteProvider, node : TestSuite): void {
  
  let provider = this;
  vscode.window.showInformationMessage("Do you want to unlink this feature?", "Yes", "No")
  .then(answer => {
    if (answer === "Yes") {
      fileUtils.deleteBlobReference(node.workspaceId, node.testSuiteKey, node.label);
      triggerFeatureProviderRefresh(node.feature?.localFileRef?.path.split("/").pop() as string);
      provider.refresh();
    }
  })
}

export function TestSuiteDeleteCommandProvider(this: TestSuiteProvider, node : TestSuite): void {
 
  let provider = this;
  vscode.window
  .showInformationMessage("Do you want to definitely remove remote feature?", "Yes", "No")
  .then(answer => {
    if (answer === "Yes") {
      fileUtils.deleteXrayConfBlob(node.workspaceId, node.testSuiteKey, node.label);
      provider.refresh();
    }
  })
}

export function TestSuiteDiscardCommandProvider(this: TestSuiteProvider, node : TestSuite): void {
 
  let provider = this;
  let options : vscode.MessageOptions = { detail: 'No additional warnings will be shown if no new remote changes are downloaded', modal: true };
		vscode.window
			.showInformationMessage("Do you agree with local/xray discrepancies?", options, "Yes", "No")
			.then(answer => {
				if (answer === "Yes") {
					discardChanges(node.workspaceId, node.testSuiteKey, node.label);
          provider.refresh();
				}
    })
}