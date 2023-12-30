# Getting started

add this as a dependency to your ttpg environment

```
npm install ttpg-pdf-controls

yarn add ttpg-pdf-controls

pnpm add ttpg-pdf-controls
```

create a new script in your ttpg project and import/require as needed (I'll assume you're using typescript and transpiling)

```typescript
import { GameObject, MultistateObject, refObject } from "@tabletop-playground/api";
import { pdfBrowser, PdfBrowserOptions, TocEntry } from "ttpg-pdf-controls";

((obj: GameObject) => {
    if (obj instanceof MultistateObject) {
        pdfBrowser(obj, 20 /* width of the pdf*/, 29 /* height of the PDF */);
    } else {
        console.error("Not a PDF!");
    }
})(refObject);
```

# Options

you can also pass in an options argument to pdfBrowser as a fourth arg

```typescript
const options: Partial<PdfBrowserOptions> = {
    position: "top", //"top" or "bottom"
    toc: [
        //"table of contents" - this is what shows up when you click on the list button.
        {
            name: "Chapter I - General", //name
            page: 1, //page on the pdf that the chapter is on. This is the page that TTPG expects, not necessarily the PDF's own page count.
            items: [
                //sections within this chapter
                {
                    name: "Section I.1",
                    page: 1,
                },
                {
                    name: "Section I.2",
                    page: 1,
                    items: [
                        //sections can be nested
                        { name: "Subsection I.2.1", page: 1 },
                    ],
                },
            ],
        },
        { name: "Chapter II - Special Rules", page: 2 },
    ],
    index: {
        //searchable index. Keys are what they could/should be searching for, values are a page number or array of page numbers where it appears
        "playing the game": 1,
        movement: [1, 2],
    },
    searchOnEnter: false, //when searching, do they need to hit "enter" for the search to update. By default it is false, but if you find that performance is slow when searching, change this to true.
};

((obj: GameObject) => {
    if (obj instanceof MultistateObject) {
        pdfBrowser(obj, 20, 29, options);
    } else {
        console.error("Not a PDF!");
    }
})(refObject);
```
