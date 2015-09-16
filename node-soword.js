#!/usr/bin/env node

var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');
var mammoth = require("mammoth");
var tidy = require('htmltidy').tidy;
var _ = require('lodash');
var parse = require('cheerio/lib/parse');
var utils = require('cheerio/lib/utils');
var updateDOM = parse.update;
var domEach = utils.domEach;
var cloneDom = utils.cloneDom;
var isHtml = utils.isHtml;
var slice = Array.prototype.slice;

module.exports = (function() {
    var isHtml = function(str) {
        // Faster than running regex, if str starts with `<` and ends with `>`, assume it's HTML
        if (str.charAt(0) === '<' && str.charAt(str.length - 1) === '>' && str.length >= 3) return true;

        // Run the regex
        var match = quickExpr.exec(str);
        return !!(match && match[1]);
    };
    var _insert = function(concatenator) {
        return function() {
            var elems = slice.call(arguments),
                lastIdx = this.length - 1;

            return domEach(this, function(i, el) {
                var dom, domSrc;

                if (typeof elems[0] === 'function') {
                    domSrc = elems[0].call(el, i, $.html(el.children));
                } else {
                    domSrc = elems;
                }

                dom = this._makeDomArray(domSrc, i < lastIdx);
                concatenator(dom, el.children, el);
            });
        };
    };
    var uniqueSplice = function(array, spliceIdx, spliceCount, newElems, parent) {
        var spliceArgs = [spliceIdx, spliceCount].concat(newElems),
            prev = array[spliceIdx - 1] || null,
            next = array[spliceIdx] || null;
        var idx, len, prevIdx, node, oldParent;

        // Before splicing in new elements, ensure they do not already appear in the
        // current array.
        for (idx = 0, len = newElems.length; idx < len; ++idx) {
            node = newElems[idx];
            oldParent = node.parent || node.root;
            prevIdx = oldParent && oldParent.children.indexOf(newElems[idx]);

            if (oldParent && prevIdx > -1) {
                oldParent.children.splice(prevIdx, 1);
                if (parent === oldParent && spliceIdx > prevIdx) {
                    spliceArgs[0]--;
                }
            }

            node.root = null;
            node.parent = parent;

            if (node.prev) {
                node.prev.next = node.next || null;
            }

            if (node.next) {
                node.next.prev = node.prev || null;
            }

            node.prev = newElems[idx - 1] || prev;
            node.next = newElems[idx + 1] || next;
        }

        if (prev) {
            prev.next = newElems[0];
        }
        if (next) {
            next.prev = newElems[newElems.length - 1];
        }
        return array.splice.apply(array, spliceArgs);
    };


    var extendCheerio = function extendCheerio($) {
        _.extend($.prototype, {
            extend: function(o) {
                _.extend($.prototype, o);
            }
        });
        _.extend($, {
            extend: function(o) {
                _.extend($, o);
            },
            each: _.each
        });
        (function(jQuery) {
            jQuery.extend({
                mydir: function( elem, dir, until ) {
                    var matched = [],
                        truncate = until !== undefined;

                    while ( (elem = elem[ dir ]) && elem.nodeType !== 9 ) {
                        if ( elem.nodeType === 1 ) {
                            if ( truncate && !jQuery( elem ).is( until ) ) {
                                break;
                            }
                            matched.push( elem );
                        }
                    }
                    return matched;
                }
            });
            jQuery.each({
                nextWhile: function( elem, i, until ) {
                    return jQuery.mydir( elem, "nextSibling", until );
                },
                prevWhile: function( elem, i, until ) {
                    return jQuery.mydir( elem, "previousSibling", until );
                }
            }, function( name, fn ) {
                jQuery.fn[ name ] = function( until, selector ) {
                    var matched = jQuery.map( this, fn, until );

                    if ( name.slice( -5 ) !== "While" ) {
                        selector = until;
                    }

                    if ( selector && typeof selector === "string" ) {
                        matched = jQuery.filter( selector, matched );
                    }

                    if ( this.length > 1 ) {
                        // Remove duplicates
                        if ( !guaranteedUnique[ name ] ) {
                            jQuery.unique( matched );
                        }

                        // Reverse order for parents* and prev-derivatives
                        if ( rparentsprev.test( name ) ) {
                            matched.reverse();
                        }
                    }

                    return this.pushStack( matched );
                };
            });
        })($);

// vim: set ts=4 sts=132 sw=4 et: stackoverflow format
        // Generated by CoffeeScript 1.9.1
        _.extend($.prototype, {
            call: function(fn) {
                  return fn.apply(this, Array.prototype.slice.call(arguments, 1));
            },
            _replaceTag: function(currentElem, newTagObj, keepProps) {
                if (keepProps == null) {
                    keepProps = true;
                }
                $currentElem = $(currentElem);
                $newTag = $(newTagObj).clone();
                if (keepProps) {
                    $newTag.addClass($currentElem.attr('class'));
                    Array.prototype.slice.call(currentElem.attributes).forEach(function(v) {
                        $newTag.attr(v.name, v.value);
                    });
                }
                $currentElem.wrapAll($newTag);
                $currentElem.contents().unwrap();
                return this; // Fixed, per Frank van Luijn
            },
            replaceTag: function(newTagObj, keepProps) {
                return this.each(function() {
                    $._replaceTag(this, newTagObj, keepProps);
                });
            },
            _textNodes: function(e) {
                return $(e).contents().filter(function() {
                    return this.nodeType === 3 && this.nodeValue.trim().length;
                });
            },
            hasTextNodes: function() {
                return this.filter(function() {
                    return $._textNodes(this).length;
                });
            },
            textNodes: function() {
                return this._textNodes(this);
            },
            textNodesContain: function(s) {
                $._textNodes().filter(function() {
                    return this.nodeType === 3 && ~this.nodeValue.indexOf(s);
                });
            },
            wrapAll: function(wrapper) {
                if (this.length < 1) {
                    return this;
                }

                if (this.length < 2 && this.wrap) { // wrap not defined in npm version,
                    return this.wrap(wrapper); // and git version fails testing.
                }

                var elems = this;
                var section = $(wrapper);
                var marker = $('<div>');
                marker = marker.insertBefore(elems.first()); // in jQuery marker would remain current
                elems.each(function(k, v) { // in Cheerio, we update with the output.
                    section.append($(v));
                });
                section.insertBefore(marker);
                marker.remove();
                return section; // This is what jQuery would return, IIRC.
            },
            wrap: function(wrapper) {
                var wrapperFn = typeof wrapper === 'function' && wrapper,
                    lastIdx = this.length - 1;

                _.forEach(this, function(el, i) {
                    var parent = el.parent || el.root,
                        siblings = parent.children,
                        dom, index;

                    if (!parent) { //{{{
                        return;
                    }

                    if (wrapperFn) {
                        wrapper = wrapperFn.call(el, i);
                    }

                    // If trying to use an existing element as the wrapper,
                    // well .. surely that's just **append**
                    if (typeof wrapper === 'string' && !isHtml(wrapper)) {
                        wrapper = this.parents().last().find(wrapper).clone();
                    } //}}}

                    dom = this._makeDomArray(wrapper, i < lastIdx).slice(0, 1);
                    index = siblings.indexOf(el);

                    updateDOM([el], dom[0]);
                    // The previous operation removed the current element from the `siblings`
                    // array, so the `dom` array can be inserted without removing any
                    // additional elements.

                    // fn(array: Array, spliceIdx: number, spliceCount: number, newElems: [dom], parent: node)
                    uniqueSplice(siblings, index, 0, dom, parent);
                }, this);

                return this;
            },
        });
    }

    /*
    _.map($ee.textNodes().filter(function() { return ~this.nodeValue.indexOf("Crimes Act"); }), function(e) { return e.nodeValue }).join("\n")
    */

    /*
    $.extend({
        replaceTag: function (currentElem, newTagObj, keepProps) {
              keepProps = keepProps === undefined ? true : false;
            var $currentElem = $(currentElem), $newTag = $(newTagObj).clone();
            if (keepProps) {//{{{
                newTag = $newTag[0];
                newTag.className = currentElem.className;
                    Array.prototype.slice.call(currentElem.attributes).forEach(function(v) {
                        $newTag.attr(v.name, v.value);
                    }); // revised
            }//}}}
            $currentElem.wrapAll($newTag);
            $currentElem.contents().unwrap();
            // return node; (Error spotted by Frank van Luijn)
              return this; // check SO article
        }
    });

    $.fn.extend({
        replaceTag: function (newTagObj, keepProps) {
            return this.each(function() {
                jQuery.replaceTag(this, newTagObj, keepProps);
            });
        }
    });
    */
    /*!
     * domready (c) Dustin Diaz 2014 - License MIT
     */


    if ("test") {
        $ = cheerio.load("<html><body><div><p><span>This <em>is <i>test</p><span>More <em>test");
        extendCheerio($);
        $('span').wrapAll('<section>');
        var passed = ($.html() === '<html><body><div><p><section><span>This <em>is <i>test</i></em></span><span>More <em>test</em></span></section></p></div></body></html>')
        console.log($.html() + "\n\n");
    }
    var domready = require('./domready');

    var getContentFromTag = getContentFromTag = function(tag, attribute, value, useHTML) {
        var i, obj, tags;
        tags = _.toArray($(tag));
        i = 0;
        while (i < tags.length) {
            obj = tags[i];
            var j, len, node, ref;

            ref = obj.childNodes;
            for (j = 0, len = ref.length; j < len; j++) {
                node = ref[j];
                if (node.nodeType === 3) {
                    // console.log(JSON.stringify(node.nodeValue));
                    if (~node.nodeValue.indexOf(String.fromCharCode(0x09))) {
                        // console.log("node.nodeType: " + node.nodeType);
                        // console.log("node.parentElement");
                        // console.log(JSON.stringify(_.functions(node)));
                        // console.log(JSON.stringify(_.allKeys(node.parent.nodeValue)));
                        // console.log('html(): ' + JSON.stringify(nodeParent.html()));
                        var nodeParent = $(node.parent);

                        nodeParent.html(nodeParent.html().replace(/(.*)\x09(.*)/g, "<span class=\"num\">$1</span><span class=\"rest\">$2</span>"));
                    }
                    break;
                }
            }

            i += 1;
        }
        return null;
    };

    /*
    $.extend($.expr[":"].pseudos, {
        dcontains: function(){
            return $(this).text() === "Foobar";
        }
    });
    */

    var adoptWhile = function($n, parent, children, iteratee) {
        if (iteratee == null) {
            iteratee = function($elem) { return $elem; };
        }
        $n.find(parent).each(function(k, v) {
            var $v = $(v);
            $v.next(children).nextUntil(':not('+children+')').addBack().call(iteratee).appendTo($v);
        });
    };

    var wrap = function wrap(selector, wrapIn, preselector) {
        preselector = preselector || '';
        // console.log(JSON.stringify([> _.functions <] ($('p:contains(Act)').first().contents().length )));
        console.log(arguments);
        var $group;
        // $group = $(preselector + ' ' + selector).first().nextUntil(selector).addBack();
        // $group = $(preselector + ' ' + selector).first().nextUntil(selector).addBack();
        // return;

        var count = 0;
        var lastMultiple = 1;
        // while ($group.length) {
        // if (!(++count % lastMultiple)) { console.log("Wrap #" + count); lastMultiple <<= 1; }
        // $group = $(preselector + ' ' + selector).first().nextUntil(selector).addBack();
        // }
        /// XXX: bug in cheerio, addBack() is returning **something** when it should return nothing, and thus length is always > 0
        while (($group = $(preselector + ' ' + selector)).length) {
            $group.first().nextUntil(selector).addBack().wrapAll(wrapIn);
            if (!(++count % lastMultiple)) {
                console.log("Wrap #" + count + ' group ' + $group.length);
                lastMultiple <<= 1;
            }
        }
        // while (($group = $(preselector + ' ' + selector).first().nextUntil(selector)).addBack().wrapAll(wrapIn).length) if (!(++count % lastMultiple)) { console.log("Wrap #" + count + ' group ' + $group.length); lastMultiple <<= 1; }
    }

    var status = function status(s) {
        console.log(s);
    }

    var w = function w() {
        //	<w:tab w:val="clear" w:pos="851" />
        //	<w:tab w:val="clear" w:pos="1361" />
        //	<w:tab w:val="clear" w:pos="1871" />
        //	<w:tab w:val="clear" w:pos="2381" />
        //	<w:tab w:val="clear" w:pos="2892" />
        //	<w:tab w:val="clear" w:pos="3402" />
        // 1 inch = 72 pt = 2.54 centimetres  1 cm = 28.3464567 points
        // $('p.Heading-DIVISION > em').parent().wrap('<crossheading>');

        status('SUBDIVISION numbering');
        $('p.Heading-SUBDIVISION').filter(function() {
            var $this = $(this);
            if (this.childNodes.length > 1 && this.childNodes[0].nodeType === 3) {
                $this.children().wrapAll($('<span>').addClass('rest'));
                $(this.childNodes[0]).wrapAll($('<span>').addClass('num'));
            }
        });


        // wrap('section', '<division>', 'body >');


        status("Wrapping PART");
        wrap('p.Heading-PART', '<part>', 'body > ');
        status("Wrapping DIVISION");
        wrap('p.Heading-DIVISION:contains(Division)', '<division>', 'part > ');
        // $('division > p:nth-child(1)').removeClass('Heading-DIVISION').addClass('p');
        status("Wrapping SUBDIVISION");
        wrap('p.Heading-SUBDIVISION', '<subdivision>', 'division > ');
        $('p.Heading-DIVISION').toggleClass('Heading-DIVISION').toggleClass('Heading-CROSSHEADING').wrap('<crossheading>');
        // $('subdivision > p:nth-child(1)').removeClass('Heading-DIVISION').addClass('p');
        $('division > p:nth-child(1)').addClass('Heading-DIVISION').removeClass('p');
        // wrap('p.DraftHeading1', '<section>', 'body >'); 
        status("Wrapping part > DraftHeading1");
        wrap('p.DraftHeading1', '<section>', 'part >');
        status("Wrapping division > DraftHeading1");
        wrap('p.DraftHeading1', '<section>', 'division >');
        status("Wrapping subdivision > DraftHeading1");
        wrap('p.DraftHeading1', '<section>', 'subdivision >');
        wrap('p.DraftHeading2', '<subsection>', 'section >');
        wrap('p.DraftHeading3', '<paragraph>', 'subsection >');
        wrap('p.DraftHeading4', '<subsubsection>', 'paragraph >');
        wrap('p.DraftHeading5', '<subsubsubsection>', 'subsubsection >');

        // Move crossheadings to same depth as sections
        $('crossheading').filter(function() {
            var $this = $(this);
            $this.parents('section').first().after($this);
        });

        // $('.DraftHeading3[data-indent-left="2.4cm"]') // should be heading2
        // $('.DraftHeading4[data-indent-left="3.3cm"]') // Should be heading3
        // $('.DraftHeading5[data-indent-left!="5.1cm"]') // should be heading4
        // $('.AmendHeading3[data-indent-left="4.2cm"]') // should be heading4
        // $('.AmendHeading4[data-indent-left="6cm"]') // should be heading6
        // $('.AmendHeading5[data-indent-left="6cm"]') // should be heading6
        $('p[data-indent-left]').filter(function() {
            $this = $(this);
            $this
                .css('margin-left', $this.attr('data-indent-left'))
                .css('text-indent', '-1cm');
        });


        // This system needs to be scrapped, we have stuff like this:
        /*
        <subsubsection>
            <p class="Normal DraftHeading3" data-indent-hanging="75pt">...
            <p class="BodySection">..
        </subsection>
            */
    };

    var processDocxAttributes = function processDocxAttributes($n) {

        $n.find('.Defintion').removeClass('Defintion').addClass('DraftDefinition2');
        adoptWhile($n, 'p.DraftDefinition2', 'p.DraftDefinition4', function() { return this.removeClass('DraftHeading4').addClass('DraftDefinition4').css('margin-left', '0.9cm'); });
        /*
         * $n.find('p.DraftDefinition2').each(function(k, v) {
         *     var $v = $(v);
         *     $v.next('p.DraftHeading4').nextUntil(':not(.DraftHeading4)').addBack().addClass('DraftDefinition4').appendTo($v);
         * });
         * $n.find('p.DraftDefinition2 > p.DraftHeading4').css('margin-left', '0.9cm');
         */

        $n.find('[id^=doc-cp]').parent().addClass('doc-cp'); // .removeClass('hidden');
        $n.find('[id^=doc-tp]').parent().addClass('doc-tp'); // .removeClass('hidden');

        $last = $n.find('p.doc-tp').last();
        $first = $n.find('p.doc-tp').first();
        $tp = $first.nextUntil($last).addBack().add($last).remove();

        $last = $n.find('p.doc-cp').last();
        $first = $n.find('p.doc-cp').first();
        $cp = $first.nextUntil($last).addBack().next();

        $first.nextUntil(':contains(Version incorp)').addBack().next()

        $n.find('span[data-size]').each(function(k, v) {
            var $v = $(v);
            $v.css('font-size', $v.attr('data-size') + 'px')
        });
        $n.find('[data-alignment]').each(function(k, v) {
            var $v = $(v);
            $v.css('text-align', $v.attr('data-alignment'))
        });
        $n.find('p.SideNote:contains(repealed)');
        $n.find('p.SideNote').each(function(k, v) {
            var $v = $(v);
            $v.html($v.html().replace(/(s+)\.?(?:&nbsp;| )([0-9])/gi, function(match, p1, p2) {
                return p1.toLowerCase() + p2;
            }));
        });
        $n.find('p[data-indent-left]').filter(function() {
            $this = $(this);
            $this
                .css('margin-left', $this.attr('data-indent-left'))
                .css('text-indent', '-1cm');
        });
        $n.find('.BodySection.Stars').html('* * * * *');
        return $n;
    };

    var soword = function(fn, callback) {
        var f = fs.readFile(fn, function(err, data) {
            var html = data.toString();
            // console.log(html.substr(0, 255));
            $ = cheerio.load(html);
            extendCheerio($);
            console.log($.html);
            status("Removing TOC");
            $('.TOC1, .TOC2, .TOC3, .TOC4, .TOC5, .TOC6, TOC7').remove();
            // $('p.SideNote, p.Stars').remove();
            status("Removing SUBDIVISION anchords");
            $('p.Heading-SUBDIVISION > a[id]').remove();

            status("Adjusting font-size to match data-size");
            $('span[data-size]').each(function(k, v) {
                var $v = $(v);
                $v.css('font-size', $v.attr('data-size') + 'px')
            });
            status("Adjusting text-align to match alignment");
            $('[data-alignment]').each(function(k, v) {
                var $v = $(v);
                $v.css('text-align', $v.attr('data-alignment'))
            });
            // $('p.SideNote:contains(repealed)');
            status("Removing non-breaking spaces from section names in sidenotes");
            $('p.SideNote:contains(repealed)').each(function(k, v) {
                var $v = $(v);
                $v.html($v.html().replace(/s\.&nbsp;/g, 's'))
            });
            status("Divining numbers from tabbed text");
            getContentFromTag("p");

            status("Wrapping");
            w();

            status("Passing to processDocxAttributes");
            processDocxAttributes($('body'));
            $('[data-size]').attr('data-size', null);
            $('[data-alignment]').attr('data-alignment', null);
            $('[data-indent-left]').attr('data-indent-left', null);
            $('[data-indent-hanging]').attr('data-indent-hanging', null);
            $('.FakeStyleForSize').removeClass('FakeStyleForSize');
            // console.log($.html());
            callback(null, $.html());
            status("Done");
        });
    };

    return soword;
})();

// vim: set ts=4 sts=4 sw=4 et:
