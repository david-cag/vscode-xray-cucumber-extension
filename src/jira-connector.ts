import { getXrayConfiguration } from "./extension";
import axios from 'axios';
import * as https from 'https';
import * as vscode from 'vscode';
import { TestPlan } from "./model/testPlan";
import { saveXrayConfBlobs, extractXrayZipFile } from './fileUtils';
import { Feature } from "./model/feature";

const CancelToken = axios.CancelToken;
const source = CancelToken.source();

// Perform JIRA XRAY request
async function request(url: string, options: any): Promise<any> {

     options.auth = {
       username: "davidcag",
       password: "GS5.ajzcPlexus9"
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


export function loadTestPlans() : Thenable<void | TestPlan[]> {

    if(getXrayConfiguration().dueTimestamp < new Date().getTime()){

      console.log(`CONF CADUCADA: ${ new Date(getXrayConfiguration().dueTimestamp)}`);

      let endpoint : string = getXrayConfiguration().jiraEndpoint;
      let projectId : string = getXrayConfiguration().jiraKey;
      let jql: string = encodeURI(`project = ${projectId} AND issuetype = "Test Plan"`);
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
            let promise = request(xrayUrl, { responseType: 'arraybuffer' });
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
            saveXrayConfBlobs(data);
            return Promise.resolve(data);
          });
      }).catch((error) => {
    
          vscode.window.showErrorMessage(`No se han podido recuperar los cambios de Jira Xray: ${endpoint}`);
          console.log(error);
          return Promise.resolve(getXrayConfiguration().blobs);
      });
    });
  }
  else{
    return Promise.resolve(getXrayConfiguration().blobs);
  }
}