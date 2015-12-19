import * as vscode from 'vscode';
import * as fs from 'fs';

export default class Document {
	
	static openDocument(filename: string, content: string, newWindow:boolean = false) {
		console.log('Twitter buffer file: ' + filename);
		fs.writeFileSync(filename, content);
		
        const column = newWindow ? vscode.ViewColumn.Two : null;
        vscode.workspace.openTextDocument(filename).then((doc) => {
				vscode.window.showTextDocument(doc, column);
			}, (error) => {
				console.error('openTextDocument failed: ');
				console.error(JSON.stringify(error));
			});
	}
}