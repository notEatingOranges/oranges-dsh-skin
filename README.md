# oranges-dsh-skin

A wallpaper skin for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web client.
One button at the sidebar foot opens a dialog where a dropped image becomes the interface
wallpaper, with sliders for wallpaper opacity, interface transparency, blur, and dimming.

![The dialog with a dropped image, two opacity sliders, and the wallpaper showing through the interface](docs/preview.svg)

## Install

```sh
# from this repository
dsh plugin --profile <profile> add github:notEatingOranges/oranges-dsh-skin
```

Or in the app: **Plugins → Add plugin**, and pick the checkout directory. Restart once if the
button does not appear; the row shows up as **oranges-dsh-skin** under Plugins.

Requires DSH `>=0.2.0-rc.0` (declared in `engines.dsh`). Web surface only — this bundle has no
Host half and adds no model requests or tools.

## Use

1. Click **Skin** at the bottom of the left sidebar, directly above **Settings**.
2. Drop an image into the dialog (or click the box, or paste from the clipboard).
3. Adjust the sliders; the page repaints live.
4. **Apply** keeps the skin, **Cancel** restores what was applied before, **Reset** removes the
   image and the stored settings.

While the dialog is open it owns every file drag in the window: the dialog's dashed box
highlights, a drop anywhere else does nothing, and the composer's own full-page drop mask never
appears. Close the dialog to hand dragging back to the composer.

## Where the state lives

- The image is downscaled to at most 2560 px on its long edge, re-encoded as WebP, and stored as
  a Blob in this browser's IndexedDB (`oranges-dsh-skin`).
- The four numeric settings are stored in `localStorage` (`oranges-dsh-skin.prefs`).
- Nothing is sent to the Host and no model request is added. The skin is per browser; another
  browser or machine starts without it.

## How it paints

A plugin-owned stylesheet paints the wallpaper on `body::before` behind the interface, and the
**Interface transparency** slider rewrites four surface tokens on `body`
(`--dsw-alias-bg-base`, `--dsw-alias-bg-layer-1`, `--dsw-alias-bg-layer-2`,
`--dsw-specific-sidebar-fill`) as `color-mix(..., transparent)`. Menus and dialogs keep their
shipped material. The slider starts at 40% so a freshly applied skin is visible; 0% restores the
shipped solid surfaces. Disabling the bundle removes the stylesheet, the tokens, and the
stylesheet's variables.

Drag events are captured on `window` in the capture phase while the dialog is open, because the
composer's drop mask (`.mask`, z-index 1000) activates on the first file `dragenter` that reaches
the document and would cover the dialog.

## Known limits

- Surfaces painted by a hard-coded colour rather than a token keep their own background, so a few
  regions can stay opaque.
- The transparency slider stops at 85% removal so text keeps a surface to sit on.
- After a light/dark switch the captured base colours are re-read from the live theme; a surface
  restored to fully opaque immediately after such a switch can keep the previous theme's base
  colour until the next theme change.

## License

MIT
