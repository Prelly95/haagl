# Icon Creator

Pixel editor for monochrome LCD glyphs. Draw or import icons, transform them,
and export a C/C++ header of `unsigned char` arrays.

## Run

Open `index.html` in a browser. No build step, no server, no dependencies.
The scripts are classic (non-module), so they work from `file://`.

## Layout

```
index.html          markup + script load order
css/style.css       theme, layout, LCD styling
js/state.js         icon list, current-icon working copy (W/H/grid), undo
js/canvas.js        LCD rendering, pixel painting, cell sizing
js/transforms.js    rotate/flip/shift/invert/clear, shortcuts
js/import.js        image drop/browse/paste, downscale, threshold, dithering
js/codegen.js       bit packing, header generation, parsing (Ctrl+S), highlight
js/icons.js         icon switcher (cycle / add / duplicate / delete)
js/panels.js        panel resize/collapse, toast, copy/download
js/main.js          init
```

Scripts share global scope. `index.html` loads them in dependency order
(state first, main last). If you add a file, slot it before `main.js`.

## Output format

Each icon emits a byte array plus a `BitmapData` descriptor. The generated
header expects `icon_manager.h` to declare `BitmapData`. It wraps everything
in an include guard:

```c
#ifndef _ICON_FN_ICON
#define _ICON_FN_ICON

#include "../icon_manager.h"

static unsigned char fn_icon_data[] = {
    0x00, 0x30, ...};

inline constexpr BitmapData fn_icon_bitmap = {
    .width = 9,
    .height = 9,
    .pixel_data = fn_icon_data,
};
#endif
```

With multiple icons, the guard becomes `_ICONS_H`. Each icon gets its own
`_data`/`_bitmap` pair inside the one guard. To change the guard name or
include path, edit the top of `headerText()` in `js/codegen.js`.

## Multiple icons

The header can hold any number of arrays. The bar under the canvas cycles
through them (◂ ▸). It can also add a blank icon, duplicate the current one,
or delete it.

Each icon has its own name (the "array name" field edits the current icon) and
dimensions. All icons share the packing/bit-order settings and export into the
one header.

Paste a multi-array header into the code panel, then press Ctrl+S. The
importer finds every `<name>_data[]` array in the header. Dimensions come from
the `.width`/`.height` fields of the matching `<name>_bitmap` struct. Legacy
`<name>_width/_height` constants also work. If an array has neither, the
importer uses the dimensions of the same-named icon in the editor. If no such
icon exists, the import fails with an error.

The importer checks the byte count of each array against the selected packing.
The struct dimensions are the final size. The importer zero-pads short data,
drops excess bytes, and regenerates the header so the array always matches
`.width`/`.height`. To change the canvas size, edit `.width`/`.height` in the
code and press Ctrl+S.

## Notes

- Working state lives in `W`, `H`, `grid` (the current icon). `saveCur()` and
  `loadCur()` in `state.js` sync it with the `icons` list.
- Undo (Ctrl+Z) snapshots the whole icon list, so add, delete, and
  switch-and-edit are all reversible. Inside the code textarea, Ctrl+Z is
  native text undo.
- `constexpr` makes the output C++. For plain C, swap the emit lines in
  `js/codegen.js` to `static const unsigned char`.
