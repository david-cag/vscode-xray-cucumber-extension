import { ExtensionContext, SecretStorage } from "vscode"

export default class SecretVault {
    private static _instance: SecretVault;
    private static readonly JIRA_PWD : string = "JIRA_PWD";

    constructor(private secretStorage: SecretStorage) {}

    static init(context: ExtensionContext): void {
        /*
        Create instance of new AuthSettings.
        */
        SecretVault._instance = new SecretVault(context.secrets)
    }

    static get instance(): SecretVault {
        /*
        Getter of our AuthSettings existing instance.
        */
        return SecretVault._instance
    }

    async storePassword(token?: string): Promise<void> {
        /*
        Update values in bugout_auth secret storage.
        */
        if (token) {
            this.secretStorage.store(SecretVault.JIRA_PWD, token);
        }
    }

    async getPassword(): Promise<string | undefined> {
        /*
        Retrieve data from secret storage.
        */
        return this.secretStorage.get(SecretVault.JIRA_PWD);
    }
}