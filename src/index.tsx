import {
    HorizontalAlignment,
    HorizontalBox,
    ImageButton,
    LayoutBox,
    MultistateObject,
    TextBox,
    TextJustification,
    UIElement,
    Vector,
    VerticalAlignment,
    VerticalBox,
    WidgetSwitcher,
} from "@tabletop-playground/api";
import { boxChild, jsxInTTPG, render, useRef } from "jsx-in-ttpg";

const ICON_NEXT = "https://raw.githubusercontent.com/RobMayer/ttpg-trh-ui/main/hosted/icons/media/play.png";
const ICON_PREV = "https://raw.githubusercontent.com/RobMayer/ttpg-trh-ui/main/hosted/icons/media/reverse.png";

const ICON_NEXT_CHAPTER = "https://raw.githubusercontent.com/RobMayer/ttpg-trh-ui/main/hosted/icons/media/forward.png";
const ICON_PREV_CHAPTER = "https://raw.githubusercontent.com/RobMayer/ttpg-trh-ui/main/hosted/icons/media/backward.png";

const ICON_FIRST = "https://raw.githubusercontent.com/RobMayer/ttpg-trh-ui/main/hosted/icons/media/first.png";
const ICON_LAST = "https://raw.githubusercontent.com/RobMayer/ttpg-trh-ui/main/hosted/icons/media/last.png";

const ICON_TOC = "https://raw.githubusercontent.com/RobMayer/ttpg-trh-ui/main/hosted/icons/format/ul-list.png";
const ICON_SEARCH = "https://raw.githubusercontent.com/RobMayer/ttpg-trh-ui/main/hosted/icons/actions/search.png";
const ICON_CLOSE = "https://raw.githubusercontent.com/RobMayer/ttpg-trh-ui/main/hosted/icons/actions/close.png";

const ICON_SIZE = 32;

export type TocEntry = {
    name: string;
    page: number;
    items?: TocEntry[];
};

export type PdfBrowserOptions = {
    position: "bottom" | "top";
    zOffset: number;
    searchOnEnter: boolean;
    toc: TocEntry[];
    index: { [key: string]: number | number[] };
};

const DEFAULT_OPTIONS: PdfBrowserOptions = {
    position: "bottom",
    zOffset: 0.3,
    searchOnEnter: false,
    toc: [],
    index: {},
};

type OverlayMode = "none" | "toc" | "search";

const sortToc = (toc: TocEntry[]) => {
    toc.sort((a, b) => {
        return a.page - b.page;
    });
    toc.forEach((item) => {
        if (item.items) {
            sortToc(item.items);
        }
    });
};

