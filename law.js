#!/usr/bin/env node

var request = require('request');
var cheerio = require('cheerio');
var mammoth = require("mammoth");
var tidy = require('htmltidy').tidy;
var _ = require('underscore');
var soword = require('./node-soword');
var moment = require('moment');
require('coffee-script');
var TableScrape = require('./TableScrape');
var curl     =  require('request-promise');
var Promise  =  require('bluebird');
var html     =  require('cheerio');
var _        =  require('lodash');
var fs = Promise.promisifyAll(require('fs'));

/*
{
    "alignment": null,
    "children": [
        {
            "children": [
                {
                    "type": "tab"
                }
            ],
            "styleId": null,
            "styleName": null,
            "type": "run",
            "verticalAlignment": "baseline"
        },
        {
            "name": "_Toc423522857",
            "type": "bookmarkStart"
        },
        {
            "children": [
                {
                    "type": "text",
                    "value": "1"
                }
            ],
            "styleId": null,
            "styleName": null,
            "type": "run",
            "verticalAlignment": "baseline"
        },
        {
            "children": [
                {
                    "type": "tab"
                }
            ],
            "styleId": null,
            "styleName": null,
            "type": "run",
            "verticalAlignment": "baseline"
        },
        {
            "children": [
                {
                    "type": "text",
                    "value": "Short title and commencement"
                }
            ],
            "styleId": null,
            "styleName": null,
            "type": "run",
            "verticalAlignment": "baseline"
        }
    ],
    "htmlAttributes": {},
    "indentHanging": "850",
    "indentLeft": "850",
    "numbering": null,
    "styleId": "DraftHeading1",
    "styleName": "Draft Heading 1",
    "type": "paragraph"
}
*/

function unfragment(element) {
    // console.log(JSON.stringify(element));
    if (~JSON.stringify(element).indexOf('Concealing the birth of a child')) {
        console.log(JSON.stringify(element));
    }
    var childMerge = function(element, pos) {
        var n;
        // Merge element.children.children
        if (!element.children[pos].children) {
            // console.log(pos);
            // console.log(JSON.stringify(element));
            // console.log(JSON.stringify(element.children[pos]));
        }
        for (n = 0; n < element.children[pos].children.length - 1; /* no increment */ ) {
            if (element.children[pos].children[n].type === element.children[pos].children[n + 1].type && element.children[pos].children[n].value !== undefined) {
                element.children[pos].children[n].value += element.children[pos].children[n + 1].value;
                delete(element.children[pos].children[n + 1]);
                element.children[pos].children = _.compact(element.children[pos].children);
                // console.log("XXX: " + element.children[pos].children[n].value);
            } else {
                ++n;
            }
        }
    }
    var pos, len;

    pos = 0;
    len = element.children.length;
    while (pos < len - 1) {
        // Join element.children together
        if (element.children[pos].children === undefined) {
            ++pos;
            continue;
        }

        if (element.children[pos + 1].children && _.isEqual(_.omit(element.children[pos], 'children'), _.omit(element.children[pos + 1], 'children'))) {
            element.children[pos].children = element.children[pos].children.concat(element.children[pos + 1].children);
            delete(element.children[pos + 1]);
            element.children = _.compact(element.children);
            len = element.children.length;
            // console.log(element.children[pos]);
        } else {
            childMerge(element, pos); // Our changes are deep, so we shouldn't have to have an 'element = ' LHS
            ++pos;
        }
        childMerge(element, element.children.length - 1);
    }
    return element;
}

function text(element) {
    // {"type":"paragraph","children":[],"styleId":"DraftHeading1","styleName":"Draft Heading 1",
    // "numbering":null,"alignment":null,"indentLeft":"850","indentHanging":"850"}

    /*
{
    "alignment": null,
    "children": [
        {
            "children": [
                {
                    "type": "tab"
                }
            ],
            "styleId": null,
            "styleName": null,
            "type": "run",
            "verticalAlignment": "baseline"
        },
        {
            "children": [
                {
                    "type": "text",
                    "value": "(2)"
                }
            ],
            "styleId": null,
            "styleName": null,
            "type": "run",
            "verticalAlignment": "baseline"
        },
        {
            "children": [
                {
                    "type": "tab"
                },
                {
                    "type": "text",
                    "value": "For the purposes of subsection (1), if an offence is alleged to have been committed between 2 dates, one before and one on or after the commencement of section 22 of the "
                }
            ],
            "styleId": null,
            "styleName": null,
            "type": "run",
            "verticalAlignment": "baseline"
        },
        {
            "children": [
                {
                    "type": "text",
                    "value": "Justice Legislation Amendment Act 2015"
                }
            ],
            "isBold": true,
            "isItalic": false,
            "isStrikethrough": false,
            "isUnderline": false,
            "styleId": null,
            "styleName": null,
            "type": "run",
            "verticalAlignment": "baseline"
        },
        {
            "children": [
                {
                    "type": "text",
                    "value": ", the offence is alleged to have been committed before that commencement."
                }
            ],
            "styleId": null,
            "styleName": null,
            "type": "run",
            "verticalAlignment": "baseline"
        }
    ],
    "htmlAttributes": {},
    "indentHanging": "1361",
    "indentLeft": "1361",
    "numbering": null,
    "styleId": "DraftHeading2",
    "styleName": "Draft Heading 2",
    "type": "paragraph"
}
*/
    // element = unfragment(element);
    var found;
    if (element.children && _.filter(element.children, function(v) {
            // console.log(JSON.stringify(element));
            // if (v.children && v.children[0] && v.children[0].type == 'text') return true;
            if (v.children && _.filter(v.children, function(w) {
                    if (found == null && w.type === 'text') {
                        found = w.value;
                    }
                }).length);
        })
        // return found ? found : "";
        // if (textChildren.length) {
        // return textChildren[0].children[0].value;
        // }
    );
    if (found) return found;
    return "";
}

function tabSplit(element) {
    // element = unfragment(element);
    if (~JSON.stringify(element).indexOf('Concealing the birth of a child')) {
        // console.log(JSON.stringify(element));
    }
    var found = [];
    if (element.children && _.filter(element.children, function(v) {
            // console.log(JSON.stringify(element));
            // if (v.children && v.children[0] && v.children[0].type == 'text') return true;
            if (v.children && _.filter(v.children, function(w) {
                    if (w.type === 'text') {
                        found.push(w.value);
                    }
                }).length);
        })
        // return found ? found : "";
        // if (textChildren.length) {
        // return textChildren[0].children[0].value;
        // }
    );
    // console.log('tabSplit: ' + found.join(', '));
    return found;
    return "";
}

