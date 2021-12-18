# Link Graph UI for Joplin

This Joplin plugin provides a UI for viewing all links between Joplin notes.

**Note:** Requires Joplin 1.7.0+

Combine this plugin with the [Joplin Backlinks](https://discourse.joplinapp.org/t/automatic-backlinks-with-manual-insert-option/13632) and [Quicklinks](https://discourse.joplinapp.org/t/quick-links-plugin/14214) for Zettelkasten-type functionality!

## Basic Features

* View all links between notes in a graph view - the graph automatically refreshes when you change a note
* Zoom and pan on the graph to see links between your notes (and hopefully spark some ideas)
* Click on Notes in the graph to instantly navigate to the note

Screenshot:

![Note graph demo video](demo.webp)


## Development

1. Check out the Git repository
1. `cd` into the repository and run `npm install` to install dependencies.
1. Run `npm run dist` to build the plugin file.
1. Launch [Joplin in dev
   mode](https://joplinapp.org/api/references/development_mode/) and load the
   plugin.
