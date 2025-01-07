# Development Setup

The `cdk.json` file tells the CDK Toolkit how to execute your app.

### Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template


### AWS Account Setup

You will need to create a new user in IAM Identity Center, and add it to the AdministratorAccess group.

Start by creating your AWS SSO profile. In `~/.aws/config` place the following:

```yaml
[profile paratag-dev]
sso_start_url = https://d-9067fccff0.awsapps.com/start
sso_region = us-east-1
region = us-east-1
sso_account_id = 381491857943
sso_role_name = AdministratorAccess
```

To make it easy to switch between AWS roles, in your Zshrc (`~/.zshrc`) or Bashrc (`~/.bashrc`) file, add the following alias:

```bash
alias paratag-dev="export AWS_PROFILE=paratag-dev && aws sso login"
```

To start a new AWS SSO session, run the following command in terminal to authenticate:

```bash
paratag-dev
```
