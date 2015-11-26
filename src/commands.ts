import * as vscode from 'vscode'
import Twitter from './twitter'

export function twitterStart() {
	// Display a message box to the user
	vscode.window.setStatusBarMessage('Refreshing timeline...',
		Twitter.getInstance().getTimeline().then((content) => {
			const filename = Twitter.getInstance().filename;
			console.log('Twitter buffer file: ' + filename);
			vscode.workspace.openTextDocument(filename).then((doc) => {
				vscode.window.showTextDocument(doc).then((editor) => {
					editor.edit((builder) => {
						builder.insert(new vscode.Position(0, 0), content);
					}).then(applied => {
						vscode.commands.executeCommand("workbench.action.markdown.togglePreview");
						console.log('Done');
					}, (error) => {
						console.error('edit failed: ' + error);
						vscode.window.showErrorMessage('Twitter failed to initialize. Please run command \'Reload Window\' to fix it.');
					});
				}, (error) => {
					console.error('showTextDocument failed: ' + error);
				});
			}, (error) => {
				console.error('openTextDocument failed: ' + error);
			});
		}, (error: string) => {
			vscode.window.showErrorMessage('Failed to retrieve timeline: ' + error);
		})
	);
}

export function twitterPost() {
	vscode.window.showInputBox({
		placeHolder: 'What\'s happening?',
		prompt: 'Post your status to Twitter. '
	}).then(value => {
		if (value) {
			console.log("Posting... " + value);
			vscode.window.setStatusBarMessage('Posting status...',
				Twitter.getInstance().postStatus(value).then(result => {
					vscode.window.showInformationMessage('Your status was posted.');
				}, (error) => {
					vscode.window.showErrorMessage('Failed to post the status: ' + error);
				})
			);
		}
	});
}