function numTrim(s) {
    return s.replace(/^[\s\uFEFF\xA0(]+|[\s\uFEFF\xA0)]+$/g, '');
}

var lastIndentLeft = 0;
var lastElement;

function transformParagraph(element, index, array) {
    var t;
    if (element.type === 'table') console.log(JSON.stringify(element));
    // console.log(JSON.stringify(element));

    if (element.type === 'paragraph' && !element.children.length) console.log("Empty Paragraph", JSON.stringify(element));
    element = unfragment(element);
    if (element && element.indentLeft && element.styleId && element.styleId.match(/(Draft|Amend)Heading/)) {
        // console.log(JSON.stringify(element));
        var left = Math.floor(element.indentLeft / 10) * 10;
        switch (left) {
            case 850:
                element.styleId = "DraftHeading1";
                break;
            case 1360:
                element.styleId = "DraftHeading2";
                break;
            case 1870:
                element.styleId = "DraftHeading3";
                break;
            case 2380:
                element.styleId = "DraftHeading4";
                break;
            case 2890:
                element.styleId = "DraftHeading5";
                break;
            case 3400:
                element.styleId = "DraftHeading6";
                break;
        }
        // console.log(left, element.styleId);
    }

    // Okay, we need to add a lot of assert() statements or somesuch to catch the inevitable errors in source 

    if (element.numbering && element.numbering.levelText) {
        var levelText = element.numbering.levelText;
        if (levelText.length) {

            // var ind = elements.attributes["data-classIndent"];
            // console.log("e(" + ind + "," + element.styleId + ");");
            // element.styleId += '" data-indent-hanging="' + element.alignment; // alignment" + element.alignment);
            // console.log(element.styleId);

           var ref, ref1, ref2;

           if (((ref = element.children) != null ? (ref1 = ref[0]) != null ? (ref2 = ref1.children) != null ? ref2[0] : void 0 : void 0 : void 0) != null) {
              if (element.children[0].children[0].type === "text") {
                 element.children[0].children[0].value = levelText + "\t" + element.children[0].children[0].value;
              }
           }
        }
    }

    if (element.alignment) {
       if (!element.styleId) {
          element.styleId="FakeStyleForSize";
       }
       element.htmlAttributes = _.extend({}, element.htmlAttributes, {
          "data-alignment": element.alignment
       });
    }
    if (element.size) {
       console.log("size: " + element.size);
       if (!element.styleId) {
          element.styleId="FakeStyleForSize";
       }
       element.htmlAttributes = _.extend({}, element.htmlAttributes, {
          "data-size": element.size
       });
    }

    // The section, subsection and paragraph heirachy
    if (element.styleId === 'DraftHeading1') {
        t = text(element);
        if (t.length) {
            section = t.trim().toLowerCase();
            element.htmlAttributes = _.extend({}, element.htmlAttributes, {
                id: "__sec_" + section + ""
            });
        }
    }

    if (element.styleId === 'DraftHeading2') {
        t = text(element);
        if (t.length) {
            subsection = numTrim(t).toLowerCase();
            element.htmlAttributes = _.extend({}, element.htmlAttributes, {
                id: "__sec_" + section + "__subsec_" + subsection
            });
        }
    }

    if (element.styleId === 'DraftHeading3') {
        t = text(element);
        if (t.length) {
            paragraph = numTrim(t).toLowerCase();
            element.htmlAttributes = _.extend({}, element.htmlAttributes, {
                id: "__sec_" + section + "__subsec_" + subsection + "__para_" + paragraph
            });
            // console.log(element);
        }
    }



    // The part, division and subdivision heirachy

    // Part II—Offenders
    // Division 1A—Piracy
    // (1) Gay     (subdivision)

    if (element.styleId === 'Heading-PART') {
        t = text(element).trim();
        if (t.length) {
            if (t.substr(0, 4) === 'Part') {
                // Generated by CoffeeScript 1.9.1
                var lhs, lvl, num, ref, ref1, rhs;

                ref = t.split(String.fromCharCode(8212)), lhs = ref[0], rhs = ref[1];

                ref1 = lhs.trim().split(' '), lvl = ref1[0], num = ref1[1];

                if (num && num.length) {
                    part = num.toLowerCase();
                    element.htmlAttributes = _.extend({}, element.htmlAttributes, {
                        id: "__part_" + part
                    });
                } else {
                    console.log('error processing part');
                    console.log(element);
                    exit(1);
                }
            } else {
                var t2 = t.split(' ');
                if (t2.length) {
                    t2 = t2[0];
                }
                // switch (t2) ?  or perhaps make generic rheirachical thingy...
                // Schedules
                // ..
            }
        }
    }

    if (element.styleId === 'Heading-DIVISION') {
        t = text(element).trim();
        if (t.length) {
            // Generated by CoffeeScript 1.9.1
            var lhs, lvl, num, ref, ref1, ref2, rest, rhs,
                slice = [].slice;

            if (t.substr(0, 8) === "Division") {
                // console.log('t is division is ' + t);
                ref = t.split(String.fromCharCode(8212)), lhs = ref[0], rhs = ref[1];
                ref1 = lhs.trim().split(' '), lvl = ref1[0], num = ref1[1];
                if (num) {
                    if (num.length) {
                        division = num.trim().toLowerCase();
                        element.htmlAttributes = _.extend({}, element.htmlAttributes, {
                            id: "__part_" + part + "__div_" + division
                        });
                    }
                } else {
                    // console.log("num was not defined, t was '" + t + "'");
                    // console.log(JSON.stringify(element));
                    exit(1);
                }
            } else if (t.substr(0, 1) === "(") {
                var ts = tabSplit(element);
                if (ts.length > 1) {
                    ref2 = ts, num = ref2[0], rest = 2 <= ref2.length ? slice.call(ref2, 1) : [];
                    subdivision = numTrim(num);
                    // rest = rest.join(' ');
                    element.styleId = 'Heading-SUBDIVISION';
                    element.htmlAttributes = _.extend({}, element.htmlAttributes, {
                        id: "__part_" + part + "__div_" + division + "__subdiv_" + subdivision
                    });
                } else {
                    /*
                     * {
                     *     "alignment": null,
                     *     "children": [
                     *         {
                     *             "name": "_Toc423522863",
                     *             "type": "bookmarkStart"
                     *         },
                     *         {
                     *             "children": [
                     *                 {
                     *                     "type": "text",
                     *                     "value": "(1) "
                     *                 }
                     *             ],
                     *             "styleId": null,
                     *             "styleName": null,
                     *             "type": "run",
                     *             "verticalAlignment": "baseline"
                     *         },
                     *         {
                     *             "children": [
                     *                 {
                     *                     "type": "text",
                     *                     "value": "Homicide"
                     *                 }
                     *             ],
                     *             "isBold": false,
                     *             "isItalic": true,
                     *             "isStrikethrough": false,
                     *             "isUnderline": false,
                     *             "styleId": null,
                     *             "styleName": null,
                     *             "type": "run",
                     *             "verticalAlignment": "baseline"
                     *         }
                     *     ],
                     *     "htmlAttributes": {},
                     *     "indentHanging": null,
                     *     "indentLeft": null,
                     *     "numbering": null,
                     *     "styleId": "Heading-DIVISION",
                     *     "styleName": "Heading - DIVISION",
                     *     "type": "paragraph"
                     * }
                     */
                    // console.log("not enough tabs for subdivision");
                    // console.log(JSON.stringify(element), JSON.stringify(ts));
                    exit(1);
                }
            } else {
                // this must be a crossheading
            }


        }

    }

    /*
     * var indentLeft = element.indentLeft;
     * var newElement;
     * if (indentLeft > lastIndentLeft) {
     *    var endIndex = index;
     *    if (lastElement == null) {
     *       while (endIndex-- > 0) {
     *          if (array[endIndex] && array[endIndex].children) {
     *             newElement = appendElementTo(element, array[endIndex]);
     *             // if (!element) { console.log(">>>" + JSON.stringify(array[endIndex])); }
     *             if (!newElement) lastElement = element;
     *             element = newElement;
     *             return element;
     *          }
     *       }
     *    } else {
     *             newElement = appendElementTo(element, lastElement);
     *             // if (!element) { console.log(">>>" + JSON.stringify(array[endIndex])); }
     *             if (!newElement) lastElement = element;
     *             element = newElement;
     *             return element;
     *    }
     * }
     * lastIndexLeft = indentLeft;
     */
    return element;
}