export const pdfBrowser = (obj: MultistateObject, width: number, height: number, userOptions: Partial<PdfBrowserOptions> = {}) => {
    const options: PdfBrowserOptions = { ...DEFAULT_OPTIONS, ...userOptions };

    // sort the chapter list by page number.
    sortToc(options.toc);
    // get page list of top-level of toc for chapter buttons
    const chapterList = options.toc.map((each) => each.page);

    // setup UI elements
    const barUI = new UIElement();
    barUI.scale = 0.25;
    barUI.anchorX = 0.5;
    barUI.anchorY = options.position === "bottom" ? 0 : 1;
    barUI.position = new Vector((height / 2) * (options.position === "bottom" ? -1 : 1), 0, options.zOffset);
    const overlayUI = new UIElement();
    overlayUI.scale = 0.25;
    overlayUI.anchorX = 0.5;
    overlayUI.anchorY = 0.5;
    overlayUI.position = new Vector(0, 0, options.zOffset);

    // Widget Refs for use in callbacks

    const overlayRef = useRef<LayoutBox>();
    const overlayOptionRef = useRef<WidgetSwitcher>();
    const searchResultsRef = useRef<VerticalBox>();
    const searchInputRef = useRef<TextBox>();
    const paginationRef = useRef<TextBox>();
    const pageOptionsRef = useRef<HorizontalBox>();

    const prevPageRef = useRef<ImageButton>();
    const nextPageRef = useRef<ImageButton>();
    const prevChapterRef = useRef<ImageButton>();
    const nextChapterRef = useRef<ImageButton>();
    const firstPageRef = useRef<ImageButton>();
    const lastPageRef = useRef<ImageButton>();

    // adjust UI as result of state change.
    const updateUIForPage = (page: number) => {
        const limit = obj.getNumStates() - 1;
        page = Math.max(Math.min(page, limit), 0);
        paginationRef.current?.setText(`${page + 1}`);
        if (chapterList.length > 0) {
            prevChapterRef.current?.setEnabled(page + 1 > chapterList[0]);
            nextChapterRef.current?.setEnabled(page + 1 < chapterList[chapterList.length - 1]);
        }
        prevPageRef.current?.setEnabled(page > 0);
        nextPageRef.current?.setEnabled(page < limit);
        firstPageRef.current?.setEnabled(page > 0);
        lastPageRef.current?.setEnabled(page < limit);
    };

    // listen for state change by other means, such as R/Ctrl+R and context menu
    obj.onStateChanged.add((o, newState, oldState) => {
        updateUIForPage(newState);
    });

    // UI onClick handler
    const setPage = (page: number) => {
        const limit = obj.getNumStates() - 1;
        page = Math.max(Math.min(page, limit), 0);
        obj.setState(page);
    };

    let overlayMode: OverlayMode = "none";

    const openTOC = () => {
        overlayRef.current?.setVisible(true);
        overlayOptionRef.current?.setActiveIndex(0);
        overlayMode = "toc";
        pageOptionsRef.current?.setEnabled(false);
    };

    const openSearch = () => {
        overlayRef.current?.setVisible(true);
        overlayOptionRef.current?.setActiveIndex(1);
        pageOptionsRef.current?.setEnabled(false);
        overlayMode = "search";
    };

    const closeOverlay = () => {
        overlayRef.current?.setVisible(false);
        overlayOptionRef.current?.setActiveIndex(0);
        pageOptionsRef.current?.setEnabled(true);
        overlayMode = "none";
    };

    const runSearch = (value: string) => {
        searchResultsRef.current?.removeAllChildren();
        populateSearchResults(value).map((el) => {
            searchResultsRef.current?.addChild(render(el));
        });
    };

    const prevChapter = () => {
        const current = obj.getState();
        const target = chapterList.reduce((acc, each) => {
            return each - 1 < current ? each - 1 : acc;
        }, -Infinity);
        if (target !== -Infinity) {
            setPage(target);
        }
    };

    const nextChapter = () => {
        const current = obj.getState();
        const target = chapterList.reduce((acc, each) => {
            return each - 1 > current ? each - 1 : acc;
        }, Infinity);
        if (target !== Infinity) {
            setPage(target);
        }
    };

    const populateSearchResults = (value: string) => {
        const results = Object.keys(options.index).filter((k) => k.toLowerCase().includes(value.toLowerCase()));

        return results.map((key) => {
            const v = options.index[key];
            const pages = Array.isArray(v) ? v : [v];

            return (
                <horizontalbox>
                    {boxChild(1, key)}
                    <horizontalbox>
                        {pages.map((p) => {
                            return (
                                <button
                                    onClick={() => {
                                        setPage(p - 1);
                                        closeOverlay();
                                    }}
                                >
                                    p.{p}
                                </button>
                            );
                        })}
                    </horizontalbox>
                </horizontalbox>
            );
        });
    };

    barUI.widget = render(
        <horizontalbox gap={4}>
            <horizontalbox gap={4} ref={pageOptionsRef}>
                <imagebutton
                    ref={firstPageRef}
                    disabled={obj.getState() <= 0}
                    onClick={() => {
                        setPage(0);
                    }}
                    url={ICON_FIRST}
                    width={ICON_SIZE}
                />
                <imagebutton ref={prevChapterRef} disabled={chapterList.length === 0 || obj.getState() <= chapterList[0] - 1} onClick={prevChapter} url={ICON_PREV_CHAPTER} width={ICON_SIZE} />
                <imagebutton
                    ref={prevPageRef}
                    disabled={obj.getState() <= 0}
                    onClick={() => {
                        setPage(obj.getState() - 1);
                    }}
                    url={ICON_PREV}
                    width={ICON_SIZE}
                />
                <layout width={64}>
                    <input
                        ref={paginationRef}
                        type={"positive-integer"}
                        value={`${obj.getState() + 1}`}
                        onCommit={(el, p, value) => {
                            const n = Number(value);
                            if (!isNaN(n)) {
                                const limit = obj.getNumStates();
                                if (n > limit) {
                                    el.setText(`${limit}`);
                                    obj.setState(limit - 1);
                                } else if (n < 1) {
                                    obj.setState(0);
                                    el.setText(`1`);
                                } else {
                                    obj.setState(n - 1);
                                }
                            }
                        }}
                    />
                </layout>
                <imagebutton
                    ref={nextPageRef}
                    disabled={obj.getState() === obj.getNumStates() - 1}
                    onClick={() => {
                        setPage(obj.getState() + 1);
                    }}
                    url={ICON_NEXT}
                    width={ICON_SIZE}
                />
                <imagebutton
                    ref={nextChapterRef}
                    disabled={chapterList.length === 0 || obj.getState() >= chapterList[chapterList.length - 1] - 1}
                    onClick={nextChapter}
                    url={ICON_NEXT_CHAPTER}
                    width={ICON_SIZE}
                />
                <imagebutton
                    ref={lastPageRef}
                    disabled={obj.getState() === obj.getNumStates() - 1}
                    onClick={() => {
                        setPage(obj.getNumStates() - 1);
                    }}
                    url={ICON_LAST}
                    width={ICON_SIZE}
                />
            </horizontalbox>
            <imagebutton
                onClick={() => {
                    overlayMode === "toc" ? closeOverlay() : openTOC();
                }}
                url={ICON_TOC}
                width={ICON_SIZE}
                disabled={chapterList.length === 0}
            />
            <imagebutton
                onClick={() => {
                    overlayMode === "search" ? closeOverlay() : openSearch();
                }}
                disabled={Object.keys(options.index).length === 0}
                url={ICON_SEARCH}
                width={ICON_SIZE}
            />
        </horizontalbox>
    );

    overlayUI.widget = render(
        <layout ref={overlayRef} width={width * 40} height={height * 40} padding={10} hidden>
            <border color={"#000"}>
                <switch value={0} ref={overlayOptionRef}>
                    <verticalbox valign={VerticalAlignment.Top}>
                        <border color={"#111"}>
                            <horizontalbox halign={HorizontalAlignment.Fill} valign={VerticalAlignment.Center}>
                                {boxChild(
                                    1,
                                    <text size={16} justify={TextJustification.Center} bold>
                                        Table of Contents
                                    </text>
                                )}
                                <imagebutton width={ICON_SIZE / 2} url={ICON_CLOSE} onClick={closeOverlay} />
                            </horizontalbox>
                        </border>
                        {boxChild(
                            1,
                            <verticalbox>
                                {options.toc.reduce<JSX.Element[]>((acc, each) => {
                                    acc.push(
                                        ...renderTocItem(
                                            each,
                                            (p: number) => {
                                                setPage(p - 1);
                                                closeOverlay();
                                            },
                                            0
                                        )
                                    );
                                    return acc;
                                }, [])}
                            </verticalbox>
                        )}
                    </verticalbox>
                    <verticalbox valign={VerticalAlignment.Top}>
                        <border color={"#111"}>
                            <horizontalbox halign={HorizontalAlignment.Fill} valign={VerticalAlignment.Center}>
                                {boxChild(
                                    1,
                                    <text size={16} justify={TextJustification.Center} bold>
                                        Search
                                    </text>
                                )}
                                <imagebutton width={ICON_SIZE / 2} url={ICON_CLOSE} onClick={closeOverlay} />
                            </horizontalbox>
                        </border>
                        <border color={"#222"}>
                            <layout padding={{ left: 8, right: 8 }}>
                                <horizontalbox valign={VerticalAlignment.Center} gap={8}>
                                    <image url={ICON_SEARCH} width={16} />
                                    {boxChild(
                                        1,
                                        <input
                                            ref={searchInputRef}
                                            onCommit={
                                                options.searchOnEnter
                                                    ? (el, p, v) => {
                                                          runSearch(v);
                                                      }
                                                    : undefined
                                            }
                                            onChange={
                                                options.searchOnEnter
                                                    ? undefined
                                                    : (el, p, v) => {
                                                          runSearch(v);
                                                      }
                                            }
                                            size={16}
                                        />
                                    )}
                                    <imagebutton
                                        url={ICON_CLOSE}
                                        width={16}
                                        onClick={() => {
                                            searchInputRef.current?.setText("");
                                            runSearch("");
                                        }}
                                    />
                                </horizontalbox>
                            </layout>
                        </border>
                        {boxChild(1, <verticalbox ref={searchResultsRef}>{populateSearchResults("")}</verticalbox>)}
                    </verticalbox>
                </switch>
            </border>
        </layout>
    );

    obj.addUI(overlayUI);
    obj.addUI(barUI);
};

const renderTocItem = (item: TocEntry, onClick: (page: number) => void, depth: number): JSX.Element[] => {
    const children = (item.items ?? []).reduce<JSX.Element[]>((acc, each) => {
        acc.push(...renderTocItem(each, onClick, depth + 1));
        return acc;
    }, []);

    return [
        <horizontalbox>
            <text>{"  ".repeat(depth)}</text>
            {boxChild(
                1,
                <button
                    justify={TextJustification.Left}
                    onClick={() => {
                        onClick(item.page);
                    }}
                >
                    {item.name}
                </button>
            )}
        </horizontalbox>,
        ...children,
    ];
};
