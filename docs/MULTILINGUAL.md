# Languages and rollback

## Before this change

The complete working English site is preserved at:

- Branch: `backup/pre-multilingual-2026-10-18`
- Commit: `687faddcb4b4945b96522b26e1e602d4a04ced7e`
- GitHub: https://github.com/KASignDag/zkas-io/tree/backup/pre-multilingual-2026-10-18

Restore the site's files from that branch in a new commit on `main` to publish the previous version again. Keep the deployment configuration (`wrangler.jsonc` and `.assetsignore`) from the same backup. A rollback does not require deleting the backup or rewriting Git history.

## Translation files

English is the original page in `index.html`. `i18n/en.json` records its translation keys. The other `i18n/*.json` files contain the matching translated text, including navigation, wallet guide panels, ZKrise information and accessibility labels. English plus 23 other languages match the language choices on ZKas.info. Traditional Chinese uses Taiwan script conversion.

`i18n.js` changes text nodes and labels without replacing links, controls or event listeners. It remembers a successful selection locally, supports `?lang=es` style shareable links and sets the reading direction for Arabic, Persian and Urdu. A failed download leaves the current language visible and displays a retry message. English works without JavaScript.

The dictionaries are stored and served with this site. Visitors do not send page text to a remote translation service. Only the selected language file is downloaded. The asset allowlist must include `i18n.js` and `i18n/**`.

## Editing text

Translation keys are the English text with whitespace collapsed. When changing English content, update the corresponding key and value in every dictionary. Keep protocol names, numerical values, percentages, URLs and identifiers accurate. Do not put HTML in dictionary values; translations are applied as text.

The initial translations are generated automatically and reviewed for protocol names and numerical consistency. They have not received a native speaker's review in every language. The translated page shows a short note pointing visitors to the original English wording. Community corrections can be made directly in the relevant JSON file.
