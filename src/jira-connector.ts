import { getXrayConfiguration } from "./extension";
import request from 'request';

export function loadTestPlans(){

    let endpoint : string = getXrayConfiguration().jiraEndpoint;
    let projectId : string = getXrayConfiguration().jiraKey;
    let jql: string = encodeURI(`project = ${projectId} AND issuetype = "Test Plan"`);
    let host: string = `${endpoint}/rest/api/2/search?jql=${jql}`;

    const req = request({
        host: host,
        port: 80,
        method: 'GET'
      }, (res) => {
        res.resume();
        res.on('end', () => {
          if (!res.complete)
            console.error(
              'The connection was terminated while the message was still being sent');
        });
    });
}