import * as vscode from 'vscode';
import * as fs from 'fs';
import Tweet from './tweet';

export enum WindowBehavior {
    CurrentWindow,
    ColumnOne,
    ColumnTwo
}

export class Document {

    static openDocument(filename: string, content: string, windowBehavior: WindowBehavior) {
        console.log('Twitter buffer file: ' + filename);
        fs.writeFile(filename, content, err => {
            if (err == null) {
                vscode.workspace.openTextDocument(filename).then((doc) => {
                    if (windowBehavior != WindowBehavior.CurrentWindow) {
                        var column = vscode.ViewColumn.One;
                        if (windowBehavior == WindowBehavior.ColumnTwo) {
                            column = vscode.ViewColumn.Two;
                        }
                        vscode.window.showTextDocument(doc, column);
                    } else {
                        vscode.commands.executeCommand('workbench.action.markdown.togglePreview');
                    }
                }, (error) => {
                    console.error('openTextDocument failed: ');
                    console.error(JSON.stringify(error));
                });
            } else {
                console.error(JSON.stringify(err));
            }
        });
    }

    static fixDocument(filename: string, callback: () => void) {
        fs.readFile(filename, (err, data) => {
            if (err == null) {
                const fixed = Tweet.fixServicePort(data.toString('utf8'));
                fs.writeFile(filename, fixed, err => {
                    if (err == null) {
                        vscode.workspace.openTextDocument(filename).then(doc => {
                            callback();
                        });
                    } else {
                        console.error(JSON.stringify(err));
                    }
                });
            } else {
                console.error(JSON.stringify(err));
            }
        });
    }
}