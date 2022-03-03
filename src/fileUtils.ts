import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';
import { XrayConf } from './model/xray';
import { TestPlan } from './model/testPlan';
import { Feature, FeatureStatus } from './model/feature';
import { updateXrayConfiguration } from './extension';
import { Uri } from 'vscode';

var md5 = require('md5');
var AdmZip = require("adm-zip");


export function pathExists(p: string): boolean {

    let exists = false;
    if(p){
        try {
        fs.accessSync(p);
        exists = true;
        } catch (err) {
            // None
        }
    }
    return exists;
}

export function featuresPathExists(workspaceId : number): boolean {

    return pathExists(getFeaturesPath(workspaceId))
}

export function getFeaturesPath(workspaceId : number): string {

    if( vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[workspaceId]){

        return path.join(vscode.workspace.workspaceFolders[workspaceId].uri.path.substring(1), getXrayConfigPath())
    }
    return null as any
}

export function getXrayConfigPath(): string {

    return vscode.workspace.getConfiguration("cucumber-xray-connector").get("features.path", "undefined");
}

export function loadXrayConf(): XrayConf {

    try{        
        let xrayConfigFile = path.join(getFeaturesPath(0), "xray.json")
        if(!pathExists(xrayConfigFile)){
            fs.writeFileSync(xrayConfigFile, JSON.stringify(new XrayConf(), null, 4));
        }
        return JSON.parse(fs.readFileSync(xrayConfigFile, { encoding : "utf-8"}));
    }
    catch(exception){
        vscode.window.showErrorMessage("Xray configuration file could not be loaded. Extension may not work properly")
    }
    return null as any
}

export function saveXrayConfBlobs(blobs: TestPlan[]){

    let xrayConfigFile = path.join(getFeaturesPath(0), "xray.json");

    let json: XrayConf = JSON.parse(fs.readFileSync(xrayConfigFile, { encoding : "utf-8"}));

    if(json.blobs.length == 0)
        json.blobs = blobs;
    else{
        let newPlans = false;
        blobs.forEach(testPlan => {
            
            let matchedTestPlan = json.blobs.find(match => match.key == testPlan.key);
            if(matchedTestPlan){

                matchedTestPlan.name = testPlan.name;                                                    // Updated Plan NAME
                matchedTestPlan.features?.forEach(feature => feature.status = FeatureStatus.DELETED);    // Pre-set old features as DELETED
                                                                     
                // Iterate over features.
                let newFeatures = false;
                testPlan.features?.forEach(feature => {
                    let matchedFeature = matchedTestPlan?.features?.find(featmatch => featmatch.filename == feature.filename);
                    if(matchedFeature){
                        if(matchedFeature.md5 == feature.md5){
                            matchedFeature.status = FeatureStatus.COMMITED;
                        }
                        else{
                            matchedFeature.status = FeatureStatus.UPDATED;
                            matchedFeature.blob = feature.blob;
                            matchedFeature.md5 = feature.md5;
                        }
                    }
                    else{
                        newFeatures = true;
                        matchedTestPlan?.features?.push(feature);
                    }
                });

                if(newFeatures)
                    matchedTestPlan.features?.sort((a, b) => a.filename > b.filename? 1:-1); // Force re-sort
            }
            else{
                newPlans = true;
                json.blobs.push(testPlan);
            }
        })

        if(newPlans)
            json.blobs.sort((a, b) => a.key > b.key? 1:-1); // Force re-sort


    }
    json.dueTimestamp = Date.now() + 1000 * 60 * 15; // TTL 5 min
    fs.writeFileSync(xrayConfigFile, JSON.stringify(json, null, 4));
    updateXrayConfiguration(json);
}

export function mergeBlobReference(testPlanKey: string, remoteFileName:string, localFileUri : Uri){

    let xrayConfigFile = path.join(getFeaturesPath(0), "xray.json");
    let json: XrayConf = JSON.parse(fs.readFileSync(xrayConfigFile, { encoding : "utf-8"}));

    let targetFeature = json.blobs.find(blob => blob.key == testPlanKey)?.features
        ?.find(feature => feature.filename == remoteFileName);
    
    if(targetFeature){
        targetFeature.localFileRef = localFileUri;
        fs.writeFileSync(xrayConfigFile, JSON.stringify(json, null, 4));
        updateXrayConfiguration(json);
    }
}

export function extractXrayZipFile(data : Buffer): Feature[]{

    var zip = new AdmZip(data);
    var zipEntries = zip.getEntries();
    var result: Feature[] = [];

    zipEntries.forEach((entry: { entryName: string; }) => {

        let featureContent = zip.readAsText(entry);
        let hashMd5 = md5(featureContent);
        let summary = /.*?Feature:(.*?)\n.*/.exec(featureContent);
        let filenameMatch = entry.entryName.match(/\d+_(.*?)/);
        let filename = filenameMatch && filenameMatch[1]? filenameMatch[1]: entry.entryName;
        let feature = new Feature(filename, summary?.length && summary.length > 1 ? summary[1]: "NO NAME", featureContent, hashMd5);
        result.push(feature);
    });
    return result;
}

