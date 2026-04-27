# Save On Highlighted

Browser extension for Chrome/Comet that helps collect unfamiliar words or short phrases while studying English.

Select text on any page, press a hotkey, and save entries line-by-line for export to Anki workflows.

## Features

- Save selected text with `Ctrl+Shift+S`
- Store session entries in local extension storage
- Editable preview field before export
- Export session to `.txt` (`one line = one entry`)
- Light and dark popup theme
- Export fallback path for browsers with unstable background downloads API

## Installation (Developer Mode)

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome (or the extensions page in Comet).
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the project folder.

## Usage

1. Start reading in the browser.
2. Highlight an unknown word or phrase.
3. Press `Ctrl+Shift+S` to append it to the current session.
4. Open the extension popup to review or edit collected lines.
5. Click **Finish Session** to export a `.txt` file.

## Anki Import

- The exported file is plain text.
- Each line is one entry, which can be used as a field value during import.

## Permissions

- `storage` - keep the current session entries
- `downloads` - export files
- `tabs`, `scripting` - read selected text from the active tab
- `host_permissions: <all_urls>` - allow operation on pages where text is selected

## Privacy

- Data is stored locally in extension storage.
- Exported files are created locally via browser download.
- No external server is required for normal operation.

