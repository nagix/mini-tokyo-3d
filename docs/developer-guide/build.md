# Building Mini Tokyo 3D

If you want to try out the latest features before they are released, modify the code yourself, or contribute to Mini Tokyo 3D development, you can build your project from source code by following the instructions in this section.

## Preparation for Build

The following software are required.

- The latest version of [Node.js](https://nodejs.org)
- The latest version of [Git](https://git-scm.com) if you're cloning the repository

Mini Tokyo 3D uses the following data sources and requires an access token for each of them at build time and run time. Follow the instructions below to obtain access tokens.

Data Source | Sign-Up URL | Access Token Format
:-- | :-- | :--
[Open Data Challenge for Public Transportation in Tokyo](https://tokyochallenge.odpt.org/en/) | [Link](https://developer-tokyochallenge.odpt.org/en/users/sign_up) | A string of numbers and lowercase letters
[Public Transportation Open Data Center](https://www.odpt.org) | [Link](https://developer.odpt.org/en/users/sign_up) | A string of numbers and lowercase letters
[Mapbox](https://www.mapbox.com) | [Link](https://account.mapbox.com/auth/signup/) | Alphanumeric string containing a period beginning with `pk.`

### Getting an Access Token for Open Data Challenge for Public Transportation in Tokyo

Mini Tokyo 3D is using train and airplane data from the [Open Data Challenge for Public Transportation in Tokyo](https://tokyochallenge.odpt.org/en/). You need to register as a developer to get the data, but it is available for free.

1. Register as a developer by entering your user information on the [developer site's registration page](https://developer-tokyochallenge.odpt.org/en/users/sign_up). It may take a few days to receive your registration confirmation email.
2. After logging in with your developer account, click on "Account" in the menu at the top of the screen and select "Manage Access Token".
3. A list of access tokens will be displayed. Only the "DefaultApplication" token will be displayed right after creating the account. Click on "Issuing an access token".
4. Enter an application name in the "Name" field and click the "Submit" button.
5. The newly created token will appear in the list of access tokens

### Getting an Access Token for Public Transportation Open Data Center

Mini Tokyo 3D is also using data from the [Public Transportation Open Data Center](https://www.odpt.org). Again, you need to register as a developer to get the data, but it is available for free.

1. Register as a developer by entering your user information on the [developer site's registration page](https://developer.odpt.org/en/users/sign_up). It may take a few days to receive your registration confirmation email.
2. After logging in with your developer account, click on "Account" in the menu at the top of the screen and select "Manage Access Token".
3. A list of access tokens will be displayed. Only the "DefaultApplication" token will be displayed right after creating the account. Click on "Issuing an access token".
4. Enter an application name in the "Name" field and click the "Submit" button.
5. The newly created token will appear in the list of access tokens

### Getting an Access Token for Mapbox

See [Getting a Mapbox Access Token](./integration.md#getting-a-mapbox-access-token).

## Build Instructions

### 1. Downloading Files

Download the latest `master` branch from Mini Tokyo 3D's [GitHub repository](https://github.com/nagix/mini-tokyo-3d) and extract the zip file. A directory named `mini-tokyo-3d-master` will be created, so change the name to `mini-tokyo-3d`.

```bash
curl -LO https://github.com/nagix/mini-tokyo-3d/archive/master.zip
unzip master.zip
mv mini-tokyo-3d-master mini-tokyo-3d
```

If you are using Git, you can clone the repository directly from GitHub instead of the above commands.

```bash
git clone https://github.com/nagix/mini-tokyo-3d.git
```

### 2. Build

Go to the top directory of Mini Tokyo 3D.

```bash
cd mini-tokyo-3d
```

Create a JSON file containing the access tokens for Open Data Challenge for Public Transportation in Tokyo and Public Transportation Open Data Center obtained in the build preparation step and save it in this directory with the file name `secrets`.

```json
{
    "tokyochallenge": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "odpt": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

Install the dependent npm modules.

```bash
npm install
```

Build the project with the following command.

```bash
npm run build-all
```

When the build completes successfully, the `dist` directory will be created. It includes style sheet and JavaScript files for distribution. The `build` directory will also be created at the same time. It contains all the files needed for deployment on your web site.

### 3. Deploying on a Web Site

The `index.html` in the `build` directory is for the web page on [https://minitokyo3d.com](http://minitokyo3d.com). Replace the `accessToken` property, which is passed to a `Map` constructor, with the Mapbox access token obtained in the build preparation step. Then, edit it for your web site, and place all the files in the `build` directory in the public directory of your web server.
