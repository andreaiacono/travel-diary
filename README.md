# Travel Diary

A small, static web app for writing diary entries and exporting them in a
pipe-delimited, one-entry-per-line text format:

```
DD/MM/YYYY|Subject|Content
```

Entries are saved in the browser's `localStorage`, so they persist between
visits without any backend or account.

## Features

- **New Entry**: create an entry with a date (defaults to today), a subject,
  and a content textarea. Save or cancel.
- **List view**: shows all entries (date + subject), sorted newest first.
  Click an entry (or its Edit button) to modify it.
- **Export**: writes all entries to a downloaded `.txt` file and copies the
  same text to the clipboard, in the `DD/MM/YYYY|Subject|Content` format
  (newlines within an entry's content are flattened to spaces).

## Running locally

This is a static site with no build step. Serve the folder with any static
file server, e.g.:

```
python3 -m http.server 8000
```

then open `http://localhost:8000`.

## Deployment

Deployed via GitHub Pages from the `main` branch.
