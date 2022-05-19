# VS Code Cucumber Extension

![Cucumber logo](//logo.png)

This extension provides features to sync Xray Test Plans against your source codeproject and keep track of feature file changes (cucumber specs).

## Features
---
- Discover feature cucumber files from JIRA Xray TestPlan and TestSets.
- Fetch cucumber feature files into local project
- Track cucumber file changes from local to Xray

## Setup
---
After installing the extension you need to configure Xray connection. You may find Xray connection options under Extension settings menu:
- `File > Preferences > Settings`

![Extensions](//extensions.png)
- Under Cucumber Explorer, click on `More Actions...` button:

![More actions](//moreactions.png)

### Settings variables

| Option | Description |
| :---:  | :---: |
| Features > **Path**  | File pattern to set the base folder where your local features files are located. *(Fetch feature will also suggest this folder as default download folder)* You can use glob patterns |
| Jira > **Cache_ttl** | Defines the max cache retention for requests agains your JIRA Instance. *0 means no request will be cached* | 
| Jira > **Endpoint**  | JIRA base endpoint (ex: https://your-domain.atlassian.net) **On Premise JIRA instances should have API endpoint enabled**  |
| Jira > **ProjectKey**  | JIRA Key of the project to interact with |
| Jira > **Username**  | Authorized JIRA Username with permissions over the selected ProjectKey |
| Welcome > **Show**  | Check to enable/disable rendering this doc during startup |

### Configuring credentials

JIRA API Endpoint requires authorized access against a project to retrieve the current Test Plan status.
To persist your JIRA account settings, password value is saved inside VSCode secure vault to prevent password exposure. This means that this extension does not track nor saves your password value and it is requested from VSCode vault just to perform JIRA requests.
[See Secrets Storage documentation](https://code.visualstudio.com/api/references/vscode-api#SecretStorage)

To set or update your JIRA account settings you can request it under the options submenu of the Cucumber Explorer Views:

![Jira Crendetials](//jiraCredentials.png)

Username will be prompted. If defined in Settings, it will be suggested and, if changed, it will be updated also:

![Jira Crendetials : User](//jiraCredentialsUser.png)

After username, password will be prompted. Password value will be never showed. If changed, secret vault will be updated. If don't, password will remain unchanged:
![Jira Crendetials : Password](//jiraCredentialsPwd.png)

## Usage
---
This plugin enables a new Explorer view on the sidebar. This Explorer is splitted in two views to track local features and remote Test Suites. Click the new icon ![Cucumber icon](//cucumber.png) to display it:

![Explorer View](//explorerView.png)

### Features Panel

This panel shows your current local cucumber features. Only feature files located under * Features > Path * folder will be displayed here.
 
> **Note:** If no current features are found verify your settings configuration

Every will be decorated with labels to track different file status:
| Status | Symbol | Description |
| ------ | :---:  | :---: |
| <span style="color:green">Untracked</span> | <span style="color:green">U</span> | This files exists only locally or it isn't tracked agains a remote Test Scenario |
| <span style="color:white">Linked</span> | <span style="color:white">L</span> | This files are linked with a remote story. Developers can check changes with remote definition |

### Test Suites Panel

This panel shows your remote Xray Test Suites. Every parent folder will represent an existent Test Plan in JIRA and behind them you will one or several features associated with every Test defined in the TestPlan. Xray Cucumber Extension automatically connects to Xray instance to retrieve lates changes from your configured JIRA Project ID once you access to the Cucumber Explorer and it will be refreshed every time you track a change.

> Data is cached by default to 5 minutes to prevent excesive traffic against your JIRA instance. You can change that value in Settings menu or force update clicking Xray refresh button ![Refresh](//refreshBtn.png)

This panel shows the last test suites available in your Xray project. Under every Test Suite you may find one or several features associated with a TestCase of your Xray TestPlan. In this view you will be able to check the sync status of every file and perform actions against your local files:

| JIRA View | Local View |
| ------ | :---:  | 
| image1 | image2 |

In a similar way as Feature Panel. Every test scenario it's decorated with labels to track the remote file status:
| Status | Symbol | Description |
| ------ | :---:  | :---: |
| <span style="color:green">New</span> | <span style="color:green">N</span> | This files exists only remotely. If local *feature* exists both have not been tracked yet |
| <span style="color:white">Commited</span> | <span style="color:white">C</span> | This files are commited locally (after downloading a local copy or by linking it agains a local file) |
| <span style="color:red">Modified</span> | <span style="color:red">M</span> | This files had changed since last sync with Xray |
<span style="color:blue">Deleted</span> | <span style="color:blue">D</span> | This files has a previous local copy but no longer exists |

## Sync Actions
---

In this chapter it's described the process of operating between local and remote features.
Four different scenarios may be found:
* Only local feature file defined.
* Only remoted Test defined.
* Untracked changes between local & remote environments.
* Tracked changes.

Every scenario will be explained above:
### Only local feature file defined

A feature file may be defined locally meanwhile there is not functional definition set at Xray project.
This files are tagged as <span style="color:green">Untracked</span> in the Feature View. No actions can be done with this file but are candidates to be tracked against a remote file. 
![untrackedBtns](//scenarioUntracked.png)

### Only remoted test defined

A test may be defined remotely but there is no real implementation locally yet. Test Suite panel will show as a tree the Test Plans that contains that test. Developers will have the option to recreate a new local test linked to it. Hovering this features, developer will have the availability of creating a local copy of that feature or linking it against an existent local file: ![downloadBtn](//downloadBtn.png)
A copy of the file will be created on the default features folder.

### Untracked changes between local & remote environments

Local and remote files should be tracked to enable diff comparison and change upgrades. In this scenario, if a local feature file matchs against a remote test, develop can track both files selecting the feature file and clicking the Link action: ![LinkBtn](//linkBtn.png). A dialog will appear where you can select the local candidate file. You would be able to unlink ![UnlinkBtn](//unlinkBtn.png) the relationship if it's wrong or link again the feature against another local file but **A REMOTE FILE CAN BE ATTACHED TO A UNIQUE LOCAL FILE**.

### Tracked changes

Once a local and remote files are linked. Developer will have information about the actual sync status between local and remote file. If you double-click a feature file, a diff panel will show the differences against local and remote file. In that diff view you will be able to fetch remote changes and integrate them in local file. **Remote file is readonly and cannot be modified**

## Known Issues

 - 0.0.1 -- No known issues reported.

 ## Release Notes

  - 0.0.1 -- Initial Beta version
             Local feature management
             Local-remote sync & diff features
             Link & unlink features
             Progressive xray feature download

## Copyright

Images and icons are property of ther respective owners
[Cucumber icons created by Freepik - Flaticon](https://www.flaticon.com/free-icons/cucumber)