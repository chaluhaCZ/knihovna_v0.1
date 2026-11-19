# Library Treasure Hunt

Two characters have escaped from their books. Scan a hiding-place marker, tap **Catch**, then scan the matching book page and hold the phone steady until the character disappears. Progress is stored in the visitor's browser. Each phone has its own collection.

## Set up the hunt

1. Publish the repository with GitHub Pages using **Settings → Pages → Deploy from a branch**. Select `main` and `/ (root)` and share the resulting HTTPS page. The hunt runs from static files and requires no paid services.
2. Open **Marker sheet** on the site and print at 100%. It contains all four markers, including the two book targets. Leave each marker's white margin intact.
3. Put the hiding markers near the shelves. Place each book marker flat on the open page, with the edge labeled **Top** pointing up the page. The character approaches from the marker's left edge, so leave space to that side where possible.
4. Open the HTTPS page in Safari on iPhone or Chrome on Android. Tap **Start camera** and grant access. Keep the frame well lit and the whole marker visible. Try each location on a phone before opening the hunt to visitors.

For desktop development, run `python3 -m http.server 8000` in the repository root and open `http://localhost:8000`. Use the published HTTPS site when testing on a separate phone.

## Add a character or change the hunt

- **Add a character.** In [characters.js](characters.js), copy an entry and assign a unique `id`, name, icon and book title. Choose `octopus` or `fox` as its model and set its color. For a new model, export a factory in [models.js](models.js) that returns a Three.js `root` group and a `pose(time, wave, retract)` method.
- **Match the book.** Create two distinct custom markers with the [AR.js marker generator](https://ar-js-org.github.io/AR.js/three.js/examples/marker-training/examples/generator.html). Keep the default 50% pattern ratio and save each printable image and its matching pattern file in `assets/markers/`. Set `hideout.image` and `hideout.pattern` for the hiding spot, and `page.image` and `page.pattern` for the destination book. The printable sheet updates from the same file. Use a different marker for every hiding spot and every book page.
- **Adjust size.** Change `size` in the character entry. It scales the 3D model in marker units, where one unit is the width of the black square. The camera stays at its normal zoom. The return animation caps model size at `1.15` to fit the page.
- **Choose animations.** Set `catchAnimation` to `wave` or `spin`, and `returnAnimation` to `crawl`, `hop`, or `swim`. Customize the animation functions in [hunt.js](hunt.js). Catch animations lead into the collection, and return animations approach the center of the marker before disappearing. Keep the book marker visible until the return completes. If tracking is interrupted, scan the same page again.

## Included dependencies

A-Frame 1.6.0, AR.js 3.4.8 and its camera calibration file are bundled in [vendor](vendor) so that the game and print sheet can load all assets from the same site. The directory includes upstream license notices. A-Frame is from the [npm release](https://www.npmjs.com/package/aframe/v/1.6.0) and AR.js from the [3.4.8 tag](https://github.com/AR-js-org/AR.js/tree/3.4.8).
