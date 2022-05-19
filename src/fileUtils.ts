import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'fast-glob';

import { XrayConf } from './model/xray';
import { TestPlan } from './model/testPlan';
import { Feature, FeatureStatus } from './model/feature';
import { updateXrayConfiguration, updateStatusBarItem, getConfigurationProvider } from './extension';
import { Uri, workspace } from 'vscode';
import { ConfigurationFields } from './providers/configuration-provider';

var md5 = require('md5');
var AdmZip = require("adm-zip");

var globPathMap = new Map<string, string>();

function URIReviver(_key: string, value: any){

    if(value.$mid == 1){
        return Uri.from(value);
    }
    else
        return value;
}

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

    let resultPath = null as any;

    if( workspace.workspaceFolders && workspace.workspaceFolders[workspaceId]){

        let featuresSubpath = getConfigurationProvider().getProperty(ConfigurationFields.FEATURES_PATH) ?? '';
        if(globPathMap.has(featuresSubpath)){
            resultPath = globPathMap.get(featuresSubpath) as string;
        }
        else{
            resultPath = glob.sync(featuresSubpath.replace(/\\/g, '/'), 
            { 
                cwd: workspace.workspaceFolders[workspaceId].uri.path.substring(1).replace(/\\/g, '/'),
                deep: 10,
                absolute : true,
                onlyDirectories: true 
            })[0];

            if(resultPath != undefined){
                globPathMap.set(featuresSubpath, resultPath);
            }
            else{
                resultPath = featuresSubpath;
            }
        }
    }
    return resultPath;
}

export function getWorkspaceConfigPath(workspaceId : number): string {

    if( !workspace.workspaceFolders || workspace.workspaceFolders[workspaceId] === undefined){
        throw new Error("Empty workspace");
    }
        return workspace.workspaceFolders[workspaceId].uri.path.substring(1);
}

export function loadXrayConf(): XrayConf[] {

    return workspace.workspaceFolders?.map<XrayConf>(workspaceFolder => {
        try{   
            
            let xrayConfigFile = path.join(getWorkspaceConfigPath(workspaceFolder.index), "xray.json");
            if(!pathExists(xrayConfigFile)){
                // Initialize xray.json
                fs.writeFileSync(xrayConfigFile, JSON.stringify(new XrayConf(), null, 4));
            }
            return JSON.parse(fs.readFileSync(xrayConfigFile, { encoding : "utf-8"}), URIReviver);
        }
        catch(exception){
            updateStatusBarItem(`Config xray.json not loaded for ${workspaceFolder.name}`);
            console.error("Error generating configuration file");
            console.trace(exception);
            return null;
        }
    }) as XrayConf[];
}

export function saveXrayConfBlobs(workspaceIndex : number, blobs: TestPlan[]): TestPlan[]{

    let xrayConfigFile = path.join(getWorkspaceConfigPath(workspaceIndex), "xray.json");

    let json: XrayConf = JSON.parse(fs.readFileSync(xrayConfigFile, { encoding : "utf-8"}), URIReviver);

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
                        if(matchedFeature.localFileRef == undefined){
                            matchedFeature.status = FeatureStatus.NEW;
                        }
                        else if(matchedFeature.md5 == feature.md5){
                            matchedFeature.status = FeatureStatus.COMMITED;
                        }
                        else{
                            matchedFeature.status = FeatureStatus.MODIFIED;
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
    json.dueTimestamp = Date.now() + 1000 * 60 * 15; // TODO TTL 5 min
    fs.writeFileSync(xrayConfigFile, JSON.stringify(json, null, 4));
    updateXrayConfiguration(workspaceIndex, json);
    return json.blobs;
}

export function mergeBlobReference(workspaceIndex: number, testPlanKey: string, remoteFileName:string, localFileUri : Uri){

    if(localFileUri){   // Prevent changes if modal dismissed without selecting a file
        let xrayConfigFile = path.join(getWorkspaceConfigPath(workspaceIndex), "xray.json");
        let json: XrayConf = JSON.parse(fs.readFileSync(xrayConfigFile, { encoding : "utf-8"}), URIReviver);

        let targetFeature = json.blobs.find(blob => blob.key == testPlanKey)?.features
            ?.find(feature => feature.filename == remoteFileName);
        
        if(targetFeature){
            targetFeature.localFileRef = localFileUri;
            targetFeature.status = FeatureStatus.COMMITED;

            fs.writeFileSync(xrayConfigFile, JSON.stringify(json, null, 4));
            updateXrayConfiguration(workspaceIndex, json);
        }
    }
}

export function deleteBlobReference(workspaceIndex: number, testPlanKey: string, remoteFileName:string) {

    let xrayConfigFile = path.join(getWorkspaceConfigPath(workspaceIndex), "xray.json");
    let json: XrayConf = JSON.parse(fs.readFileSync(xrayConfigFile, { encoding : "utf-8"}), URIReviver);

    let targetFeature = json.blobs.find(blob => blob.key == testPlanKey)?.features
        ?.find(feature => feature.filename == remoteFileName);
    
    if(targetFeature){
        targetFeature.localFileRef = undefined;
        targetFeature.status = FeatureStatus.NEW;
        fs.writeFileSync(xrayConfigFile, JSON.stringify(json, null, 4));
        updateXrayConfiguration(workspaceIndex, json);
    }
}

export function deleteRelatedBlobReference(localFileUri : Uri){

    let workspaceIndex = workspace.getWorkspaceFolder(localFileUri)?.index ?? 0;
    let xrayConfigFile = path.join(getWorkspaceConfigPath(workspaceIndex), "xray.json");
    let json: XrayConf = JSON.parse(fs.readFileSync(xrayConfigFile, { encoding : "utf-8"}), URIReviver);

    let targetFeatures = json.blobs.flatMap(blob => blob.features)?.filter(feature => feature?.localFileRef?.toString() == localFileUri.toString());
    
    targetFeatures.forEach((targetFeature : Feature | undefined) => {
        if(targetFeature){
            targetFeature.localFileRef = undefined;
            targetFeature.status = FeatureStatus.NEW;
            fs.writeFileSync(xrayConfigFile, JSON.stringify(json, null, 4));
            updateXrayConfiguration(workspaceIndex, json);
        }
    }) 
}

export function deleteXrayConfBlob(workspaceIndex: number, testPlanKey: string, remoteFileName:string){

    let xrayConfigFile = path.join(getWorkspaceConfigPath(workspaceIndex), "xray.json");
    let json: XrayConf = JSON.parse(fs.readFileSync(xrayConfigFile, { encoding : "utf-8"}), URIReviver);

    let found = false;
    let features = json.blobs.find(blob => blob.key == testPlanKey)?.features;
    features?.forEach((feature, index) => {
        if(feature.filename == remoteFileName){
            console.log(`Removed element ${feature.filename} at index ${index}`);
            features?.splice(index,1);
            found = true;
        }
    });
    
    if(found){
        fs.writeFileSync(xrayConfigFile, JSON.stringify(json, null, 4));
        updateXrayConfiguration(workspaceIndex, json);
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
        let filenameMatch = entry.entryName.match(/^\d+_(.*)/);
        let filename = filenameMatch && filenameMatch[1]? filenameMatch[1]: entry.entryName;
        let feature = new Feature(filename, summary?.length && summary.length > 1 ? summary[1]: "NO NAME", featureContent, hashMd5);
        result.push(feature);
    });
    return result;
}

export function readDocMarkdown(){
    return fs.readFileSync(path.join(__filename,'../../resources/doc/doc.MD'), { encoding : "utf-8"});
}