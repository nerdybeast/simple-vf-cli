# Simple VF Cli

### Simple VF Cli is a small command line utility enabling you to develop Visualforce pages using your favorite front-end build system.

Requirements:

* Node v6.0.0+ (this project uses several es6 features and does not transpile down to es5)
* A Salesforce org and a user with metadata api access

How to install:

```
npm install simple-vf-cli -g
```

This will add an `svf` command to your path.

Now run the `svf --version` command to ensure it installed successfully:

*NOTE: The version number displayed for you may vary*

![alt text](/images/svf--version.PNG "svf --version")

You can also run the `svf --help` command to see all available options:

![alt text](/images/svf--help.PNG "svf --help")

### Commands

###### Things to consider:

In order for this cli to work effectively, the use of two custom settings are needed. These custom settings will be created automatically as needed when using the commands below. For this reason, your user will need metadata api access.

#### auth

```
svf auth
```

This command will create an authentication connection to the desired org.  This connection is stored in a levelDb instance provided by this tool.  Your password will be encrypted using a randomly generated key that is unique to your computer and your computer only.  

Neither your password or your unique encryption key will ever be transmitted anywhere, guaranteed!

#### new

```
svf new
```

This command will create a new Visualforce page (or find an existing one with the same name). This new page will be stubbed out with the necessary custom setting, javascript, and css references needed. You will need to uncomment and update the paths to the javascript and css references according to the output of your front end build system.

If you created a Visualforce page called "Tickets", here is what the contents of that newly created Visualforce page will look like:

![alt text](/images/newpage.PNG)

Now assuming your front end build system is [ember-cli v2.X](https://ember-cli.com), the "output" directory will be the `/dist` folder with this structure:

![alt text](/images/dist.PNG)

and the html page created by [ember-cli](https://ember-cli.com) references these assets in this way:

![alt text](/images/dist-html.PNG)

The javascript and css assets needed to make this app render properly are accessed via these paths:

* `/assets/vendor.css`
* `/assets/tickets.css`
* `/assets/vendor.js`
* `/assets/tickets.js`

You need to update the newly created "Tickets" Visualforce page to reference these assets in this exact same way:

![alt text](/images/newpage-updated.PNG)

#### serve

```
svf serve
```

This command will start an ngrok tunnel that will port your local build system's "output" directory to your Visualforce page. The `SimpleVfPageConfig` custom setting will be updated with the randomly generated ngrok tunnel domain which will allow the Visualforce page to access the javascript and css resources being served by your local front end build system.

#### deploy

```
svf deploy
```

This command will deploy the "output" directory of your local build system as is, to the static resource used by the Visualforce page.
