import { Uri } from "vscode";

export class Feature {

    filename : string;
    md5 : string;
    blob : string;
    summary : string;
    localFileRef? : Uri;
    status : FeatureStatus = FeatureStatus.NEW;

    constructor(filename: string, summary: string, blob: string, md5: string, localFileRef? : Uri){
        this.filename = filename;
        this.summary = summary;
        this.blob = blob;
        this.md5 = md5;
        this.localFileRef = localFileRef;
    }
}

export enum FeatureStatus {
    NEW = "NEW",
    MODIFIED = "MODIFIED",
    DELETED = "DELETED",
    COMMITED = "COMMITED",
    UNTRACKED = "UNTRACKED",
    LINKED = "LINKED"
}

