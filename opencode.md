Do not directly create, edit, delete, or modify project files unless the user explicitly asks Codex to do so.
By default, provide steps, explanations, and code snippets only.
Assume the user will manually copy code snippets into the files.
Reviews are allowed by reading files and reporting findings, but do not apply fixes unless explicitly requested.
When suggesting implementation, include the target file path and the snippet to add or replace.
If a change requires multiple files, list each file and provide the exact code snippet for each file.
Before any future file-writing action, confirm that the user has explicitly requested file edits in the current message.