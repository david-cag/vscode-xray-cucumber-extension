import { Color, ThemeColor } from "vscode";
import { FeatureStatus } from "../model/feature";

export class StatusThemeColor extends ThemeColor {

    constructor(
        private readonly status : FeatureStatus){
        
            super(getThemeColor(status));
    }


}

function getThemeColor(status : FeatureStatus) : string {

    let color;
    switch(status){
        case FeatureStatus.NEW: color = "gitDecoration.untrackedResourceForeground"; break;
        case FeatureStatus.COMMITED: color = "stageModifiedResourceForeground"; break;
        case FeatureStatus.UPDATED: color = "gitDecoration.modifiedResourceForeground"; break;
        case FeatureStatus.DELETED: color = "gitDecoration.deletedResourceForeground"; break;
        default : color = "gitDecoration.addedResourceForeground";
    }
    return color;
}