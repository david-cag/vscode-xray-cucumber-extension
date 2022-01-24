import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';
import { XrayConf } from './model/xray';
import { config } from 'process';

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