function appendElementTo(e, p) {
    if (p.children) {
        // e.type = "run";
        p.children.push(e);
        console.log(JSON.stringify(p));
        return null;
    }
    console.log("appendElementTo: parent had no children array");
    return e;
}

function transformElements(element, index, array) {
    if (element.children) {
        element.children.forEach(transformElements);
    }
    if (element.type === "paragraph" && array == null) {
        console.log("Tep0: " + JSON.stringify(element));
        exit(1);
    }
    if (element.type === "paragraph") {
        element = transformParagraph(element, index, array);
        if (!element) {
            // console.log("Deleting: " + JSON.stringify(array[index]));
            delete array[index];
        }
        return element;
    }
    if (element.type === "run") {
        element = transformParagraph(element, index, array);
        if (!element) {
            // console.log("Deleting: " + JSON.stringify(array[index]));
            delete array[index];
        }
        return element;
    }
    return element;
}
var mammothOptions = {
    // transformDocument: mammoth.transforms.paragraph(transformParagraph),
    transformDocument: transformElements,
    idPrefix: 'doc',
    styleMap: ["p.Normal => p.Normal",
        "p.Heading1 => p.Heading1",
        "p.Heading2 => p.Heading2",
        "p.Heading3 => p.Heading3",
        "p.Heading4 => p.Heading4",
        "p.Heading5 => p.Heading5",
        "p.Heading6 => p.Normal.Heading6",
        "p.Heading7 => p.Normal.Heading7",
        "p.Heading8 => p.Normal.Heading8",
        "p.Heading9 => p.Normal.Heading9",
        "p.AmendBody1 => p.Normal-Draft.AmendBody1",
        "p.Normal-Draft => p.Normal-Draft",
        "p.AmendBody2 => p.Normal-Draft.AmendBody2",
        "p.AmendBody3 => p.Normal-Draft.AmendBody3",
        "p.AmendBody4 => p.Normal-Draft.AmendBody4",
        "p.Header => p.Normal.Header",
        "p.Footer => p.Normal.Footer",
        "p.AmendBody5 => p.Normal-Draft.AmendBody5",
        "p.AmendHeading-DIVISION => p.Normal-Draft.AmendHeading-DIVISION",
        "p.AmendHeading-PART => p.Normal-Draft.AmendHeading-PART",
        "p.AmendHeading-SCHEDULE => p.Normal-Draft.AmendHeading-SCHEDULE",
        "p.AmendHeading1 => p.Normal.AmendHeading1",
        "p.AmendHeading2 => p.Normal.AmendHeading2",
        "p.AmendHeading3 => p.Normal.AmendHeading3",
        "p.AmendHeading4 => p.Normal.AmendHeading4",
        "p.AmendHeading5 => p.Normal.AmendHeading5",
        "p.BodyParagraph => p.BodyParagraph",
        "p.BodyParagraphSub => p.BodyParagraphSub",
        "p.BodyParagraphSub-Sub => p.BodyParagraphSub-Sub",
        "p.BodySection => p.BodySection",
        "p.BodySectionSub => p.BodySectionSub",
        "p.Defintion => p.Defintion",
        // "p.DraftHeading1 => section:fresh", 
        // "p.DraftHeading2 => section > subsection:fresh", 
        // "p.DraftHeading3 => section > subsection > paragraph:fresh", 
        // "p.DraftHeading4 => section > subsection > paragraph > subparagraph:fresh", 
        // "p.DraftHeading5 => section > subsection > paragraph > subparagraph > line:fresh", 
        "r.FakeStyleForSize => span.FakeStyleForSize",
        "p.DraftHeading1 => p.Normal.DraftHeading1",
        "p.DraftHeading2 => p.Normal.DraftHeading2",
        "p.DraftHeading3 => p.Normal.DraftHeading3",
        "p.DraftHeading4 => p.Normal.DraftHeading4",
        "p.DraftHeading5 => p.Normal.DraftHeading5",
        "p.ActTitleFrame => p.Normal.ActTitleFrame",
        // "p.Heading-PART        => div.part",
        // "p.Heading-DIVISION    => div.part > div.division",
        // "p.Heading-SUBDIVISION => div.part > div.division > div.subdivision",

        "p.Heading-PART => p.Heading-PART",
        "p.Heading-DIVISION => p.Heading-DIVISION",
        "p.Heading-SUBDIVISION => p.Heading-SUBDIVISION",
        "p.Heading-SCHEDULE => p.Heading-SCHEDULE",
        "p.Heading1-Manual => p.Heading1-Manual",
        "p.Normal-Schedule => p.Normal-Schedule",
        "p.CopyDetails => p.CopyDetails",
        "p.NotesBody => p.NotesBody",
        "p.NotesHeading => p.NotesHeading",
        "p.Penalty => p.Penalty",
        "p.Schedule-DIVISION => p.Heading-DIVISION.Schedule-DIVISION",
        "p.Schedule-PART => p.Heading-PART.Schedule-PART",
        "p.ScheduleAutoHeading1 => p.Normal-Schedule.ScheduleAutoHeading1",
        "p.ScheduleAutoHeading2 => p.Normal-Schedule.ScheduleAutoHeading2",
        "p.ScheduleAutoHeading3 => p.Normal-Schedule.ScheduleAutoHeading3",
        "p.ScheduleAutoHeading4 => p.Normal-Schedule.ScheduleAutoHeading4",
        "p.ScheduleAutoHeading5 => p.Normal-Schedule.ScheduleAutoHeading5",
        "p.ScheduleDefinition => p.Normal.ScheduleDefinition",
        "p.ScheduleHeading1 => p.Normal.ScheduleHeading1",
        "p.ScheduleHeading2 => p.Normal.ScheduleHeading2",
        "p.ScheduleHeading3 => p.Normal.ScheduleHeading3",
        "p.ScheduleHeading4 => p.Normal.ScheduleHeading4",
        "p.ScheduleHeading5 => p.Normal.ScheduleHeading5",
        "p.ScheduleHeadingAuto => p.Normal-Schedule.ScheduleHeadingAuto",
        "p.ScheduleParagraph => p.Normal.ScheduleParagraph",
        "p.ScheduleParagraphSub => p.Normal.ScheduleParagraphSub",
        "p.ScheduleParagraphSub-Sub => p.Normal.ScheduleParagraphSub-Sub",
        "p.SchedulePenalty => p.Penalty.SchedulePenalty",
        "p.ScheduleSection => p.Normal.ScheduleSection",
        "p.ScheduleSectionSub => p.Normal.ScheduleSectionSub",
        "p.ShoulderReference => p.ShoulderReference",
        "p.SideNote => p.Normal.SideNote",
        "p.TOC1 => p.TOC1",
        "p.TOC2 => p.TOC2",
        "p.TOC3 => p.TOC3",
        "p.TOC4 => p.TOC4",
        "p.TOC5 => p.TOC5",
        "p.TOC6 => p.TOC6",
        "p.TOC7 => p.TOC7",
        "p.TOC8 => p.TOC2.TOC8",
        "p.TOC9 => p.Normal.TOC9",
        "p.AmendHeading1s => p.Normal.AmendHeading1s",
        "p.EndnoteText => p.Normal.EndnoteText",
        "p.AmendHeading6 => p.Normal.AmendHeading6",
        "p.Stars => p.BodySection.Stars",
        "p.DraftingNotes => p.DraftingNotes",
        "p.EndnoteBody => p.EndnoteBody",
        "p.EndnoteSection => p.EndnoteSection",
        "p.Lines => p.Normal.Lines",
        "p.ScheduleFormNo => p.ScheduleNo.ScheduleFormNo",
        "p.ScheduleNo => p.Heading-PART.ScheduleNo",
        "p.ScheduleTitle => p.Heading-DIVISION.ScheduleTitle",
        "p.Heading-ENDNOTES => p.EndnoteText.Heading-ENDNOTES",
        "p.ActTitleTable1 => p.ActTitleTable1",
        "p.Preamble => p.Preamble",
        "p.StatRuleTitleTable1 => p.ActTitleTable1.StatRuleTitleTable1",
        "p.DefinitionSchedule => p.Defintion.DefinitionSchedule",
        "p.DraftTest => p.Normal.DraftTest",
        "p.MacroText => p.MacroText",
        "p.SchedulePenaly => p.Penalty.SchedulePenaly",
        "p.ByAuthority => p.Normal-Draft.ByAuthority",
        "p.Caption => p.Normal.Caption",
        "p.SRT1Autotext1 => p.Normal.SRT1Autotext1",
        "p.Reprint-AutoText => p.Normal.Reprint-AutoText",
        "p.SRT1Autotext3 => p.Normal.SRT1Autotext3",
        "p.TOAAutotext => p.SRT1Autotext3.TOAAutotext",
        "p.ReprintIndexLine1 => p.ReprintIndexLine.ReprintIndexLine1",
        "p.ReprintIndexLine => p.Normal.ReprintIndexLine",
        "p.ReprintIndexHeading => p.Normal.ReprintIndexHeading",
        "p.ReprintIndexSubject => p.Normal.ReprintIndexSubject",
        "p.ReprintIndexsubtopic => p.ReprintIndexSubject.ReprintIndexsubtopic",
        "p.ReprintIndexLine2 => p.ReprintIndexLine.ReprintIndexLine2",
        "p.n => p.Heading-ENDNOTES.n",
        "p.TOAHeading => p.Normal.TOAHeading",
        "p.AmendDefinition1 => p.AmendDefinition1",
        "p.AmendDefinition2 => p.AmendDefinition2",
        "p.AmendDefinition3 => p.AmendDefinition3",
        "p.AmendDefinition4 => p.AmendDefinition4",
        "p.AmendDefinition5 => p.AmendDefinition5",
        "p.AmendPenalty1 => p.Penalty.AmendPenalty1",
        "p.AmendPenalty2 => p.Penalty.AmendPenalty2",
        "p.AmendPenalty3 => p.Penalty.AmendPenalty3",
        "p.AmendPenalty4 => p.Penalty.AmendPenalty4",
        "p.AmendPenalty5 => p.Penalty.AmendPenalty5",
        "p.DraftDefinition1 => p.DraftDefinition1",
        "p.DraftDefinition2 => p.DraftDefinition2",
        "p.DraftDefinition3 => p.DraftDefinition3",
        "p.DraftDefinition4 => p.DraftDefinition4",
        "p.DraftDefinition5 => p.DraftDefinition5",
        "p.DraftPenalty1 => p.Penalty.DraftPenalty1",
        "p.DraftPenalty2 => p.Penalty.DraftPenalty2",
        "p.DraftPenalty3 => p.Penalty.DraftPenalty3",
        "p.DraftPenalty4 => p.Penalty.DraftPenalty4",
        "p.DraftPenalty5 => p.Penalty.DraftPenalty5",
        "p.ScheduleDefinition1 => p.ScheduleDefinition1",
        "p.ScheduleDefinition2 => p.ScheduleDefinition2",
        "p.ScheduleDefinition3 => p.ScheduleDefinition3",
        "p.ScheduleDefinition4 => p.ScheduleDefinition4",
        "p.ScheduleDefinition5 => p.ScheduleDefinition5",
        "p.SchedulePenalty1 => p.SchedulePenalty.SchedulePenalty1",
        "p.SchedulePenalty2 => p.SchedulePenalty.SchedulePenalty2",
        "p.SchedulePenalty3 => p.SchedulePenalty.SchedulePenalty3",
        "p.SchedulePenalty4 => p.SchedulePenalty.SchedulePenalty4",
        "p.SchedulePenalty5 => p.SchedulePenalty.SchedulePenalty5",
        "p.Title => p.Normal.Title",
        "p.BlockText => p.Normal.BlockText",
        "p.BodyTextIndent => p.Normal.BodyTextIndent",
        "p.DocumentMap => p.Normal.DocumentMap",
        "p.AmndChptr => p.Normal.AmndChptr",
        "p.ChapterHeading => p.Normal.ChapterHeading",
        "p.GovernorAssent => p.Normal.GovernorAssent",
        "p.PART => p.Normal.PART",
        "p.Schedule-Division0 => p.Normal.Schedule-Division0",
        "p.Schedule-Part0 => p.Normal.Schedule-Part0",
        "p.BodyText => p.Normal.BodyText",
        "p.BodyText2 => p.Normal.BodyText2",
        "p.BodyText3 => p.Normal.BodyText3",
        "p.BodyTextFirstIndent => p.BodyText.BodyTextFirstIndent",
        "p.BodyTextFirstIndent2 => p.BodyTextIndent.BodyTextFirstIndent2",
        "p.BodyTextIndent2 => p.Normal.BodyTextIndent2",
        "p.BodyTextIndent3 => p.Normal.BodyTextIndent3",
        "p.Closing => p.Normal.Closing",
        "p.CommentText => p.Normal.CommentText",
        "p.Date => p.Normal.Date",
        "p.E-mailSignature => p.Normal.E-mailSignature",
        "p.EnvelopeAddress => p.Normal.EnvelopeAddress",
        "p.EnvelopeReturn => p.Normal.EnvelopeReturn",
        "p.FootnoteText => p.Normal.FootnoteText",
        "p.HTMLAddress => p.Normal.HTMLAddress",
        "p.HTMLPreformatted => p.Normal.HTMLPreformatted",
        "p.Index1 => p.Normal.Index1",
        "p.Index2 => p.Normal.Index2",
        "p.Index3 => p.Normal.Index3",
        "p.Index4 => p.Normal.Index4",
        "p.Index5 => p.Normal.Index5",
        "p.Index6 => p.Normal.Index6",
        "p.Index7 => p.Normal.Index7",
        "p.Index8 => p.Normal.Index8",
        "p.Index9 => p.Normal.Index9",
        "p.IndexHeading => p.Normal.IndexHeading",
        "p.List => p.Normal.List",
        "p.List2 => p.Normal.List2",
        "p.List3 => p.Normal.List3",
        "p.List4 => p.Normal.List4",
        "p.List5 => p.Normal.List5",
        "p.ListBullet => p.Normal.ListBullet",
        "p.ListBullet2 => p.Normal.ListBullet2",
        "p.ListBullet3 => p.Normal.ListBullet3",
        "p.ListBullet4 => p.Normal.ListBullet4",
        "p.ListBullet5 => p.Normal.ListBullet5",
        "p.ListContinue => p.Normal.ListContinue",
        "p.ListContinue2 => p.Normal.ListContinue2",
        "p.ListContinue3 => p.Normal.ListContinue3",
        "p.ListContinue4 => p.Normal.ListContinue4",
        "p.ListContinue5 => p.Normal.ListContinue5",
        "p.ListNumber => p.Normal.ListNumber",
        "p.ListNumber2 => p.Normal.ListNumber2",
        "p.ListNumber3 => p.Normal.ListNumber3",
        "p.ListNumber4 => p.Normal.ListNumber4",
        "p.ListNumber5 => p.Normal.ListNumber5",
        "p.MessageHeader => p.Normal.MessageHeader",
        "p.MyStyle1 => p.Normal.MyStyle1",
        "p.NormalWeb => p.Normal.NormalWeb",
        "p.NormalIndent => p.Normal.NormalIndent",
        "p.NoteHeading => p.Normal.NoteHeading",
        "p.PlainText => p.Normal.PlainText",
        "p.Salutation => p.Normal.Salutation",
        "p.AmndSectionEg => p.AmndSectionEg",
        "p.AmndSub-sectionEg => p.AmndSub-sectionEg",
        "p.DraftParaEg => p.DraftParaEg",
        "p.DraftSectionEg => p.DraftSectionEg",
        "p.DraftSub-sectionEg => p.DraftSub-sectionEg",
        "p.SchSectionEg => p.SchSectionEg",
        "p.SchSub-sectionEg => p.SchSub-sectionEg",
        "p.AmndParaNote => p.AmndParaNote",
        "p.AmndSectionNote => p.AmndSectionNote",
        "p.AmndSub-paraNote => p.AmndSub-paraNote",
        "p.AmndSub-sectionNote => p.AmndSub-sectionNote",
        "p.DraftParaNote => p.DraftParaNote",
        "p.DraftSectionNote => p.DraftSectionNote",
        "p.DraftSub-sectionNote => p.DraftSub-sectionNote",
        "p.SchParaNote => p.SchParaNote",
        "p.SchSectionNote => p.SchSectionNote",
        "p.SchSub-sectionNote => p.SchSub-sectionNote",
        "p.Paragraph => p.Normal.Paragraph",
        "p.BalloonText => p.Normal.BalloonText",
        "p.IndexSpacing => p.Normal.IndexSpacing",
        "p.BoldSubject => p.Normal.BoldSubject",
        "p.DraftSub-ParaNote => p.DraftSub-ParaNote",
        "p.ScheduleExtraRightIndent => p.ScheduleExtraRightIndent"
    ]
};

