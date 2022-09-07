import { getXrayConfiguration, getConfigurationProvider } from "./extension";
import axios from 'axios';
import * as https from 'https';
import * as vscode from 'vscode';
import { TestPlan } from "./model/testPlan";
import { saveXrayConfBlobs, extractXrayZipFile } from './fileUtils';
import { Feature, FeatureStatus } from "./model/feature";
import { ConfigurationFields } from "./providers/configuration-provider";
import { MessageOptions } from "vscode";

const CancelToken = axios.CancelToken;
const source = CancelToken.source();


// Perform JIRA XRAY request
async function request(url: string, options: any): Promise<any> {

  let pwd = await getConfigurationProvider().getPassword(false);
  let username = await getConfigurationProvider().getUsername(false);

  options.auth = {
    username: username,
    password: pwd
  }
    
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
  });

  options.agent = httpsAgent;
  options.cancelToken = source.token;

  const response = await axios.get(url, options).catch((thrown) => {
    if (axios.isCancel(thrown)) {
      console.log('Request canceled', thrown.message);
    } else {
      throw thrown;
    }
  });

  return response;
}

// Cancel current axios request (only once a time)
function cancelRequest() {
  source.cancel('Operation canceled by the user.');
}


export function loadTestPlans(workspaceId : number, forceUpdate : boolean) : Thenable<void | TestPlan[]> {

    let workspaceConf = getXrayConfiguration()[workspaceId];
    let modifiedFeatures = workspaceConf.blobs.flatMap(blob => blob.features).some(feature => feature?.status == FeatureStatus.MODIFIED);
        
    if(!modifiedFeatures && (forceUpdate || workspaceConf.dueTimestamp < new Date().getTime())){

      console.log(`CONF CADUCADA: ${ new Date(workspaceConf.dueTimestamp)}`);

      const configuration = getConfigurationProvider();
      
      let endpoint = configuration.getProperty(ConfigurationFields.JIRA_ENDPOINT);
      if (endpoint === undefined){
        return Promise.resolve(workspaceConf.blobs);  // MISSCONFIGURED PROJECT
      }
      let projectKey : string = configuration.getProperty(ConfigurationFields.JIRA_PROJECT_KEY) ?? "";
      let jql: string = encodeURI(`project = ${projectKey} AND issuetype = "Test Plan"`);
      let testPlansUrl: string = `${endpoint}/rest/api/2/search?jql=${jql}`;

      const req = request(testPlansUrl, {});
      let zipPromises : Promise<TestPlan>[] = [];

      return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Synchronizing changes with remote Jira Xray',
        cancellable: true
       }, (progress, token) => {
        token.onCancellationRequested(() => {
          console.log("User cancelled xray connection...");
          cancelRequest();
          return Promise.reject("Cancelled!");
        });

        progress.report({ increment: 0, message: "Retrieving features list" });
      
        return req.then((res) => {
          let currentProgress = 20;
          progress.report({ increment: currentProgress, message: "Features list updated. Downloading files ..." });
          let data : TestPlan[] = [];
          let progressStep = (100 - currentProgress) / (res.data.issues.length * 2);
          res.data.issues.forEach((issue: { key: any; fields: { summary: any; }; })  => {

            progress.report({ increment: progressStep, message: `Downloading feature ${issue.key}` });
            let testPlan = new TestPlan(issue.key, issue.fields.summary);
            let xrayUrl: string = `${endpoint}/rest/raven/1.0/export/test?keys=${issue.key}&fz=true`;
            
            let promise = request(xrayUrl, { responseType: 'arraybuffer' }).catch((featError) => {
              progress.report({ increment: progressStep, message: `Skipped ${issue.key}.` });
              vscode.window.showErrorMessage(`Test Plan unavailable: ${endpoint}. Skipping (${featError})`);
              console.log(featError);
            });
            zipPromises.push(promise);
            promise.then((xrayResponse) => {

              progress.report({ increment: progressStep, message: `Downloaded feature ${issue.key}. Unzipping file` });
              let features: Feature[] = extractXrayZipFile(xrayResponse.data);
              testPlan.features = features;
              data.push(testPlan);
            });
          });

          return Promise.all(zipPromises).then(() => {
            progress.report({ increment: 100, message: `Download completed! Saving data...` });
            let updatedData = saveXrayConfBlobs(workspaceId, data);
            return Promise.resolve(updatedData);
          });
      }).catch((error) => {
          let errorMessage;
          if(error.response){
            errorMessage = `${error.response.status} - ${error.response.data?.errorMessages}`;
          }
          else{
            errorMessage = error.message;
          }
          vscode.window.showErrorMessage(`Connection could not be established to Xray:\n(${errorMessage})`);
          console.log(error);
          return Promise.resolve(workspaceConf.blobs);
      });
    });
  }
  else{
    console.log("Return cached DATA");
    if(modifiedFeatures){
      let options : MessageOptions = { detail : "You have currently remote features marked as MODIFIED. Please, review it and 'mark as resolved' before sync", modal : true};
      vscode.window.showWarningMessage("Unreviewed features", options);
    }
    return Promise.resolve(workspaceConf.blobs);
  }
}