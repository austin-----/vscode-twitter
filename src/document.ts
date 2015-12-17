import * as vscode from 'vscode';
import * as fs from 'fs';

export default class Document {
	
	static openDocument(filename: string, content: string, newWindow:boolean = false) {
		console.log('Twitter buffer file: ' + filename);
		fs.writeFileSync(filename, content);
		
		if (newWindow) {
			vscode.workspace.openTextDocument(filename).then((doc) => {
				vscode.window.showTextDocument(doc, vscode.ViewColumn.Three);
			}, (error) => {
				console.error('openTextDocument failed: ');
				console.error(JSON.stringify(error));
			});
		} else {
			console.log('toggle preview');
			vscode.commands.executeCommand("workbench.action.markdown.togglePreview");
		}
	}
}