// request('http://www.google.com', function (error, response, body) {
// if (!error && response.statusCode == 200) {
// console.log(body) // Show the HTML for the Google homepage.
// }
// })


// request('http://google.com/doodle.png').pipe(fs.createWriteStream('doodle.png'))
//
// d.split('&').forEach( function(v, k) {
//   function(v) {
//     e = v.split('=');
//     f[decodeURIComponent(e[0])]=decodeURIComponent(e[1]);
//   })
// });

jobStorage = {};
job = [function formData() {
        var formData = {
            "__Click": "0",
            "Server_Name": "www.legislation.vic.gov.au",
            "ActView": "vwActsByLetterWebCatBooks",
            "StatutoryRuleView": "vwSRByLetterWebCatBooks",
            "ActViewSearch": "vwActsByLetter",
            "StatutoryRuleViewSearch": "vwSRByLetter",
            "ActViewSearchEffDate": "vwActsWithNoticesSearch",
            "StatutoryRuleViewSearchEffDate": "vwSRWithNoticesSearch",
            "viewAlias": "",
            "viewAliasName": "",
            "navfield": "",
            "navvalue": "",
            "DbReference": "Domino/Web_Notes/LDMS/PubLawToday.nsf",
            "%%Surrogate_NavChoice_txt": "1",
            "FieldSearch": "Acts",
            "searchvalue": "Crimes Act 1958"
        };

        request.post({
            url: 'http://www.legislation.vic.gov.au/Domino/Web_Notes/LDMS/PubLawToday.nsf/fmNavigation!OpenForm&Seq=1',
            formData: formData
        }, function optionalCallback(error, response, body) {
            if (error) {
                return console.error('POST failed:', error);
            }
            console.log('POST successful!  Server responded with:', body);
            nextStep(body);
        });
    },
    function() {
        request.get('http://www.legislation.vic.gov.au/Domino/Web_Notes/LDMS/PubLawToday.nsf/SearchResultsActs?SearchView&Query=Act', function optionalCallback(error, response, body) {
            if (error) {
                return console.error('GET failed:', error);
            }
            console.log('GET successful!  Server responded with:', body);
            if (!error && response.statusCode == 200) {
                // console.log(body) // Show the HTML for the Google homepage.
                nextStep(body);
            }
        });
    },
    // function abort() {
    // throw new error("abort");
    // },
    function(body) {
        var $ = cheerio.load(body);

        var title, release, rating;
        var newjson = {
            actNo: "",
            actName: "",
            actLink: ""
        };

        var actList = [];
        var actObj = (function() {
            function actObj(actNo, actName, actLink) {
                this.actNo = actNo;
                this.actName = actName;
                this.actLink = actLink;
            }
            return actObj;
        })();

        // We'll use the unique header class as a starting point.

        // body > table > tbody > tr:nth-child(2) > td:nth-child(5) > font > a
        $('tr').slice(1).filter(function() {

            // Let's store the data we filter into a variable so we can easily see what's going on.

            var row = $(this);
            var actNo = row.find('td:nth-child(3) > font > a').text();
            if (!actNo.length) return;
            var actName = row.find('td:nth-child(5) > font > a').text();
            var actLink = row.find('td:nth-child(5) > font > a').attr('href');

            actList.push(new actObj(actNo, actName, "http://www.legislation.vic.gov.au" + actLink.replace(/&Highlight=.*/, '')));
        });
        console.log("actList: " + JSON.stringify(actList));
        nextStep(actList);
    },
    /* <tr valign="top">
      <td align="center"><img src="/images/vwicnsr4.gif" border="0" height="12" width="12" alt="72%"></td>

      <td><font size="2" face="Arial"><script language="javascript">
getRowNum(document.forms[0].rowNum.value)
      </script></font></td>

      <td>
        <a href="/Domino/Web_Notes/LDMS/PubLawToday.nsf/e84a08860d8fa942ca25761700261a63/8e6449efecf607c5ca257e7d001a852b!OpenDocument&amp;Highlight=0,Act" target="Main"><font size="2" face="Arial">6231/1958</font></a>
      </td>

      <td></td>

      <td>
        <a href="/Domino/Web_Notes/LDMS/PubLawToday.nsf/e84a08860d8fa942ca25761700261a63/8e6449efecf607c5ca257e7d001a852b!OpenDocument&amp;Highlight=0,Act" target="Main"><font size="2" face="Arial">Crimes Act 1958</font></a>
      </td>
    </tr> */
    function(actList) {
        // actObj = actList.shift();
        actObj = _.find(actList, {
            actName: "Crimes Act 1958"
        });
        if (!actObj) {
            throw new Error("couldn't find act");
        }

        request.get(actObj.actLink, function optionalCallback(error, response, body) {
            if (error) {
                return console.error('GET failed:', error);
            }
            console.log('GET successful!  Server responded with:', body);
            if (!error && response.statusCode == 200) {
                // console.log(body); // Show the HTML for the Google homepage.
                nextStep(body);
            }
        });
    },
    jobTidy = function jobTidy(html, unknown) {
       var opts = {
          doctype: 'html5',
          hideComments: false, //  multi word options can use a hyphen or "camel case" 
          indent: true,
          wrap: 0
       };
       tidy(html, opts, function(error, html) {
          if (error) {
             return console.error('TIDY failed:', error);
          }
          nextStep(html, unknown);
       });
    },
    1 ? function empty(a) { nextStep(a); } : function processVersions(body) {
       var $ = cheerio.load(body);
       var $actName = $('input[name="title_txt"]');
       // "Crimes Act 1958"
       jobStorage.actName = $actName.length ? $actName.attr('value') : 'not found';
       jobStorage.actFileName = jobStorage.actName.replace(/[^A-Za-z0-9]+/g, '');

       var tmp;
       var ts = new TableScrape({
          selector: tmp = $('#webview > table'),
          dataFilter: function(data, column, row) {
             if (column === 0 && data.match(/[0-9]+\/[0-9]+\/[1-2][0-9][0-9][0-9]/)) {
                var t = moment(data, 'MM/DD/YYYY');
                return moment(t).format('YYYYMMDD');
             }
             return data;
          }
       });
       console.log(ts.data);
       console.log(ts.hrefs);
       console.log('actFileName: ' + jobStorage.actFileName, jobStorage.actName);
       fetchList = [];
       var revision, date;
       for (var i=2; i<ts.data.length; i++) {
          fetchList.push({
             url : 'http://www.legislation.vic.gov.au' + ts.hrefs[i][0],
             date: date = ts.data[i][0],
             revision: revision = ts.data[i][2],
             filename: ($actName.length ? $actName.attr('value') : 'not found')
             .replace(/[^A-Za-z0-9]+/g, '') + "-" + revision + "-" + date + ".docx"
          });
       }
       console.log(fetchList);

       Promise.map(fetchList, function(o) {
          console.log("Checking " + o.url);
          return curl(o.url).then(function(body) {
             var $ = cheerio.load(body);
             var $a = $('#fileDisplay a[href*=".doc"]');
             if (!$a || !$a.length) {
                console.log("Couldn't find docUrl in: " + body);
                return null;
             }
             var docUrl = "http://www.legislation.vic.gov.au" + $a.attr('href');
             if (docUrl === 'undefined' || docUrl === undefined) {
                console.log("undefined docUrl in: " + body);
             }
             console.log("Found docUrl: " + docUrl);
             o.docUrl = docUrl;
             return o;
          })
          .then(function(o) {
             url = o.docUrl; filename = o.filename;
             var urlExt = url.split('.').slice(-1)[0];
             filename = filename.split('.').slice(0, -1).join('.') + "." + urlExt;
             console.log("Downloading " + url + " as " + filename);

             var f = fs.createWriteStream(filename);
             f.on('finish', function() {
                return o;
             });
             request(url).pipe(f);
          });
       }, {concurrency: 1})
       .then(function(fsresult) {
          console.log("Done");
          return setImmediate(nextStep);
       });
    },
    function findDocx(body) {
        // #fileDisplay > p > font > table > tbody > tr > td:nth-child(1) > a
        var $ = cheerio.load(body);
        // var docUrl = "http://www.legislation.vic.gov.au" + $('#fileDisplay > p > font > table > tr > td:nth-child(1) > a').attr('href');
        var docUrl = "http://www.legislation.vic.gov.au" + $('#rtEntry2 + #fileDisplay a').attr('href');
        console.log(docUrl);
        nextStep(docUrl);
    },
    function downloadFile(url, filename) {
        if (filename == null) {
            // /domino/Web_Notes/LDMS/LTObject_Store/ltobjst9.nsf/DDE300B846EED9C7CA257616000A3571/12D6EFFFCCDF67BCCA257E7D001A8CC4/$FILE/58-6231a249G.docx
            filename = url.split('/').slice(-1)[0];
        }

        var f = fs.createWriteStream(filename);
        f.on('finish', function() {
            nextStep(filename, filename.split('.').slice(0, -1).join('.') + ".html");
        });
        request(url).pipe(f);
    },
    function cheat() {
       nextStep('CrimesAct1958-173-20040101.docx', 'CrimesAct1958-173-20040101.html');
    },
    // function abort() { throw new error("abort"); },
    function convertDocx(src, dst) {
        mammoth.convertToHtml({
                path: src
               }, mammothOptions).then(function(result) {
                  var html = ""
                  + '<!DOCTYPE html>'
                  + '<html>'
                  + '<head>'
                  + '  <link rel="stylesheet" type="text/css" href="http://192.168.1.35/docx/sorword.css">'
                  // + '  <script type="text/javascript" src="http://nt4.com/js/dev"></script>'
                  // + '  <script type="text/javascript" src="http://192.168.1.5/docx/soword.js">'
                  // + '</script>'
                  + '  <meta charset="utf-8">'
                  + '  <title></title>'
                  + '</head>'
                  + '<body>'
                  + result.value;
                  var tidyOptions = {
                     doctype: 'html5',
                     hideComments: false, //  multi word options can use a hyphen or "camel case" 
                     indent: false,
                     wrap: 0
                  }
                  if (!"no-tidy") {
                     fs.writeFile(dst, html, function(err) {
                        if(err) {
                           return console.log(err);
                        }
                        console.log("The file was saved!");
                        nextStep(dst);
                     });
                  } else {
                     tidy(html.replace(/\t/g, '<!-- tab -->'), tidyOptions, function(error, html) {
                        if (error) {
                           return console.error('TIDY failed:', error);
                        }
                        console.log('TIDY successful!');
                        fs.writeFile(dst, html.replace(/<!-- tab -->/g, "\t"), function(err) {
                           if(err) {
                              return console.log(err);
                           }
                           console.log("The file was saved!");
                           nextStep(dst);
                        }); 
                     });
                  }
            })
            .done();
        // .catch(function(err) { 
        // console.log("mammoth promise caught: " + err);
        // });
    },
    function callSoword(fn) {
       soword(fn, function(err, data) {
          if (err) {
             throw Error(err);
             return;
          }
          nextStep(data, fn);
       });
    },
    // jobTidy,
    function removeBlankLines(data, fn) {
       nextStep(data.replace(/\n\n+/g, '\n'), fn);
    },
    function write(data, fn) {
       // fn = "soword.html";
       fs.writeFile(fn, data, function(err) {
          if(err) {
             return console.log(err);
          }
          console.log("The file was saved!");
          nextStep(fn);
       }); 

    },
];

