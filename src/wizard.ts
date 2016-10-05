import * as vscode from 'vscode';
var openurl = require('openurl').open;

export default class TwitterWizard {
	
	static firstTimeMsg = 'It looks like this is the first you run VS Code Twitter. You will need to configure a Twitter app to use it.';
	static openingMsg = 'The wizard will guide you through the Twitter app setup process. Would you like to continue?';
	static twitterDevPageMsg = 'First we need to go to https://apps.twitter.com and create a new Twitter app. Would you like to continue?';
	static twitterSetupMsg = 'At apps.twitter.com you will need to create a Twitter app and configure keys and access tokens';
	static twitterIntructionMsg = 'Would you like to read the instructions? Choose Yes or No.';
	static twitterFinishMsg = 'Make sure you have created a new Twitter app and configured the app keys and tokens. Would you like to configure them now?';
	static finalMsg1 = 'Please input the following FOUR keys in your user settings (the values should be from the Twitter app you just registered):';
	static finalMsg2 = '"twitter.consumerkey", "twitter.consumersecret", "twitter.accesstokenkey", "twitter.accesstokensecret"';
	static doneMsg = 'Choose Done when you are finished. Choose Close to abort the wizard';
	static successMsg = 'Congratulations! You did a good job, now click the Twitter status bar item to start using it.';
	static abortMsg = 'You aborted the Wizard. Twitter may not function if it is not properly configured.';
	static failedMsg = 'Sorry, your configuraton is not complete. Twitter will not function until it is properly configured. Please check your user settings.';
	
	static twitterNewAppUrl = 'https://apps.twitter.com/app/new';
	static twitterInstructionurl = 'https://github.com/austin-----/vscode-twitter/wiki/Register-a-Twitter-APP-for-VSCode-Twitter';
	
	static isNotConfigured(): boolean {
		var configuration = vscode.workspace.getConfiguration('twitter');
		var consumerKey = configuration.get<string>('consumerkey');
		var consumerSecret = configuration.get<string>('consumersecret');
		var accessTokenKey = configuration.get<string>('accesstokenkey');
		var accessTokenSecret = configuration.get<string>('accesstokensecret');
		
		if (consumerKey == "" || consumerSecret == "" || accessTokenKey == "" || accessTokenSecret == "") {
			return true;
		} else {
			return false;
		}
	}
	
	static checkConfigurationAndRun(callback: ()=>void): boolean {
		if (this.isNotConfigured()) {
			this.setup(true).then(result => {
				if (result) {
					callback();
				}
			});
			return false;
		}
		callback();
		return true;
	}
	
	static setup(first: boolean): Thenable<boolean> {
		if (first) {
			return vscode.window.showInformationMessage(this.firstTimeMsg).then(v => {
				return this.setup2();
			});
		}
		return this.setup2();
	}
	
	static setup2(): Thenable<boolean> {
		return vscode.window.showInformationMessage(this.openingMsg, 'Continue').then(value => {
			if (value == 'Continue') {
				return this.stepTwitterDevPage();
			} else {
				vscode.window.showWarningMessage(this.abortMsg);
				return Promise.resolve(false);
			}
		});
	}
	
	private static stepTwitterDevPage(): Thenable<boolean> {
		return vscode.window.showInformationMessage(this.twitterDevPageMsg, 'Continue').then( value => {
			if (value == 'Continue') {
				openurl(this.twitterNewAppUrl);
				return this.stepTwitterInstructions();
			} else {
				vscode.window.showWarningMessage(this.abortMsg);
				return Promise.resolve(false);
			}
		});
	}
	
	private static stepTwitterInstructions(): Thenable<boolean> {
		return vscode.window.showInformationMessage(this.twitterSetupMsg).then(v => {
			return vscode.window.showInformationMessage(this.twitterIntructionMsg, 'No', 'Yes').then(value => {
				if (value == 'Yes') {
					openurl(this.twitterInstructionurl);
					return this.stepConfigureSettings();
				} else if (value == 'No') {
					return this.stepConfigureSettings();
				}
				else {
					vscode.window.showWarningMessage(this.abortMsg);
					return Promise.resolve(false);
				}
			});
		});
	}
	
	private static stepConfigureSettings(): Thenable<boolean> {
		return vscode.window.showInformationMessage(this.twitterFinishMsg, 'Yes').then(value => {
			if (value == 'Yes') {
				vscode.commands.executeCommand('workbench.action.openGlobalSettings');
				return this.stepFinalize();
			} else {
				vscode.window.showWarningMessage(this.abortMsg);
				return Promise.resolve(false);
			}
		});
	}
	
	private static stepFinalize(): Thenable<boolean> {
		return vscode.window.showInformationMessage(this.finalMsg1).then(v => {
			return vscode.window.showInformationMessage(this.finalMsg2).then(v => {
				return vscode.window.showInformationMessage(this.doneMsg, 'Done').then(value => {
					if (value == 'Done') {
						if (!this.isNotConfigured()) {
							vscode.window.showInformationMessage(this.successMsg);
							return Promise.resolve(true);
						} else {
							vscode.window.showWarningMessage(this.failedMsg);
							return Promise.resolve(false);
						}
					} else {
						vscode.window.showWarningMessage(this.abortMsg);
						return Promise.resolve(false);
					}
				});
			});
		});
	}
}