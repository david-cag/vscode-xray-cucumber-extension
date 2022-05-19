
import { CancellationToken, ConfigurationTarget, window, workspace } from "vscode";
import SecretVault from "../security/secret-vault"

const EXTENSION_CONFIGURATION = "cucumber-xray-connector";
const DEFAULT_ENDPOINT = 'https://your-domain.atlassian.net'; 

 export enum  ConfigurationFields {
    FEATURES_PATH = "features.path",
    JIRA_USERNAME = "jira.username",
    JIRA_PROJECT_KEY = "jira.projectkey",
    JIRA_ENDPOINT = "jira.endpoint",
    SHOW_WELCOME = "welcome.show"
 }

 export class ConfigurationProvider {

    secretVault : SecretVault;

    constructor(context : any){
            // Initialize and get current instance of our Secret Storage
        SecretVault.init(context)
        this.secretVault = SecretVault.instance;
    }

    getProperty(key : ConfigurationFields) : string | undefined {
        return workspace.getConfiguration(EXTENSION_CONFIGURATION).get(key);
    }
    
    async getOrUpdateProperty(key : ConfigurationFields, inputMessage? : string, force? : boolean){

        let property = this.getProperty(key);
        if(property == undefined || property == '' || force){
            let newProperty = await window.showInputBox(
              { 
                prompt: inputMessage? inputMessage : `Set a value for field [${key}]`,
                password: false,
                placeHolder: property
              });
              if(newProperty !== undefined && newProperty !== '')
                property = newProperty;
            workspace.getConfiguration(EXTENSION_CONFIGURATION).update(key, property, ConfigurationTarget.Workspace);
          }
          return property ?? '';
    }

    async getPassword(force? : boolean) : Promise<string> {
        let pwd = await this.secretVault.getPassword();
        if(pwd === undefined || force){
          let newPwd = await window.showInputBox(
            { 
              prompt: "Set JIRA password",
              placeHolder: '***********',
              password: true
            });
            if(newPwd !== undefined && newPwd !== '')
              pwd = newPwd;
          await this.secretVault.storePassword(pwd);
        }
        return pwd ?? '';
    }

    getUsername(force? : boolean) : Promise<string> {
        return this.getOrUpdateProperty(ConfigurationFields.JIRA_USERNAME, undefined, force);
    }

 
    async updateCredentials(){
        await this.getUsername();
        this.getPassword(true);
        
        
    }

    checkConfReady() : boolean {
      let conf = workspace.getConfiguration(EXTENSION_CONFIGURATION)
      return conf.get(ConfigurationFields.FEATURES_PATH) !== '' && 
             conf.get(ConfigurationFields.JIRA_ENDPOINT) !== '' &&
             conf.get(ConfigurationFields.JIRA_USERNAME) !== '' &&
             conf.get(ConfigurationFields.JIRA_PROJECT_KEY) !== '' ;
    }
}