function nextStep() {
    if (job.length) {
        // console.log("(job " + job.length + ")");
        var fn = job.shift();
        console.log("" + fn.name + " - " + job.length + "");
        fn.apply(null, arguments);
    }
}

// while (job.length > 1) {
// job.shift();
// }
// nextStep('58-6231a249G.docx', '58-6231a249G.html');
nextStep();

// 
classIndent = {
        "AmndSectionNote": 8,
        "Heading-ENDNOTES": 8,
        "Lines": 8,
        "MsoDate": 8,
        "MsoEndnoteText": 8,
        "MsoNormal": 8,
        "Normal-Draft": 8,
        "Normal-Schedule": 8,
        "NotesBody": 8,
        "Reprint-AutoText": 8,
        "ScheduleNo": 8,
        "ScheduleTitle": 8,
        "Heading-PART": 20,
        "Heading-DIVISION": 30,
        "Heading-SUBDIVISION": 40,
        "ScheduleHeading2": 50,
        "DraftHeading1": 65,
        "Stars": 65,
        "DraftSectionNote": 93,
        "BulletDraftSub-section": 93,
        "ScheduleHeading3": 93,
        "BodySection": 99,
        "BodySectionSub": 99,
        "DraftHeading2": 99,
        "DraftSub-sectionEg": 99,
        "DraftSub-sectionNote": 99,
        "BulletSchParagraph": 129,
        "AmndSub-sectionNote": 131,
        "AmendHeading1": 133,
        "BodyParagraph": 133,
        "Defintion": 133,
        "DraftDefinition2": 133,
        "DraftHeading3": 133,
        "DraftParaEg": 133,
        "DraftParaNote": 133,
        "AmendHeading2": 167,
        "AmendHeading3": 167,
        "AmendPenalty1": 167,
        "BodyParagraphSub": 167,
        "DraftHeading4": 167,
        "DraftPenalty2": 167,
        "Penalty": 167,
        "DraftHeading5": 201,
        "AmendHeading4": 235,
        "AmendHeading5": 235,
    }
    // d = '__Click=0&Server_Name=www.legislation.vic.gov.au&ActView=vwActsByLetterWebCatBooks&StatutoryRuleView=vwSRByLetterWebCatBooks&ActViewSearch=vwActsByLetter&StatutoryRuleViewSearch=vwSRByLetter&ActViewSearchEffDate=vwActsWithNoticesSearch&StatutoryRuleViewSearchEffDate=vwSRWithNoticesSearch&viewAlias=&viewAliasName=&navfield=&navvalue=&DbReference=Domino%2FWeb_Notes%2FLDMS%2FPubLawToday.nsf&%25%25Surrogate_NavChoice_txt=1&FieldSearch=Acts&searchvalue=Crimes+Act+1958'

