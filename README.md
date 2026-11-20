# oranges-dsh-skin

A wallpaper skin for the DSH Web client. One button at the sidebar foot opens a dialog
where a dropped image becomes the interface wallpaper, with sliders for wallpaper
opacity, interface transparency, blur, and dimming.

## Use

1. Click **Skin** at the bottom of the left sidebar, directly above **Settings**.
2. Drop an image into the dialog (or click the box, or paste from the clipboard).
3. Adjust the sliders; the page repaints live.
4. **Apply** keeps the skin, **Cancel** restores what was applied before, **Reset**
   removes the image and the stored settings.

## Where the state lives

- The image is downscaled to at most 2560 px on its long edge, re-encoded as WebP, and
  stored as a Blob in this browser's IndexedDB (`oranges-dsh-skin`).
- The four numeric settings are stored in `localStorage` (`oranges-dsh-skin.prefs`).
- Nothing is sent to the Host and no model request is added. The skin is per browser;
  another browser or machine starts without it.

## How it paints

A plugin-owned stylesheet paints the wallpaper on `body::before` behind the interface,
and the **Interface transparency** slider rewrites four surface tokens on `body`
(`--dsw-alias-bg-base`, `--dsw-alias-bg-layer-1`, `--dsw-alias-bg-layer-2`,
`--dsw-specific-sidebar-fill`) as `color-mix(..., transparent)`. Menus and dialogs keep
their shipped material. The slider starts at 40% so a freshly applied skin is visible;
0% restores the shipped solid surfaces. Disabling the bundle removes the stylesheet, the
tokens, and the stylesheet's variables.

## Dragging a file

While the dialog is open it owns every file drag in the window: the drop lands in the
dialog's dashed box, a drop anywhere else does nothing, and the composer's own full-page
drop mask (`DropOverlay`, z-index 1000) never appears — otherwise it would cover the
dialog. This is why the dialog captures `dragenter`/`dragover`/`dragleave`/`drop` on
`window` in the capture phase: the mask activates on the first file `dragenter` that
reaches the document, so the dialog has to stop those events one level earlier. Close
the dialog to hand dragging back to the composer.

## Known limits

- Surfaces painted by a hard-coded colour rather than a token keep their own background,
  so a few regions can stay opaque.
- The transparency slider stops at 85% removal so text keeps a surface to sit on.
- After a light/dark switch the captured base colours are re-read from the live theme; a
  surface restored to fully opaque immediately after such a switch can keep the previous
  theme's base colour until the next theme change.
