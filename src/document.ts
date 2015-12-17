import * as vscode from 'vscode';
import * as fs from 'fs';

export default class Document {
	static LockKey = 'refreshInProgress';
	
	private static doInsert(doc: vscode.TextDocument, editor: vscode.TextEditor, content: string): Thenable<vscode.TextDocument> {
		return editor.edit((builder) => {
			builder.insert(new vscode.Position(0, 0), content);
		}).then(applied => {
			doc.save();
			console.log('Twitter edit done: ' + applied);
			return doc;
		}, (error) => {
			console.error('Twitter edit failed: ');
			console.error(error);
			vscode.window.showErrorMessage('Twitter failed to initialize. Please run command \'Reload Window\' to fix it.');
		});
	}

	private static doDeleteAndInsert(range: vscode.Range, doc: vscode.TextDocument, editor: vscode.TextEditor, content: string): Thenable<vscode.TextDocument> {
		return editor.edit((builder) => {
			builder.delete(range);
		}).then(applied => {
			console.log('Twitter delete done: ' + applied);
			return this.doInsert(doc, editor, content);
		}, error => {
			console.error('edit failed: ');
			console.error(error);
			vscode.window.showErrorMessage('Twitter failed to initialize. Please run command \'Reload Window\' to fix it.');
		})
	}

	static openDocument(filename: string, content: string, newWindow:boolean = false): Thenable<vscode.TextDocument> {
		console.log('Twitter buffer file: ' + filename);
		return vscode.workspace.openTextDocument(filename).then((doc) => {
			console.log('Twitter doc opened');
			doc[Document.LockKey] = true;
			const column:vscode.ViewColumn = newWindow ? vscode.ViewColumn.Two : vscode.ViewColumn.One;
			return vscode.window.showTextDocument(doc, column).then((editor) => {
				console.log('Twitter edit begins');
				const start = doc.lineAt(0).range.start;
				const end = doc.lineAt(doc.lineCount - 1).range.end;
				var needClear = false;
				if (start.compareTo(end) < 0) {
					needClear = true;
				}
				if (needClear) {
					return this.doDeleteAndInsert(new vscode.Range(start, end), doc, editor, content);
				} else {
					return this.doInsert(doc, editor, content);
				}
			}, (error) => {
				console.error('showTextDocument failed: ');
				console.error(JSON.stringify(error));
				return Promise.reject(doc);
			});
		}, (error) => {
			console.error('openTextDocument failed: ');
			console.error(JSON.stringify(error));
			return Promise.reject(null);
		});
	}
}