import { TestPlan } from "./testPlan"

export class XrayConf {
  jiraKey: string = "#JIRA_KEY#"
  jiraEndpoint: string = "https://your-domain.atlassian.net"
  dueTimestamp: number = -1
  blobs: TestPlan[]  = []
}