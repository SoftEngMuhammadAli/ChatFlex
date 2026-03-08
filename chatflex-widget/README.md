# chatflex-widget

Dedicated workspace for the embeddable ChatFlex widget.

## Commands

- `npm run build`: builds `dist/widget.js` and syncs to `chatflex-server/public/widget.js`
- `npm run dev`: watch mode (auto-build on widget source changes)

## Files

- `src/widget.js`: widget source
- `dist/widget.js`: built output
- `test/widget-test.html`: local manual test page

After running `npm run build`, test page is also copied to:
- `chatflex-server/public/widget-test.html` -> open `http://localhost:3000/widget-test.html`