// exit(0);
// 
// curl 'http://www.legislation.vic.gov.au/Domino/Web_Notes/LDMS/PubLawToday.nsf/fmNavigation!OpenForm&Seq=1' \
// 	-H 'Host: www.legislation.vic.gov.au' \
// 	-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:39.0) Gecko/20100101 Firefox/39.0' \
// 	-H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' \
// 	-H 'Accept-Language: en-US,en;q=0.5' \
// 	--compressed \
// 	-H 'DNT: 1' \
// 	-H 'Referer: http://www.legislation.vic.gov.au/Domino/Web_Notes/LDMS/PubLawToday.nsf/fmNavigation!OpenForm' \
//    --data '__Click=0&Server_Name=www.legislation.vic.gov.au&ActView=vwActsByLetterWebCatBooks&StatutoryRuleView=vwSRByLetterWebCatBooks&ActViewSearch=vwActsByLetter&StatutoryRuleViewSearch=vwSRByLetter&ActViewSearchEffDate=vwActsWithNoticesSearch&StatutoryRuleViewSearchEffDate=vwSRWithNoticesSearch&viewAlias=&viewAliasName=&navfield=&navvalue=&DbReference=Domino%2FWeb_Notes%2FLDMS%2FPubLawToday.nsf&%25%25Surrogate_NavChoice_txt=1&FieldSearch=Acts&searchvalue=Crimes+Act+1958' \
//    ;
// 
// curl 'http://www.legislation.vic.gov.au/Domino/Web_Notes/LDMS/PubLawToday.nsf/SearchResultsActs?SearchView&Query=Act' \
// 	-H 'Host: www.legislation.vic.gov.au' \
// 	-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:39.0) Gecko/20100101 Firefox/39.0' \
// 	-H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' \
// 	-H 'Accept-Language: en-US,en;q=0.5' \
// 	--compressed \
// 	-H 'DNT: 1' \
// 	-H 'Referer: http://www.legislation.vic.gov.au/Domino/Web_Notes/LDMS/PubLawToday.nsf/fmNavigation!OpenForm&Seq=1' \
// 	-H 'Connection: keep-alive' \
//    -o 'search_results.html' \
//    ;
// 
// 
// curl 'http://www.legislation.vic.gov.au/Domino/Web_Notes/LDMS/PubLawToday.nsf/e84a08860d8fa942ca25761700261a63/8e6449efecf607c5ca257e7d001a852b!OpenDocument&Highlight=0,Act' \
// 	-H 'Host: www.legislation.vic.gov.au' \
// 	-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:39.0) Gecko/20100101 Firefox/39.0' \
// 	-H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' \
// 	-H 'Accept-Language: en-US,en;q=0.5' \
// 	--compressed \
// 	-H 'DNT: 1' \
// 	-H 'Referer: http://www.legislation.vic.gov.au/Domino/Web_Notes/LDMS/PubLawToday.nsf/fmNavigation!OpenForm&Seq=1' \
// 	-H 'Connection: keep-alive' \
//    -o 'versions.CrimesAct1958.html' \
//    ;
// 
// curl 'http://www.legislation.vic.gov.au/Domino/Web_Notes/LDMS/PubLawToday.nsf/95c43dd4eac71a68ca256dde00056e7b/8e6449efecf607c5ca257e7d001a852b!OpenDocument' \
// 	-H 'Host: www.legislation.vic.gov.au' \
// 	-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:39.0) Gecko/20100101 Firefox/39.0' \
// 	-H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' \
// 	-H 'Accept-Language: en-US,en;q=0.5' \
// 	--compressed \
// 	-H 'DNT: 1' \
// 	-H 'Referer: http://www.legislation.vic.gov.au/Domino/Web_Notes/LDMS/PubLawToday.nsf/fmNavigation!OpenForm&Seq=1' \
// 	-H 'Connection: keep-alive' \
//    -o 'CrimesAct1958.html' \
//    ;
// 
// curl 'http://www.legislation.vic.gov.au/domino/Web_Notes/LDMS/LTObject_Store/ltobjst9.nsf/DDE300B846EED9C7CA257616000A3571/12D6EFFFCCDF67BCCA257E7D001A8CC4/$FILE/58-6231a249G.docx' \
// 	-H 'Host: www.legislation.vic.gov.au' \
// 	-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:39.0) Gecko/20100101 Firefox/39.0' \
// 	-H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' \
// 	-H 'Accept-Language: en-US,en;q=0.5' \
// 	--compressed \
// 	-H 'DNT: 1' \
// 	-H 'Referer: http://www.legislation.vic.gov.au/Domino/Web_Notes/LDMS/PubLawToday.nsf/fmNavigation!OpenForm&Seq=1' \
// 	-H 'Connection: keep-alive' \
//    -o 'CrimesAct1958.docx' \
//    ;
// 
// vim: set ts=3 tw=0 sw=3 et:
//

function determineOffsets() {
        Math.mode = function() {
            var ary, i, max, mode, str;
            ary = Array.prototype.slice.call(arguments);
            max = 0;
            mode = [];
            str = ary.sort();
            str = "~" + str.join('~~') + "~"
            str.replace(/(~\-?\d+~)\1*/g, function(a, b) {
                var m = a.length / b.length;
                if (max <= m) {
                    if (max < m) {
                        mode = [];
                        max = m;
                    }
                    mode.push(+b.replace(/~/g, ""));
                }
            });
            return mode;
        }

        offsetArray = [];
        offsetList = {};
        $('body > div > p').filter(function() {
            if (offsetList[this.className] == null) {
                offsetList[this.className] = [];
            }
            offsetList[this.className].push(this.offsetLeft)
            offsetArray.push(this.className);
        });

        offsetMode = {};
        for (className in offsetList) {
            offsetMode[className] = Math.mode.apply(null, offsetList[className])[0];
        };

        for (var i = 0, len = offsetArray.length; i < len; i++) {
            console.log("e(" + offsetMode[offsetArray[i]] + "," + offsetArray[i] + ");");
        }


    }
    // vim: set ts=3 sts=3 sw=3 fdm=manual et:
