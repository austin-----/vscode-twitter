import * as vscode from 'vscode'
import Twitter from './twitter'

export function twitterStart() {
	// Display a message box to the user
	vscode.window.setStatusBarMessage('Refreshing timeline...',
		new Twitter().getTimeline().then((content) => {
			let disposables = [];
			const filename = Twitter.createFile();

			vscode.workspace.openTextDocument(filename).then((doc) => {
				vscode.window.showTextDocument(doc).then((editor) => {
					editor.edit((builder) => {
						builder.insert(new vscode.Position(0, 0), content);
					}).then(applied => {
						vscode.commands.executeCommand("workbench.action.markdown.togglePreview");
						console.log('Done');
					}, (error) => {
						console.error('edit failed: ' + error);
					});
				}, (error) => {
					console.error('showTextDocument failed: ' + error);
				});
			}, (error) => {
				console.error('openTextDocument failed: ' + error);
			});
		}, (error: string) => {
			vscode.window.showErrorMessage(error);
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
				new Twitter().postStatus(value).then(result => {
					if (result) {
						vscode.window.showInformationMessage('Your status was posted.');
					} else {
						vscode.window.showErrorMessage('Failed to post your status.');
					}
				})
			);
		}
	});
}