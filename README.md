# Simple VF Cli

### Simple VF Cli is a small command line utility enabling you to develop Visualforce pages using your favorite front-end build system.

## Why

* Have you tried using a framework like ember, react, angular, etc... inside Salesforce? It's a nightmare and usually consists of you having to give up your local build system (ember-cli, angular-cli, etc...) to do so but not any more!
* Allows you to leverage Remote Actions (`@RemoteAction`) and Remote Objects (`<apex:remoteObjects>`) in your app to CRUD your data for free, no api hits!
* Gives you back your favorite front-end development tools like your IDE of choice, task runners, build systems, linting, intellisense, the list goes on...
* No "syncing" code changes to Salesforce during development (you would normally have to make a change to a Visualforce page or static resource and then wait for those changes to save up to Salesforce which often caused a lot of waiting).

Requirements:

* Node v6.0.0+
	* This project uses several es6 features and does not transpile down to es5
* A Salesforce org and a user with metadata api access
	* If your Salesforce user does not use the System Administrator profile and you come across additional permissions needed, please let me know so that I can update this documentation!

How to install:

```
npm install simple-vf-cli -g
```

This will add the `svf` command to your path.

> _Unfortunately you cannot use Yarn to install this cli globally because we are using PouchDB under the hood and Yarn is unable to download and install the right binary. This ends up producing an error stating you need Python installed on your machine which is unnecessary for this project._

Now you can run the `svf --version` command to ensure simple-vf-cli installed successfully:

*NOTE: The version number displayed for you may vary*

```
> svf --version
0.7.0
```

Run the `svf --help` command to see all available commands/options.

> _You can also simply type the `svf` command with no arguments to produce the same documentation._

### Commands:

---

#### auth

```
> svf auth
```

This command will create an authentication connection to the desired Salesforce org.  This connection is stored in a PouchDB instance provided by this tool.  Your password will be encrypted using a randomly generated key that is unique to your computer and your computer only.

> _Neither your password or your unique encryption key will ever be transmitted anywhere, guaranteed!_

---

#### new

```
> svf new
```

This command will create a new Visualforce page (or find an existing one) for the name that you have entered. This new page will be stubbed out with the necessary custom setting, javascript, and css references needed to run inside Salesforce.

You will be asked to choose the type of build system you are using locally to create this page. If you do not see your build system listed, that means a plugin for that build system has not been created yet. More documentation is to come on building plugins.

> _**NOTE: Check the wiki in this repo to see a tutorial for your specific build system.**_

---

#### serve

```
> svf serve
```

This command will start an ngrok tunnel that will port your local build system's "output" directory to your Visualforce page. The `SimpleVfPageConfig` custom setting will be updated with the randomly generated ngrok tunnel domain which will allow the Visualforce page to access the javascript and css resources being served by your local front end build system.

---

#### deploy

```
> svf deploy
```

This command will deploy the "output" directory of your local build system as is, to the static resource used by the Visualforce page.

> _NOTE: The maximum size limit for a Salesforce static resource is 5MB. The contents of your build system's "output" directory will be zipped up and deployed to Salesforce as a static resource. If your output directory is larger than 5MB after being compressed, please consider using a cdn or another static resource to pull in some of the external dependencies needed by your app._

> _An example of this could be that your app is dependent on jQuery. Rather than including jQuery as a dependency that gets included in the compiled output of your build system, include jQuery via script tag directly on the Visualforce page before the script tags that pull in your app. This will help keep the footprint of your app smaller and still ensures jQuery is available on your page._
