import { M as MapMode, E as EditorSelection, j as EditorState, T as Transaction, P as Prec, b as StateEffect, F as Facet, e as codePointAt, i as countColumn, C as ChangeSet, k as findClusterBreak, h as findColumn, l as Text, f as CharCategory, c as combineConfig, S as StateField } from './index-04f03c08.js';

const C = "\u037c";
const COUNT = typeof Symbol == "undefined" ? "__" + C : Symbol.for(C);
const SET = typeof Symbol == "undefined" ? "__styleSet" + Math.floor(Math.random() * 1e8) : Symbol("styleSet");
const top = typeof globalThis != "undefined" ? globalThis : typeof window != "undefined" ? window : {};

// :: - Style modules encapsulate a set of CSS rules defined from
// JavaScript. Their definitions are only available in a given DOM
// root after it has been _mounted_ there with `StyleModule.mount`.
//
// Style modules should be created once and stored somewhere, as
// opposed to re-creating them every time you need them. The amount of
// CSS rules generated for a given DOM root is bounded by the amount
// of style modules that were used. So to avoid leaking rules, don't
// create these dynamically, but treat them as one-time allocations.
class StyleModule {
  // :: (Object<Style>, ?{finish: ?(string) → string})
  // Create a style module from the given spec.
  //
  // When `finish` is given, it is called on regular (non-`@`)
  // selectors (after `&` expansion) to compute the final selector.
  constructor(spec, options) {
    this.rules = [];
    let {finish} = options || {};

    function splitSelector(selector) {
      return /^@/.test(selector) ? [selector] : selector.split(/,\s*/)
    }

    function render(selectors, spec, target, isKeyframes) {
      let local = [], isAt = /^@(\w+)\b/.exec(selectors[0]), keyframes = isAt && isAt[1] == "keyframes";
      if (isAt && spec == null) return target.push(selectors[0] + ";")
      for (let prop in spec) {
        let value = spec[prop];
        if (/&/.test(prop)) {
          render(prop.split(/,\s*/).map(part => selectors.map(sel => part.replace(/&/, sel))).reduce((a, b) => a.concat(b)),
                 value, target);
        } else if (value && typeof value == "object") {
          if (!isAt) throw new RangeError("The value of a property (" + prop + ") should be a primitive value.")
          render(splitSelector(prop), value, local, keyframes);
        } else if (value != null) {
          local.push(prop.replace(/_.*/, "").replace(/[A-Z]/g, l => "-" + l.toLowerCase()) + ": " + value + ";");
        }
      }
      if (local.length || keyframes) {
        target.push((finish && !isAt && !isKeyframes ? selectors.map(finish) : selectors).join(", ") +
                    " {" + local.join(" ") + "}");
      }
    }

    for (let prop in spec) render(splitSelector(prop), spec[prop], this.rules);
  }

  // :: () → string
  // Returns a string containing the module's CSS rules.
  getRules() { return this.rules.join("\n") }

  // :: () → string
  // Generate a new unique CSS class name.
  static newName() {
    let id = top[COUNT] || 1;
    top[COUNT] = id + 1;
    return C + id.toString(36)
  }

  // :: (union<Document, ShadowRoot>, union<[StyleModule], StyleModule>)
  //
  // Mount the given set of modules in the given DOM root, which ensures
  // that the CSS rules defined by the module are available in that
  // context.
  //
  // Rules are only added to the document once per root.
  //
  // Rule order will follow the order of the modules, so that rules from
  // modules later in the array take precedence of those from earlier
  // modules. If you call this function multiple times for the same root
  // in a way that changes the order of already mounted modules, the old
  // order will be changed.
  static mount(root, modules) {
    (root[SET] || new StyleSet(root)).mount(Array.isArray(modules) ? modules : [modules]);
  }
}

let adoptedSet = null;

class StyleSet {
  constructor(root) {
    if (!root.head && root.adoptedStyleSheets && typeof CSSStyleSheet != "undefined") {
      if (adoptedSet) {
        root.adoptedStyleSheets = [adoptedSet.sheet].concat(root.adoptedStyleSheets);
        return root[SET] = adoptedSet
      }
      this.sheet = new CSSStyleSheet;
      root.adoptedStyleSheets = [this.sheet].concat(root.adoptedStyleSheets);
      adoptedSet = this;
    } else {
      this.styleTag = (root.ownerDocument || root).createElement("style");
      let target = root.head || root;
      target.insertBefore(this.styleTag, target.firstChild);
    }
    this.modules = [];
    root[SET] = this;
  }

  mount(modules) {
    let sheet = this.sheet;
    let pos = 0 /* Current rule offset */, j = 0; /* Index into this.modules */
    for (let i = 0; i < modules.length; i++) {
      let mod = modules[i], index = this.modules.indexOf(mod);
      if (index < j && index > -1) { // Ordering conflict
        this.modules.splice(index, 1);
        j--;
        index = -1;
      }
      if (index == -1) {
        this.modules.splice(j++, 0, mod);
        if (sheet) for (let k = 0; k < mod.rules.length; k++)
          sheet.insertRule(mod.rules[k], pos++);
      } else {
        while (j < index) pos += this.modules[j++].rules.length;
        pos += mod.rules.length;
        j++;
      }
    }

    if (!sheet) {
      let text = "";
      for (let i = 0; i < this.modules.length; i++)
        text += this.modules[i].getRules() + "\n";
      this.styleTag.textContent = text;
    }
  }
}

// Style::Object<union<Style,string>>
//
// A style is an object that, in the simple case, maps CSS property
// names to strings holding their values, as in `{color: "red",
// fontWeight: "bold"}`. The property names can be given in
// camel-case—the library will insert a dash before capital letters
// when converting them to CSS.
//
// If you include an underscore in a property name, it and everything
// after it will be removed from the output, which can be useful when
// providing a property multiple times, for browser compatibility
// reasons.
//
// A property in a style object can also be a sub-selector, which
// extends the current context to add a pseudo-selector or a child
// selector. Such a property should contain a `&` character, which
// will be replaced by the current selector. For example `{"&:before":
// {content: '"hi"'}}`. Sub-selectors and regular properties can
// freely be mixed in a given object. Any property containing a `&` is
// assumed to be a sub-selector.
//
// Finally, a property can specify an @-block to be wrapped around the
// styles defined inside the object that's the property's value. For
// example to create a media query you can do `{"@media screen and
// (min-width: 400px)": {...}}`.

/**
Each range is associated with a value, which must inherit from
this class.
*/
class RangeValue {
    /**
    Compare this value with another value. The default
    implementation compares by identity.
    */
    eq(other) { return this == other; }
    /**
    Create a [range](https://codemirror.net/6/docs/ref/#rangeset.Range) with this value.
    */
    range(from, to = from) { return new Range(from, to, this); }
}
RangeValue.prototype.startSide = RangeValue.prototype.endSide = 0;
RangeValue.prototype.point = false;
RangeValue.prototype.mapMode = MapMode.TrackDel;
/**
A range associates a value with a range of positions.
*/
class Range {
    /**
    @internal
    */
    constructor(
    /**
    The range's start position.
    */
    from, 
    /**
    Its end position.
    */
    to, 
    /**
    The value associated with this range.
    */
    value) {
        this.from = from;
        this.to = to;
        this.value = value;
    }
}
function cmpRange(a, b) {
    return a.from - b.from || a.value.startSide - b.value.startSide;
}
class Chunk {
    constructor(from, to, value, 
    // Chunks are marked with the largest point that occurs
    // in them (or -1 for no points), so that scans that are
    // only interested in points (such as the
    // heightmap-related logic) can skip range-only chunks.
    maxPoint) {
        this.from = from;
        this.to = to;
        this.value = value;
        this.maxPoint = maxPoint;
    }
    get length() { return this.to[this.to.length - 1]; }
    // Find the index of the given position and side. Use the ranges'
    // `from` pos when `end == false`, `to` when `end == true`.
    findIndex(pos, side, end, startAt = 0) {
        let arr = end ? this.to : this.from;
        for (let lo = startAt, hi = arr.length;;) {
            if (lo == hi)
                return lo;
            let mid = (lo + hi) >> 1;
            let diff = arr[mid] - pos || (end ? this.value[mid].endSide : this.value[mid].startSide) - side;
            if (mid == lo)
                return diff >= 0 ? lo : hi;
            if (diff >= 0)
                hi = mid;
            else
                lo = mid + 1;
        }
    }
    between(offset, from, to, f) {
        for (let i = this.findIndex(from, -1000000000 /* Far */, true), e = this.findIndex(to, 1000000000 /* Far */, false, i); i < e; i++)
            if (f(this.from[i] + offset, this.to[i] + offset, this.value[i]) === false)
                return false;
    }
    map(offset, changes) {
        let value = [], from = [], to = [], newPos = -1, maxPoint = -1;
        for (let i = 0; i < this.value.length; i++) {
            let val = this.value[i], curFrom = this.from[i] + offset, curTo = this.to[i] + offset, newFrom, newTo;
            if (curFrom == curTo) {
                let mapped = changes.mapPos(curFrom, val.startSide, val.mapMode);
                if (mapped == null)
                    continue;
                newFrom = newTo = mapped;
                if (val.startSide != val.endSide) {
                    newTo = changes.mapPos(curFrom, val.endSide);
                    if (newTo < newFrom)
                        continue;
                }
            }
            else {
                newFrom = changes.mapPos(curFrom, val.startSide);
                newTo = changes.mapPos(curTo, val.endSide);
                if (newFrom > newTo || newFrom == newTo && val.startSide > 0 && val.endSide <= 0)
                    continue;
            }
            if ((newTo - newFrom || val.endSide - val.startSide) < 0)
                continue;
            if (newPos < 0)
                newPos = newFrom;
            if (val.point)
                maxPoint = Math.max(maxPoint, newTo - newFrom);
            value.push(val);
            from.push(newFrom - newPos);
            to.push(newTo - newPos);
        }
        return { mapped: value.length ? new Chunk(from, to, value, maxPoint) : null, pos: newPos };
    }
}
/**
A range set stores a collection of [ranges](https://codemirror.net/6/docs/ref/#rangeset.Range) in a
way that makes them efficient to [map](https://codemirror.net/6/docs/ref/#rangeset.RangeSet.map) and
[update](https://codemirror.net/6/docs/ref/#rangeset.RangeSet.update). This is an immutable data
structure.
*/
class RangeSet {
    /**
    @internal
    */
    constructor(
    /**
    @internal
    */
    chunkPos, 
    /**
    @internal
    */
    chunk, 
    /**
    @internal
    */
    nextLayer = RangeSet.empty, 
    /**
    @internal
    */
    maxPoint) {
        this.chunkPos = chunkPos;
        this.chunk = chunk;
        this.nextLayer = nextLayer;
        this.maxPoint = maxPoint;
    }
    /**
    @internal
    */
    get length() {
        let last = this.chunk.length - 1;
        return last < 0 ? 0 : Math.max(this.chunkEnd(last), this.nextLayer.length);
    }
    /**
    The number of ranges in the set.
    */
    get size() {
        if (this.isEmpty)
            return 0;
        let size = this.nextLayer.size;
        for (let chunk of this.chunk)
            size += chunk.value.length;
        return size;
    }
    /**
    @internal
    */
    chunkEnd(index) {
        return this.chunkPos[index] + this.chunk[index].length;
    }
    /**
    Update the range set, optionally adding new ranges or filtering
    out existing ones.
    
    (The extra type parameter is just there as a kludge to work
    around TypeScript variance issues that prevented `RangeSet<X>`
    from being a subtype of `RangeSet<Y>` when `X` is a subtype of
    `Y`.)
    */
    update(updateSpec) {
        let { add = [], sort = false, filterFrom = 0, filterTo = this.length } = updateSpec;
        let filter = updateSpec.filter;
        if (add.length == 0 && !filter)
            return this;
        if (sort)
            add = add.slice().sort(cmpRange);
        if (this.isEmpty)
            return add.length ? RangeSet.of(add) : this;
        let cur = new LayerCursor(this, null, -1).goto(0), i = 0, spill = [];
        let builder = new RangeSetBuilder();
        while (cur.value || i < add.length) {
            if (i < add.length && (cur.from - add[i].from || cur.startSide - add[i].value.startSide) >= 0) {
                let range = add[i++];
                if (!builder.addInner(range.from, range.to, range.value))
                    spill.push(range);
            }
            else if (cur.rangeIndex == 1 && cur.chunkIndex < this.chunk.length &&
                (i == add.length || this.chunkEnd(cur.chunkIndex) < add[i].from) &&
                (!filter || filterFrom > this.chunkEnd(cur.chunkIndex) || filterTo < this.chunkPos[cur.chunkIndex]) &&
                builder.addChunk(this.chunkPos[cur.chunkIndex], this.chunk[cur.chunkIndex])) {
                cur.nextChunk();
            }
            else {
                if (!filter || filterFrom > cur.to || filterTo < cur.from || filter(cur.from, cur.to, cur.value)) {
                    if (!builder.addInner(cur.from, cur.to, cur.value))
                        spill.push(new Range(cur.from, cur.to, cur.value));
                }
                cur.next();
            }
        }
        return builder.finishInner(this.nextLayer.isEmpty && !spill.length ? RangeSet.empty
            : this.nextLayer.update({ add: spill, filter, filterFrom, filterTo }));
    }
    /**
    Map this range set through a set of changes, return the new set.
    */
    map(changes) {
        if (changes.empty || this.isEmpty)
            return this;
        let chunks = [], chunkPos = [], maxPoint = -1;
        for (let i = 0; i < this.chunk.length; i++) {
            let start = this.chunkPos[i], chunk = this.chunk[i];
            let touch = changes.touchesRange(start, start + chunk.length);
            if (touch === false) {
                maxPoint = Math.max(maxPoint, chunk.maxPoint);
                chunks.push(chunk);
                chunkPos.push(changes.mapPos(start));
            }
            else if (touch === true) {
                let { mapped, pos } = chunk.map(start, changes);
                if (mapped) {
                    maxPoint = Math.max(maxPoint, mapped.maxPoint);
                    chunks.push(mapped);
                    chunkPos.push(pos);
                }
            }
        }
        let next = this.nextLayer.map(changes);
        return chunks.length == 0 ? next : new RangeSet(chunkPos, chunks, next, maxPoint);
    }
    /**
    Iterate over the ranges that touch the region `from` to `to`,
    calling `f` for each. There is no guarantee that the ranges will
    be reported in any specific order. When the callback returns
    `false`, iteration stops.
    */
    between(from, to, f) {
        if (this.isEmpty)
            return;
        for (let i = 0; i < this.chunk.length; i++) {
            let start = this.chunkPos[i], chunk = this.chunk[i];
            if (to >= start && from <= start + chunk.length &&
                chunk.between(start, from - start, to - start, f) === false)
                return;
        }
        this.nextLayer.between(from, to, f);
    }
    /**
    Iterate over the ranges in this set, in order, including all
    ranges that end at or after `from`.
    */
    iter(from = 0) {
        return HeapCursor.from([this]).goto(from);
    }
    /**
    @internal
    */
    get isEmpty() { return this.nextLayer == this; }
    /**
    Iterate over the ranges in a collection of sets, in order,
    starting from `from`.
    */
    static iter(sets, from = 0) {
        return HeapCursor.from(sets).goto(from);
    }
    /**
    Iterate over two groups of sets, calling methods on `comparator`
    to notify it of possible differences.
    */
    static compare(oldSets, newSets, 
    /**
    This indicates how the underlying data changed between these
    ranges, and is needed to synchronize the iteration. `from` and
    `to` are coordinates in the _new_ space, after these changes.
    */
    textDiff, comparator, 
    /**
    Can be used to ignore all non-point ranges, and points below
    the given size. When -1, all ranges are compared.
    */
    minPointSize = -1) {
        let a = oldSets.filter(set => set.maxPoint > 0 || !set.isEmpty && set.maxPoint >= minPointSize);
        let b = newSets.filter(set => set.maxPoint > 0 || !set.isEmpty && set.maxPoint >= minPointSize);
        let sharedChunks = findSharedChunks(a, b, textDiff);
        let sideA = new SpanCursor(a, sharedChunks, minPointSize);
        let sideB = new SpanCursor(b, sharedChunks, minPointSize);
        textDiff.iterGaps((fromA, fromB, length) => compare(sideA, fromA, sideB, fromB, length, comparator));
        if (textDiff.empty && textDiff.length == 0)
            compare(sideA, 0, sideB, 0, 0, comparator);
    }
    /**
    Compare the contents of two groups of range sets, returning true
    if they are equivalent in the given range.
    */
    static eq(oldSets, newSets, from = 0, to) {
        if (to == null)
            to = 1000000000 /* Far */;
        let a = oldSets.filter(set => !set.isEmpty && newSets.indexOf(set) < 0);
        let b = newSets.filter(set => !set.isEmpty && oldSets.indexOf(set) < 0);
        if (a.length != b.length)
            return false;
        if (!a.length)
            return true;
        let sharedChunks = findSharedChunks(a, b);
        let sideA = new SpanCursor(a, sharedChunks, 0).goto(from), sideB = new SpanCursor(b, sharedChunks, 0).goto(from);
        for (;;) {
            if (sideA.to != sideB.to ||
                !sameValues(sideA.active, sideB.active) ||
                sideA.point && (!sideB.point || !sideA.point.eq(sideB.point)))
                return false;
            if (sideA.to > to)
                return true;
            sideA.next();
            sideB.next();
        }
    }
    /**
    Iterate over a group of range sets at the same time, notifying
    the iterator about the ranges covering every given piece of
    content. Returns the open count (see
    [`SpanIterator.span`](https://codemirror.net/6/docs/ref/#rangeset.SpanIterator.span)) at the end
    of the iteration.
    */
    static spans(sets, from, to, iterator, 
    /**
    When given and greater than -1, only points of at least this
    size are taken into account.
    */
    minPointSize = -1) {
        var _a;
        let cursor = new SpanCursor(sets, null, minPointSize, (_a = iterator.filterPoint) === null || _a === void 0 ? void 0 : _a.bind(iterator)).goto(from), pos = from;
        let open = cursor.openStart;
        for (;;) {
            let curTo = Math.min(cursor.to, to);
            if (cursor.point) {
                iterator.point(pos, curTo, cursor.point, cursor.activeForPoint(cursor.to), open);
                open = cursor.openEnd(curTo) + (cursor.to > curTo ? 1 : 0);
            }
            else if (curTo > pos) {
                iterator.span(pos, curTo, cursor.active, open);
                open = cursor.openEnd(curTo);
            }
            if (cursor.to > to)
                break;
            pos = cursor.to;
            cursor.next();
        }
        return open;
    }
    /**
    Create a range set for the given range or array of ranges. By
    default, this expects the ranges to be _sorted_ (by start
    position and, if two start at the same position,
    `value.startSide`). You can pass `true` as second argument to
    cause the method to sort them.
    */
    static of(ranges, sort = false) {
        let build = new RangeSetBuilder();
        for (let range of ranges instanceof Range ? [ranges] : sort ? lazySort(ranges) : ranges)
            build.add(range.from, range.to, range.value);
        return build.finish();
    }
}
/**
The empty set of ranges.
*/
RangeSet.empty = /*@__PURE__*/new RangeSet([], [], null, -1);
function lazySort(ranges) {
    if (ranges.length > 1)
        for (let prev = ranges[0], i = 1; i < ranges.length; i++) {
            let cur = ranges[i];
            if (cmpRange(prev, cur) > 0)
                return ranges.slice().sort(cmpRange);
            prev = cur;
        }
    return ranges;
}
RangeSet.empty.nextLayer = RangeSet.empty;
/**
A range set builder is a data structure that helps build up a
[range set](https://codemirror.net/6/docs/ref/#rangeset.RangeSet) directly, without first allocating
an array of [`Range`](https://codemirror.net/6/docs/ref/#rangeset.Range) objects.
*/
class RangeSetBuilder {
    /**
    Create an empty builder.
    */
    constructor() {
        this.chunks = [];
        this.chunkPos = [];
        this.chunkStart = -1;
        this.last = null;
        this.lastFrom = -1000000000 /* Far */;
        this.lastTo = -1000000000 /* Far */;
        this.from = [];
        this.to = [];
        this.value = [];
        this.maxPoint = -1;
        this.setMaxPoint = -1;
        this.nextLayer = null;
    }
    finishChunk(newArrays) {
        this.chunks.push(new Chunk(this.from, this.to, this.value, this.maxPoint));
        this.chunkPos.push(this.chunkStart);
        this.chunkStart = -1;
        this.setMaxPoint = Math.max(this.setMaxPoint, this.maxPoint);
        this.maxPoint = -1;
        if (newArrays) {
            this.from = [];
            this.to = [];
            this.value = [];
        }
    }
    /**
    Add a range. Ranges should be added in sorted (by `from` and
    `value.startSide`) order.
    */
    add(from, to, value) {
        if (!this.addInner(from, to, value))
            (this.nextLayer || (this.nextLayer = new RangeSetBuilder)).add(from, to, value);
    }
    /**
    @internal
    */
    addInner(from, to, value) {
        let diff = from - this.lastTo || value.startSide - this.last.endSide;
        if (diff <= 0 && (from - this.lastFrom || value.startSide - this.last.startSide) < 0)
            throw new Error("Ranges must be added sorted by `from` position and `startSide`");
        if (diff < 0)
            return false;
        if (this.from.length == 250 /* ChunkSize */)
            this.finishChunk(true);
        if (this.chunkStart < 0)
            this.chunkStart = from;
        this.from.push(from - this.chunkStart);
        this.to.push(to - this.chunkStart);
        this.last = value;
        this.lastFrom = from;
        this.lastTo = to;
        this.value.push(value);
        if (value.point)
            this.maxPoint = Math.max(this.maxPoint, to - from);
        return true;
    }
    /**
    @internal
    */
    addChunk(from, chunk) {
        if ((from - this.lastTo || chunk.value[0].startSide - this.last.endSide) < 0)
            return false;
        if (this.from.length)
            this.finishChunk(true);
        this.setMaxPoint = Math.max(this.setMaxPoint, chunk.maxPoint);
        this.chunks.push(chunk);
        this.chunkPos.push(from);
        let last = chunk.value.length - 1;
        this.last = chunk.value[last];
        this.lastFrom = chunk.from[last] + from;
        this.lastTo = chunk.to[last] + from;
        return true;
    }
    /**
    Finish the range set. Returns the new set. The builder can't be
    used anymore after this has been called.
    */
    finish() { return this.finishInner(RangeSet.empty); }
    /**
    @internal
    */
    finishInner(next) {
        if (this.from.length)
            this.finishChunk(false);
        if (this.chunks.length == 0)
            return next;
        let result = new RangeSet(this.chunkPos, this.chunks, this.nextLayer ? this.nextLayer.finishInner(next) : next, this.setMaxPoint);
        this.from = null; // Make sure further `add` calls produce errors
        return result;
    }
}
function findSharedChunks(a, b, textDiff) {
    let inA = new Map();
    for (let set of a)
        for (let i = 0; i < set.chunk.length; i++)
            if (set.chunk[i].maxPoint <= 0)
                inA.set(set.chunk[i], set.chunkPos[i]);
    let shared = new Set();
    for (let set of b)
        for (let i = 0; i < set.chunk.length; i++) {
            let known = inA.get(set.chunk[i]);
            if (known != null && (textDiff ? textDiff.mapPos(known) : known) == set.chunkPos[i] &&
                !(textDiff === null || textDiff === void 0 ? void 0 : textDiff.touchesRange(known, known + set.chunk[i].length)))
                shared.add(set.chunk[i]);
        }
    return shared;
}
class LayerCursor {
    constructor(layer, skip, minPoint, rank = 0) {
        this.layer = layer;
        this.skip = skip;
        this.minPoint = minPoint;
        this.rank = rank;
    }
    get startSide() { return this.value ? this.value.startSide : 0; }
    get endSide() { return this.value ? this.value.endSide : 0; }
    goto(pos, side = -1000000000 /* Far */) {
        this.chunkIndex = this.rangeIndex = 0;
        this.gotoInner(pos, side, false);
        return this;
    }
    gotoInner(pos, side, forward) {
        while (this.chunkIndex < this.layer.chunk.length) {
            let next = this.layer.chunk[this.chunkIndex];
            if (!(this.skip && this.skip.has(next) ||
                this.layer.chunkEnd(this.chunkIndex) < pos ||
                next.maxPoint < this.minPoint))
                break;
            this.chunkIndex++;
            forward = false;
        }
        if (this.chunkIndex < this.layer.chunk.length) {
            let rangeIndex = this.layer.chunk[this.chunkIndex].findIndex(pos - this.layer.chunkPos[this.chunkIndex], side, true);
            if (!forward || this.rangeIndex < rangeIndex)
                this.setRangeIndex(rangeIndex);
        }
        this.next();
    }
    forward(pos, side) {
        if ((this.to - pos || this.endSide - side) < 0)
            this.gotoInner(pos, side, true);
    }
    next() {
        for (;;) {
            if (this.chunkIndex == this.layer.chunk.length) {
                this.from = this.to = 1000000000 /* Far */;
                this.value = null;
                break;
            }
            else {
                let chunkPos = this.layer.chunkPos[this.chunkIndex], chunk = this.layer.chunk[this.chunkIndex];
                let from = chunkPos + chunk.from[this.rangeIndex];
                this.from = from;
                this.to = chunkPos + chunk.to[this.rangeIndex];
                this.value = chunk.value[this.rangeIndex];
                this.setRangeIndex(this.rangeIndex + 1);
                if (this.minPoint < 0 || this.value.point && this.to - this.from >= this.minPoint)
                    break;
            }
        }
    }
    setRangeIndex(index) {
        if (index == this.layer.chunk[this.chunkIndex].value.length) {
            this.chunkIndex++;
            if (this.skip) {
                while (this.chunkIndex < this.layer.chunk.length && this.skip.has(this.layer.chunk[this.chunkIndex]))
                    this.chunkIndex++;
            }
            this.rangeIndex = 0;
        }
        else {
            this.rangeIndex = index;
        }
    }
    nextChunk() {
        this.chunkIndex++;
        this.rangeIndex = 0;
        this.next();
    }
    compare(other) {
        return this.from - other.from || this.startSide - other.startSide || this.to - other.to || this.endSide - other.endSide;
    }
}
class HeapCursor {
    constructor(heap) {
        this.heap = heap;
    }
    static from(sets, skip = null, minPoint = -1) {
        let heap = [];
        for (let i = 0; i < sets.length; i++) {
            for (let cur = sets[i]; !cur.isEmpty; cur = cur.nextLayer) {
                if (cur.maxPoint >= minPoint)
                    heap.push(new LayerCursor(cur, skip, minPoint, i));
            }
        }
        return heap.length == 1 ? heap[0] : new HeapCursor(heap);
    }
    get startSide() { return this.value ? this.value.startSide : 0; }
    goto(pos, side = -1000000000 /* Far */) {
        for (let cur of this.heap)
            cur.goto(pos, side);
        for (let i = this.heap.length >> 1; i >= 0; i--)
            heapBubble(this.heap, i);
        this.next();
        return this;
    }
    forward(pos, side) {
        for (let cur of this.heap)
            cur.forward(pos, side);
        for (let i = this.heap.length >> 1; i >= 0; i--)
            heapBubble(this.heap, i);
        if ((this.to - pos || this.value.endSide - side) < 0)
            this.next();
    }
    next() {
        if (this.heap.length == 0) {
            this.from = this.to = 1000000000 /* Far */;
            this.value = null;
            this.rank = -1;
        }
        else {
            let top = this.heap[0];
            this.from = top.from;
            this.to = top.to;
            this.value = top.value;
            this.rank = top.rank;
            if (top.value)
                top.next();
            heapBubble(this.heap, 0);
        }
    }
}
function heapBubble(heap, index) {
    for (let cur = heap[index];;) {
        let childIndex = (index << 1) + 1;
        if (childIndex >= heap.length)
            break;
        let child = heap[childIndex];
        if (childIndex + 1 < heap.length && child.compare(heap[childIndex + 1]) >= 0) {
            child = heap[childIndex + 1];
            childIndex++;
        }
        if (cur.compare(child) < 0)
            break;
        heap[childIndex] = cur;
        heap[index] = child;
        index = childIndex;
    }
}
class SpanCursor {
    constructor(sets, skip, minPoint, filterPoint = () => true) {
        this.minPoint = minPoint;
        this.filterPoint = filterPoint;
        this.active = [];
        this.activeTo = [];
        this.activeRank = [];
        this.minActive = -1;
        // A currently active point range, if any
        this.point = null;
        this.pointFrom = 0;
        this.pointRank = 0;
        this.to = -1000000000 /* Far */;
        this.endSide = 0;
        this.openStart = -1;
        this.cursor = HeapCursor.from(sets, skip, minPoint);
    }
    goto(pos, side = -1000000000 /* Far */) {
        this.cursor.goto(pos, side);
        this.active.length = this.activeTo.length = this.activeRank.length = 0;
        this.minActive = -1;
        this.to = pos;
        this.endSide = side;
        this.openStart = -1;
        this.next();
        return this;
    }
    forward(pos, side) {
        while (this.minActive > -1 && (this.activeTo[this.minActive] - pos || this.active[this.minActive].endSide - side) < 0)
            this.removeActive(this.minActive);
        this.cursor.forward(pos, side);
    }
    removeActive(index) {
        remove(this.active, index);
        remove(this.activeTo, index);
        remove(this.activeRank, index);
        this.minActive = findMinIndex(this.active, this.activeTo);
    }
    addActive(trackOpen) {
        let i = 0, { value, to, rank } = this.cursor;
        while (i < this.activeRank.length && this.activeRank[i] <= rank)
            i++;
        insert(this.active, i, value);
        insert(this.activeTo, i, to);
        insert(this.activeRank, i, rank);
        if (trackOpen)
            insert(trackOpen, i, this.cursor.from);
        this.minActive = findMinIndex(this.active, this.activeTo);
    }
    // After calling this, if `this.point` != null, the next range is a
    // point. Otherwise, it's a regular range, covered by `this.active`.
    next() {
        let from = this.to, wasPoint = this.point;
        this.point = null;
        let trackOpen = this.openStart < 0 ? [] : null, trackExtra = 0;
        for (;;) {
            let a = this.minActive;
            if (a > -1 && (this.activeTo[a] - this.cursor.from || this.active[a].endSide - this.cursor.startSide) < 0) {
                if (this.activeTo[a] > from) {
                    this.to = this.activeTo[a];
                    this.endSide = this.active[a].endSide;
                    break;
                }
                this.removeActive(a);
                if (trackOpen)
                    remove(trackOpen, a);
            }
            else if (!this.cursor.value) {
                this.to = this.endSide = 1000000000 /* Far */;
                break;
            }
            else if (this.cursor.from > from) {
                this.to = this.cursor.from;
                this.endSide = this.cursor.startSide;
                break;
            }
            else {
                let nextVal = this.cursor.value;
                if (!nextVal.point) { // Opening a range
                    this.addActive(trackOpen);
                    this.cursor.next();
                }
                else if (wasPoint && this.cursor.to == this.to && this.cursor.from < this.cursor.to) {
                    // Ignore any non-empty points that end precisely at the end of the prev point
                    this.cursor.next();
                }
                else if (!this.filterPoint(this.cursor.from, this.cursor.to, this.cursor.value, this.cursor.rank)) {
                    this.cursor.next();
                }
                else { // New point
                    this.point = nextVal;
                    this.pointFrom = this.cursor.from;
                    this.pointRank = this.cursor.rank;
                    this.to = this.cursor.to;
                    this.endSide = nextVal.endSide;
                    if (this.cursor.from < from)
                        trackExtra = 1;
                    this.cursor.next();
                    if (this.to > from)
                        this.forward(this.to, this.endSide);
                    break;
                }
            }
        }
        if (trackOpen) {
            let openStart = 0;
            while (openStart < trackOpen.length && trackOpen[openStart] < from)
                openStart++;
            this.openStart = openStart + trackExtra;
        }
    }
    activeForPoint(to) {
        if (!this.active.length)
            return this.active;
        let active = [];
        for (let i = this.active.length - 1; i >= 0; i--) {
            if (this.activeRank[i] < this.pointRank)
                break;
            if (this.activeTo[i] > to || this.activeTo[i] == to && this.active[i].endSide >= this.point.endSide)
                active.push(this.active[i]);
        }
        return active.reverse();
    }
    openEnd(to) {
        let open = 0;
        for (let i = this.activeTo.length - 1; i >= 0 && this.activeTo[i] > to; i--)
            open++;
        return open;
    }
}
function compare(a, startA, b, startB, length, comparator) {
    a.goto(startA);
    b.goto(startB);
    let endB = startB + length;
    let pos = startB, dPos = startB - startA;
    for (;;) {
        let diff = (a.to + dPos) - b.to || a.endSide - b.endSide;
        let end = diff < 0 ? a.to + dPos : b.to, clipEnd = Math.min(end, endB);
        if (a.point || b.point) {
            if (!(a.point && b.point && (a.point == b.point || a.point.eq(b.point)) &&
                sameValues(a.activeForPoint(a.to + dPos), b.activeForPoint(b.to))))
                comparator.comparePoint(pos, clipEnd, a.point, b.point);
        }
        else {
            if (clipEnd > pos && !sameValues(a.active, b.active))
                comparator.compareRange(pos, clipEnd, a.active, b.active);
        }
        if (end > endB)
            break;
        pos = end;
        if (diff <= 0)
            a.next();
        if (diff >= 0)
            b.next();
    }
}
function sameValues(a, b) {
    if (a.length != b.length)
        return false;
    for (let i = 0; i < a.length; i++)
        if (a[i] != b[i] && !a[i].eq(b[i]))
            return false;
    return true;
}
function remove(array, index) {
    for (let i = index, e = array.length - 1; i < e; i++)
        array[i] = array[i + 1];
    array.pop();
}
function insert(array, index, value) {
    for (let i = array.length - 1; i >= index; i--)
        array[i + 1] = array[i];
    array[index] = value;
}
function findMinIndex(value, array) {
    let found = -1, foundPos = 1000000000 /* Far */;
    for (let i = 0; i < array.length; i++)
        if ((array[i] - foundPos || value[i].endSide - value[found].endSide) < 0) {
            found = i;
            foundPos = array[i];
        }
    return found;
}

var base = {
  8: "Backspace",
  9: "Tab",
  10: "Enter",
  12: "NumLock",
  13: "Enter",
  16: "Shift",
  17: "Control",
  18: "Alt",
  20: "CapsLock",
  27: "Escape",
  32: " ",
  33: "PageUp",
  34: "PageDown",
  35: "End",
  36: "Home",
  37: "ArrowLeft",
  38: "ArrowUp",
  39: "ArrowRight",
  40: "ArrowDown",
  44: "PrintScreen",
  45: "Insert",
  46: "Delete",
  59: ";",
  61: "=",
  91: "Meta",
  92: "Meta",
  106: "*",
  107: "+",
  108: ",",
  109: "-",
  110: ".",
  111: "/",
  144: "NumLock",
  145: "ScrollLock",
  160: "Shift",
  161: "Shift",
  162: "Control",
  163: "Control",
  164: "Alt",
  165: "Alt",
  173: "-",
  186: ";",
  187: "=",
  188: ",",
  189: "-",
  190: ".",
  191: "/",
  192: "`",
  219: "[",
  220: "\\",
  221: "]",
  222: "'",
  229: "q"
};

var shift = {
  48: ")",
  49: "!",
  50: "@",
  51: "#",
  52: "$",
  53: "%",
  54: "^",
  55: "&",
  56: "*",
  57: "(",
  59: ":",
  61: "+",
  173: "_",
  186: ":",
  187: "+",
  188: "<",
  189: "_",
  190: ">",
  191: "?",
  192: "~",
  219: "{",
  220: "|",
  221: "}",
  222: "\"",
  229: "Q"
};

var chrome = typeof navigator != "undefined" && /Chrome\/(\d+)/.exec(navigator.userAgent);
var safari = typeof navigator != "undefined" && /Apple Computer/.test(navigator.vendor);
var gecko = typeof navigator != "undefined" && /Gecko\/\d+/.test(navigator.userAgent);
var mac = typeof navigator != "undefined" && /Mac/.test(navigator.platform);
var ie = typeof navigator != "undefined" && /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);
var brokenModifierNames = chrome && (mac || +chrome[1] < 57) || gecko && mac;

// Fill in the digit keys
for (var i = 0; i < 10; i++) base[48 + i] = base[96 + i] = String(i);

// The function keys
for (var i = 1; i <= 24; i++) base[i + 111] = "F" + i;

// And the alphabetic keys
for (var i = 65; i <= 90; i++) {
  base[i] = String.fromCharCode(i + 32);
  shift[i] = String.fromCharCode(i);
}

// For each code that doesn't have a shift-equivalent, copy the base name
for (var code in base) if (!shift.hasOwnProperty(code)) shift[code] = base[code];

function keyName(event) {
  // Don't trust event.key in Chrome when there are modifiers until
  // they fix https://bugs.chromium.org/p/chromium/issues/detail?id=633838
  var ignoreKey = brokenModifierNames && (event.ctrlKey || event.altKey || event.metaKey) ||
    (safari || ie) && event.shiftKey && event.key && event.key.length == 1;
  var name = (!ignoreKey && event.key) ||
    (event.shiftKey ? shift : base)[event.keyCode] ||
    event.key || "Unidentified";
  // Edge sometimes produces wrong names (Issue #3)
  if (name == "Esc") name = "Escape";
  if (name == "Del") name = "Delete";
  // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/8860571/
  if (name == "Left") name = "ArrowLeft";
  if (name == "Up") name = "ArrowUp";
  if (name == "Right") name = "ArrowRight";
  if (name == "Down") name = "ArrowDown";
  return name
}

function getSelection(root) {
    let target;
    // Browsers differ on whether shadow roots have a getSelection
    // method. If it exists, use that, otherwise, call it on the
    // document.
    if (root.nodeType == 11) { // Shadow root
        target = root.getSelection ? root : root.ownerDocument;
    }
    else {
        target = root;
    }
    return target.getSelection();
}
function contains(dom, node) {
    return node ? dom.contains(node.nodeType != 1 ? node.parentNode : node) : false;
}
function deepActiveElement() {
    let elt = document.activeElement;
    while (elt && elt.shadowRoot)
        elt = elt.shadowRoot.activeElement;
    return elt;
}
function hasSelection(dom, selection) {
    if (!selection.anchorNode)
        return false;
    try {
        // Firefox will raise 'permission denied' errors when accessing
        // properties of `sel.anchorNode` when it's in a generated CSS
        // element.
        return contains(dom, selection.anchorNode);
    }
    catch (_) {
        return false;
    }
}
function clientRectsFor(dom) {
    if (dom.nodeType == 3)
        return textRange(dom, 0, dom.nodeValue.length).getClientRects();
    else if (dom.nodeType == 1)
        return dom.getClientRects();
    else
        return [];
}
// Scans forward and backward through DOM positions equivalent to the
// given one to see if the two are in the same place (i.e. after a
// text node vs at the end of that text node)
function isEquivalentPosition(node, off, targetNode, targetOff) {
    return targetNode ? (scanFor(node, off, targetNode, targetOff, -1) ||
        scanFor(node, off, targetNode, targetOff, 1)) : false;
}
function domIndex(node) {
    for (var index = 0;; index++) {
        node = node.previousSibling;
        if (!node)
            return index;
    }
}
function scanFor(node, off, targetNode, targetOff, dir) {
    for (;;) {
        if (node == targetNode && off == targetOff)
            return true;
        if (off == (dir < 0 ? 0 : maxOffset(node))) {
            if (node.nodeName == "DIV")
                return false;
            let parent = node.parentNode;
            if (!parent || parent.nodeType != 1)
                return false;
            off = domIndex(node) + (dir < 0 ? 0 : 1);
            node = parent;
        }
        else if (node.nodeType == 1) {
            node = node.childNodes[off + (dir < 0 ? -1 : 0)];
            if (node.nodeType == 1 && node.contentEditable == "false")
                return false;
            off = dir < 0 ? maxOffset(node) : 0;
        }
        else {
            return false;
        }
    }
}
function maxOffset(node) {
    return node.nodeType == 3 ? node.nodeValue.length : node.childNodes.length;
}
const Rect0 = { left: 0, right: 0, top: 0, bottom: 0 };
function flattenRect(rect, left) {
    let x = left ? rect.left : rect.right;
    return { left: x, right: x, top: rect.top, bottom: rect.bottom };
}
function windowRect(win) {
    return { left: 0, right: win.innerWidth,
        top: 0, bottom: win.innerHeight };
}
function scrollRectIntoView(dom, rect, side, x, y, xMargin, yMargin, ltr) {
    let doc = dom.ownerDocument, win = doc.defaultView;
    for (let cur = dom; cur;) {
        if (cur.nodeType == 1) { // Element
            let bounding, top = cur == doc.body;
            if (top) {
                bounding = windowRect(win);
            }
            else {
                if (cur.scrollHeight <= cur.clientHeight && cur.scrollWidth <= cur.clientWidth) {
                    cur = cur.parentNode;
                    continue;
                }
                let rect = cur.getBoundingClientRect();
                // Make sure scrollbar width isn't included in the rectangle
                bounding = { left: rect.left, right: rect.left + cur.clientWidth,
                    top: rect.top, bottom: rect.top + cur.clientHeight };
            }
            let moveX = 0, moveY = 0;
            if (y == "nearest") {
                if (rect.top < bounding.top) {
                    moveY = -(bounding.top - rect.top + yMargin);
                    if (side > 0 && rect.bottom > bounding.bottom + moveY)
                        moveY = rect.bottom - bounding.bottom + moveY + yMargin;
                }
                else if (rect.bottom > bounding.bottom) {
                    moveY = rect.bottom - bounding.bottom + yMargin;
                    if (side < 0 && (rect.top - moveY) < bounding.top)
                        moveY = -(bounding.top + moveY - rect.top + yMargin);
                }
            }
            else {
                let rectHeight = rect.bottom - rect.top, boundingHeight = bounding.bottom - bounding.top;
                let targetTop = y == "center" && rectHeight <= boundingHeight ? rect.top + rectHeight / 2 - boundingHeight / 2 :
                    y == "start" || y == "center" && side < 0 ? rect.top - yMargin :
                        rect.bottom - boundingHeight + yMargin;
                moveY = targetTop - bounding.top;
            }
            if (x == "nearest") {
                if (rect.left < bounding.left) {
                    moveX = -(bounding.left - rect.left + xMargin);
                    if (side > 0 && rect.right > bounding.right + moveX)
                        moveX = rect.right - bounding.right + moveX + xMargin;
                }
                else if (rect.right > bounding.right) {
                    moveX = rect.right - bounding.right + xMargin;
                    if (side < 0 && rect.left < bounding.left + moveX)
                        moveX = -(bounding.left + moveX - rect.left + xMargin);
                }
            }
            else {
                let targetLeft = x == "center" ? rect.left + (rect.right - rect.left) / 2 - (bounding.right - bounding.left) / 2 :
                    (x == "start") == ltr ? rect.left - xMargin :
                        rect.right - (bounding.right - bounding.left) + xMargin;
                moveX = targetLeft - bounding.left;
            }
            if (moveX || moveY) {
                if (top) {
                    win.scrollBy(moveX, moveY);
                }
                else {
                    if (moveY) {
                        let start = cur.scrollTop;
                        cur.scrollTop += moveY;
                        moveY = cur.scrollTop - start;
                    }
                    if (moveX) {
                        let start = cur.scrollLeft;
                        cur.scrollLeft += moveX;
                        moveX = cur.scrollLeft - start;
                    }
                    rect = { left: rect.left - moveX, top: rect.top - moveY,
                        right: rect.right - moveX, bottom: rect.bottom - moveY };
                }
            }
            if (top)
                break;
            cur = cur.assignedSlot || cur.parentNode;
            x = y = "nearest";
        }
        else if (cur.nodeType == 11) { // A shadow root
            cur = cur.host;
        }
        else {
            break;
        }
    }
}
class DOMSelectionState {
    constructor() {
        this.anchorNode = null;
        this.anchorOffset = 0;
        this.focusNode = null;
        this.focusOffset = 0;
    }
    eq(domSel) {
        return this.anchorNode == domSel.anchorNode && this.anchorOffset == domSel.anchorOffset &&
            this.focusNode == domSel.focusNode && this.focusOffset == domSel.focusOffset;
    }
    setRange(range) {
        this.set(range.anchorNode, range.anchorOffset, range.focusNode, range.focusOffset);
    }
    set(anchorNode, anchorOffset, focusNode, focusOffset) {
        this.anchorNode = anchorNode;
        this.anchorOffset = anchorOffset;
        this.focusNode = focusNode;
        this.focusOffset = focusOffset;
    }
}
let preventScrollSupported = null;
// Feature-detects support for .focus({preventScroll: true}), and uses
// a fallback kludge when not supported.
function focusPreventScroll(dom) {
    if (dom.setActive)
        return dom.setActive(); // in IE
    if (preventScrollSupported)
        return dom.focus(preventScrollSupported);
    let stack = [];
    for (let cur = dom; cur; cur = cur.parentNode) {
        stack.push(cur, cur.scrollTop, cur.scrollLeft);
        if (cur == cur.ownerDocument)
            break;
    }
    dom.focus(preventScrollSupported == null ? {
        get preventScroll() {
            preventScrollSupported = { preventScroll: true };
            return true;
        }
    } : undefined);
    if (!preventScrollSupported) {
        preventScrollSupported = false;
        for (let i = 0; i < stack.length;) {
            let elt = stack[i++], top = stack[i++], left = stack[i++];
            if (elt.scrollTop != top)
                elt.scrollTop = top;
            if (elt.scrollLeft != left)
                elt.scrollLeft = left;
        }
    }
}
let scratchRange;
function textRange(node, from, to = from) {
    let range = scratchRange || (scratchRange = document.createRange());
    range.setEnd(node, to);
    range.setStart(node, from);
    return range;
}
function dispatchKey(elt, name, code) {
    let options = { key: name, code: name, keyCode: code, which: code, cancelable: true };
    let down = new KeyboardEvent("keydown", options);
    down.synthetic = true;
    elt.dispatchEvent(down);
    let up = new KeyboardEvent("keyup", options);
    up.synthetic = true;
    elt.dispatchEvent(up);
    return down.defaultPrevented || up.defaultPrevented;
}
function getRoot(node) {
    while (node) {
        if (node && (node.nodeType == 9 || node.nodeType == 11 && node.host))
            return node;
        node = node.assignedSlot || node.parentNode;
    }
    return null;
}
function clearAttributes(node) {
    while (node.attributes.length)
        node.removeAttributeNode(node.attributes[0]);
}

class DOMPos {
    constructor(node, offset, precise = true) {
        this.node = node;
        this.offset = offset;
        this.precise = precise;
    }
    static before(dom, precise) { return new DOMPos(dom.parentNode, domIndex(dom), precise); }
    static after(dom, precise) { return new DOMPos(dom.parentNode, domIndex(dom) + 1, precise); }
}
const noChildren = [];
class ContentView {
    constructor() {
        this.parent = null;
        this.dom = null;
        this.dirty = 2 /* Node */;
    }
    get editorView() {
        if (!this.parent)
            throw new Error("Accessing view in orphan content view");
        return this.parent.editorView;
    }
    get overrideDOMText() { return null; }
    get posAtStart() {
        return this.parent ? this.parent.posBefore(this) : 0;
    }
    get posAtEnd() {
        return this.posAtStart + this.length;
    }
    posBefore(view) {
        let pos = this.posAtStart;
        for (let child of this.children) {
            if (child == view)
                return pos;
            pos += child.length + child.breakAfter;
        }
        throw new RangeError("Invalid child in posBefore");
    }
    posAfter(view) {
        return this.posBefore(view) + view.length;
    }
    // Will return a rectangle directly before (when side < 0), after
    // (side > 0) or directly on (when the browser supports it) the
    // given position.
    coordsAt(_pos, _side) { return null; }
    sync(track) {
        if (this.dirty & 2 /* Node */) {
            let parent = this.dom;
            let pos = parent.firstChild;
            for (let child of this.children) {
                if (child.dirty) {
                    if (!child.dom && pos) {
                        let contentView = ContentView.get(pos);
                        if (!contentView || !contentView.parent && contentView.constructor == child.constructor)
                            child.reuseDOM(pos);
                    }
                    child.sync(track);
                    child.dirty = 0 /* Not */;
                }
                if (track && !track.written && track.node == parent && pos != child.dom)
                    track.written = true;
                if (child.dom.parentNode == parent) {
                    while (pos && pos != child.dom)
                        pos = rm(pos);
                    pos = child.dom.nextSibling;
                }
                else {
                    parent.insertBefore(child.dom, pos);
                }
            }
            if (pos && track && track.node == parent)
                track.written = true;
            while (pos)
                pos = rm(pos);
        }
        else if (this.dirty & 1 /* Child */) {
            for (let child of this.children)
                if (child.dirty) {
                    child.sync(track);
                    child.dirty = 0 /* Not */;
                }
        }
    }
    reuseDOM(_dom) { }
    localPosFromDOM(node, offset) {
        let after;
        if (node == this.dom) {
            after = this.dom.childNodes[offset];
        }
        else {
            let bias = maxOffset(node) == 0 ? 0 : offset == 0 ? -1 : 1;
            for (;;) {
                let parent = node.parentNode;
                if (parent == this.dom)
                    break;
                if (bias == 0 && parent.firstChild != parent.lastChild) {
                    if (node == parent.firstChild)
                        bias = -1;
                    else
                        bias = 1;
                }
                node = parent;
            }
            if (bias < 0)
                after = node;
            else
                after = node.nextSibling;
        }
        if (after == this.dom.firstChild)
            return 0;
        while (after && !ContentView.get(after))
            after = after.nextSibling;
        if (!after)
            return this.length;
        for (let i = 0, pos = 0;; i++) {
            let child = this.children[i];
            if (child.dom == after)
                return pos;
            pos += child.length + child.breakAfter;
        }
    }
    domBoundsAround(from, to, offset = 0) {
        let fromI = -1, fromStart = -1, toI = -1, toEnd = -1;
        for (let i = 0, pos = offset, prevEnd = offset; i < this.children.length; i++) {
            let child = this.children[i], end = pos + child.length;
            if (pos < from && end > to)
                return child.domBoundsAround(from, to, pos);
            if (end >= from && fromI == -1) {
                fromI = i;
                fromStart = pos;
            }
            if (pos > to && child.dom.parentNode == this.dom) {
                toI = i;
                toEnd = prevEnd;
                break;
            }
            prevEnd = end;
            pos = end + child.breakAfter;
        }
        return { from: fromStart, to: toEnd < 0 ? offset + this.length : toEnd,
            startDOM: (fromI ? this.children[fromI - 1].dom.nextSibling : null) || this.dom.firstChild,
            endDOM: toI < this.children.length && toI >= 0 ? this.children[toI].dom : null };
    }
    markDirty(andParent = false) {
        this.dirty |= 2 /* Node */;
        this.markParentsDirty(andParent);
    }
    markParentsDirty(childList) {
        for (let parent = this.parent; parent; parent = parent.parent) {
            if (childList)
                parent.dirty |= 2 /* Node */;
            if (parent.dirty & 1 /* Child */)
                return;
            parent.dirty |= 1 /* Child */;
            childList = false;
        }
    }
    setParent(parent) {
        if (this.parent != parent) {
            this.parent = parent;
            if (this.dirty)
                this.markParentsDirty(true);
        }
    }
    setDOM(dom) {
        if (this.dom)
            this.dom.cmView = null;
        this.dom = dom;
        dom.cmView = this;
    }
    get rootView() {
        for (let v = this;;) {
            let parent = v.parent;
            if (!parent)
                return v;
            v = parent;
        }
    }
    replaceChildren(from, to, children = noChildren) {
        this.markDirty();
        for (let i = from; i < to; i++) {
            let child = this.children[i];
            if (child.parent == this)
                child.destroy();
        }
        this.children.splice(from, to - from, ...children);
        for (let i = 0; i < children.length; i++)
            children[i].setParent(this);
    }
    ignoreMutation(_rec) { return false; }
    ignoreEvent(_event) { return false; }
    childCursor(pos = this.length) {
        return new ChildCursor(this.children, pos, this.children.length);
    }
    childPos(pos, bias = 1) {
        return this.childCursor().findPos(pos, bias);
    }
    toString() {
        let name = this.constructor.name.replace("View", "");
        return name + (this.children.length ? "(" + this.children.join() + ")" :
            this.length ? "[" + (name == "Text" ? this.text : this.length) + "]" : "") +
            (this.breakAfter ? "#" : "");
    }
    static get(node) { return node.cmView; }
    get isEditable() { return true; }
    merge(from, to, source, hasStart, openStart, openEnd) {
        return false;
    }
    become(other) { return false; }
    // When this is a zero-length view with a side, this should return a
    // number <= 0 to indicate it is before its position, or a
    // number > 0 when after its position.
    getSide() { return 0; }
    destroy() {
        this.parent = null;
    }
}
ContentView.prototype.breakAfter = 0;
// Remove a DOM node and return its next sibling.
function rm(dom) {
    let next = dom.nextSibling;
    dom.parentNode.removeChild(dom);
    return next;
}
class ChildCursor {
    constructor(children, pos, i) {
        this.children = children;
        this.pos = pos;
        this.i = i;
        this.off = 0;
    }
    findPos(pos, bias = 1) {
        for (;;) {
            if (pos > this.pos || pos == this.pos &&
                (bias > 0 || this.i == 0 || this.children[this.i - 1].breakAfter)) {
                this.off = pos - this.pos;
                return this;
            }
            let next = this.children[--this.i];
            this.pos -= next.length + next.breakAfter;
        }
    }
}
function replaceRange(parent, fromI, fromOff, toI, toOff, insert, breakAtStart, openStart, openEnd) {
    let { children } = parent;
    let before = children.length ? children[fromI] : null;
    let last = insert.length ? insert[insert.length - 1] : null;
    let breakAtEnd = last ? last.breakAfter : breakAtStart;
    // Change within a single child
    if (fromI == toI && before && !breakAtStart && !breakAtEnd && insert.length < 2 &&
        before.merge(fromOff, toOff, insert.length ? last : null, fromOff == 0, openStart, openEnd))
        return;
    if (toI < children.length) {
        let after = children[toI];
        // Make sure the end of the child after the update is preserved in `after`
        if (after && toOff < after.length) {
            // If we're splitting a child, separate part of it to avoid that
            // being mangled when updating the child before the update.
            if (fromI == toI) {
                after = after.split(toOff);
                toOff = 0;
            }
            // If the element after the replacement should be merged with
            // the last replacing element, update `content`
            if (!breakAtEnd && last && after.merge(0, toOff, last, true, 0, openEnd)) {
                insert[insert.length - 1] = after;
            }
            else {
                // Remove the start of the after element, if necessary, and
                // add it to `content`.
                if (toOff)
                    after.merge(0, toOff, null, false, 0, openEnd);
                insert.push(after);
            }
        }
        else if (after === null || after === void 0 ? void 0 : after.breakAfter) {
            // The element at `toI` is entirely covered by this range.
            // Preserve its line break, if any.
            if (last)
                last.breakAfter = 1;
            else
                breakAtStart = 1;
        }
        // Since we've handled the next element from the current elements
        // now, make sure `toI` points after that.
        toI++;
    }
    if (before) {
        before.breakAfter = breakAtStart;
        if (fromOff > 0) {
            if (!breakAtStart && insert.length && before.merge(fromOff, before.length, insert[0], false, openStart, 0)) {
                before.breakAfter = insert.shift().breakAfter;
            }
            else if (fromOff < before.length || before.children.length && before.children[before.children.length - 1].length == 0) {
                before.merge(fromOff, before.length, null, false, openStart, 0);
            }
            fromI++;
        }
    }
    // Try to merge widgets on the boundaries of the replacement
    while (fromI < toI && insert.length) {
        if (children[toI - 1].become(insert[insert.length - 1])) {
            toI--;
            insert.pop();
            openEnd = insert.length ? 0 : openStart;
        }
        else if (children[fromI].become(insert[0])) {
            fromI++;
            insert.shift();
            openStart = insert.length ? 0 : openEnd;
        }
        else {
            break;
        }
    }
    if (!insert.length && fromI && toI < children.length && !children[fromI - 1].breakAfter &&
        children[toI].merge(0, 0, children[fromI - 1], false, openStart, openEnd))
        fromI--;
    if (fromI < toI || insert.length)
        parent.replaceChildren(fromI, toI, insert);
}
function mergeChildrenInto(parent, from, to, insert, openStart, openEnd) {
    let cur = parent.childCursor();
    let { i: toI, off: toOff } = cur.findPos(to, 1);
    let { i: fromI, off: fromOff } = cur.findPos(from, -1);
    let dLen = from - to;
    for (let view of insert)
        dLen += view.length;
    parent.length += dLen;
    replaceRange(parent, fromI, fromOff, toI, toOff, insert, 0, openStart, openEnd);
}

let nav = typeof navigator != "undefined" ? navigator : { userAgent: "", vendor: "", platform: "" };
let doc = typeof document != "undefined" ? document : { documentElement: { style: {} } };
const ie_edge = /*@__PURE__*//Edge\/(\d+)/.exec(nav.userAgent);
const ie_upto10 = /*@__PURE__*//MSIE \d/.test(nav.userAgent);
const ie_11up = /*@__PURE__*//Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(nav.userAgent);
const ie$1 = !!(ie_upto10 || ie_11up || ie_edge);
const gecko$1 = !ie$1 && /*@__PURE__*//gecko\/(\d+)/i.test(nav.userAgent);
const chrome$1 = !ie$1 && /*@__PURE__*//Chrome\/(\d+)/.exec(nav.userAgent);
const webkit = "webkitFontSmoothing" in doc.documentElement.style;
const safari$1 = !ie$1 && /*@__PURE__*//Apple Computer/.test(nav.vendor);
const ios = safari$1 && (/*@__PURE__*//Mobile\/\w+/.test(nav.userAgent) || nav.maxTouchPoints > 2);
var browser = {
    mac: ios || /*@__PURE__*//Mac/.test(nav.platform),
    windows: /*@__PURE__*//Win/.test(nav.platform),
    linux: /*@__PURE__*//Linux|X11/.test(nav.platform),
    ie: ie$1,
    ie_version: ie_upto10 ? doc.documentMode || 6 : ie_11up ? +ie_11up[1] : ie_edge ? +ie_edge[1] : 0,
    gecko: gecko$1,
    gecko_version: gecko$1 ? +(/*@__PURE__*//Firefox\/(\d+)/.exec(nav.userAgent) || [0, 0])[1] : 0,
    chrome: !!chrome$1,
    chrome_version: chrome$1 ? +chrome$1[1] : 0,
    ios,
    android: /*@__PURE__*//Android\b/.test(nav.userAgent),
    webkit,
    safari: safari$1,
    webkit_version: webkit ? +(/*@__PURE__*//\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1] : 0,
    tabSize: doc.documentElement.style.tabSize != null ? "tab-size" : "-moz-tab-size"
};

const MaxJoinLen = 256;
class TextView extends ContentView {
    constructor(text) {
        super();
        this.text = text;
    }
    get length() { return this.text.length; }
    createDOM(textDOM) {
        this.setDOM(textDOM || document.createTextNode(this.text));
    }
    sync(track) {
        if (!this.dom)
            this.createDOM();
        if (this.dom.nodeValue != this.text) {
            if (track && track.node == this.dom)
                track.written = true;
            this.dom.nodeValue = this.text;
        }
    }
    reuseDOM(dom) {
        if (dom.nodeType == 3)
            this.createDOM(dom);
    }
    merge(from, to, source) {
        if (source && (!(source instanceof TextView) || this.length - (to - from) + source.length > MaxJoinLen))
            return false;
        this.text = this.text.slice(0, from) + (source ? source.text : "") + this.text.slice(to);
        this.markDirty();
        return true;
    }
    split(from) {
        let result = new TextView(this.text.slice(from));
        this.text = this.text.slice(0, from);
        this.markDirty();
        return result;
    }
    localPosFromDOM(node, offset) {
        return node == this.dom ? offset : offset ? this.text.length : 0;
    }
    domAtPos(pos) { return new DOMPos(this.dom, pos); }
    domBoundsAround(_from, _to, offset) {
        return { from: offset, to: offset + this.length, startDOM: this.dom, endDOM: this.dom.nextSibling };
    }
    coordsAt(pos, side) {
        return textCoords(this.dom, pos, side);
    }
}
class MarkView extends ContentView {
    constructor(mark, children = [], length = 0) {
        super();
        this.mark = mark;
        this.children = children;
        this.length = length;
        for (let ch of children)
            ch.setParent(this);
    }
    setAttrs(dom) {
        clearAttributes(dom);
        if (this.mark.class)
            dom.className = this.mark.class;
        if (this.mark.attrs)
            for (let name in this.mark.attrs)
                dom.setAttribute(name, this.mark.attrs[name]);
        return dom;
    }
    reuseDOM(node) {
        if (node.nodeName == this.mark.tagName.toUpperCase()) {
            this.setDOM(node);
            this.dirty |= 4 /* Attrs */ | 2 /* Node */;
        }
    }
    sync(track) {
        if (!this.dom)
            this.setDOM(this.setAttrs(document.createElement(this.mark.tagName)));
        else if (this.dirty & 4 /* Attrs */)
            this.setAttrs(this.dom);
        super.sync(track);
    }
    merge(from, to, source, _hasStart, openStart, openEnd) {
        if (source && (!(source instanceof MarkView && source.mark.eq(this.mark)) ||
            (from && openStart <= 0) || (to < this.length && openEnd <= 0)))
            return false;
        mergeChildrenInto(this, from, to, source ? source.children : [], openStart - 1, openEnd - 1);
        this.markDirty();
        return true;
    }
    split(from) {
        let result = [], off = 0, detachFrom = -1, i = 0;
        for (let elt of this.children) {
            let end = off + elt.length;
            if (end > from)
                result.push(off < from ? elt.split(from - off) : elt);
            if (detachFrom < 0 && off >= from)
                detachFrom = i;
            off = end;
            i++;
        }
        let length = this.length - from;
        this.length = from;
        if (detachFrom > -1) {
            this.children.length = detachFrom;
            this.markDirty();
        }
        return new MarkView(this.mark, result, length);
    }
    domAtPos(pos) {
        return inlineDOMAtPos(this.dom, this.children, pos);
    }
    coordsAt(pos, side) {
        return coordsInChildren(this, pos, side);
    }
}
function textCoords(text, pos, side) {
    let length = text.nodeValue.length;
    if (pos > length)
        pos = length;
    let from = pos, to = pos, flatten = 0;
    if (pos == 0 && side < 0 || pos == length && side >= 0) {
        if (!(browser.chrome || browser.gecko)) { // These browsers reliably return valid rectangles for empty ranges
            if (pos) {
                from--;
                flatten = 1;
            } // FIXME this is wrong in RTL text
            else {
                to++;
                flatten = -1;
            }
        }
    }
    else {
        if (side < 0)
            from--;
        else
            to++;
    }
    let rects = textRange(text, from, to).getClientRects();
    if (!rects.length)
        return Rect0;
    let rect = rects[(flatten ? flatten < 0 : side >= 0) ? 0 : rects.length - 1];
    if (browser.safari && !flatten && rect.width == 0)
        rect = Array.prototype.find.call(rects, r => r.width) || rect;
    return flatten ? flattenRect(rect, flatten < 0) : rect || null;
}
// Also used for collapsed ranges that don't have a placeholder widget!
class WidgetView extends ContentView {
    constructor(widget, length, side) {
        super();
        this.widget = widget;
        this.length = length;
        this.side = side;
        this.prevWidget = null;
    }
    static create(widget, length, side) {
        return new (widget.customView || WidgetView)(widget, length, side);
    }
    split(from) {
        let result = WidgetView.create(this.widget, this.length - from, this.side);
        this.length -= from;
        return result;
    }
    sync() {
        if (!this.dom || !this.widget.updateDOM(this.dom)) {
            if (this.dom && this.prevWidget)
                this.prevWidget.destroy(this.dom);
            this.prevWidget = null;
            this.setDOM(this.widget.toDOM(this.editorView));
            this.dom.contentEditable = "false";
        }
    }
    getSide() { return this.side; }
    merge(from, to, source, hasStart, openStart, openEnd) {
        if (source && (!(source instanceof WidgetView) || !this.widget.compare(source.widget) ||
            from > 0 && openStart <= 0 || to < this.length && openEnd <= 0))
            return false;
        this.length = from + (source ? source.length : 0) + (this.length - to);
        return true;
    }
    become(other) {
        if (other.length == this.length && other instanceof WidgetView && other.side == this.side) {
            if (this.widget.constructor == other.widget.constructor) {
                if (!this.widget.eq(other.widget))
                    this.markDirty(true);
                if (this.dom && !this.prevWidget)
                    this.prevWidget = this.widget;
                this.widget = other.widget;
                return true;
            }
        }
        return false;
    }
    ignoreMutation() { return true; }
    ignoreEvent(event) { return this.widget.ignoreEvent(event); }
    get overrideDOMText() {
        if (this.length == 0)
            return Text.empty;
        let top = this;
        while (top.parent)
            top = top.parent;
        let view = top.editorView, text = view && view.state.doc, start = this.posAtStart;
        return text ? text.slice(start, start + this.length) : Text.empty;
    }
    domAtPos(pos) {
        return pos == 0 ? DOMPos.before(this.dom) : DOMPos.after(this.dom, pos == this.length);
    }
    domBoundsAround() { return null; }
    coordsAt(pos, side) {
        let rects = this.dom.getClientRects(), rect = null;
        if (!rects.length)
            return Rect0;
        for (let i = pos > 0 ? rects.length - 1 : 0;; i += (pos > 0 ? -1 : 1)) {
            rect = rects[i];
            if (pos > 0 ? i == 0 : i == rects.length - 1 || rect.top < rect.bottom)
                break;
        }
        return (pos == 0 && side > 0 || pos == this.length && side <= 0) ? rect : flattenRect(rect, pos == 0);
    }
    get isEditable() { return false; }
    destroy() {
        super.destroy();
        if (this.dom)
            this.widget.destroy(this.dom);
    }
}
class CompositionView extends WidgetView {
    domAtPos(pos) {
        let { topView } = this.widget;
        if (!topView)
            return new DOMPos(this.widget.text, Math.min(pos, this.widget.text.nodeValue.length));
        return posInCompositionTree(pos, topView, this.widget.text);
    }
    sync() { this.setDOM(this.widget.toDOM()); }
    localPosFromDOM(node, offset) {
        return !offset ? 0 : node.nodeType == 3 ? Math.min(offset, this.length) : this.length;
    }
    ignoreMutation() { return false; }
    get overrideDOMText() { return null; }
    coordsAt(pos, side) { return textCoords(this.widget.text, pos, side); }
    destroy() {
        var _a;
        super.destroy();
        (_a = this.widget.topView) === null || _a === void 0 ? void 0 : _a.destroy();
    }
    get isEditable() { return true; }
}
// Uses the old structure of a chunk of content view frozen for
// composition to try and find a reasonable DOM location for the given
// offset.
function posInCompositionTree(pos, view, text) {
    if (view instanceof MarkView) {
        for (let child of view.children) {
            let hasComp = child.dom == text || child.dom.contains(text.parentNode);
            let len = hasComp ? text.nodeValue.length : child.length;
            if (pos < len || pos == len && child.getSide() <= 0)
                return hasComp ? posInCompositionTree(pos, child, text) : child.domAtPos(pos);
            pos -= len;
        }
        return view.domAtPos(view.length);
    }
    else if (view.dom == text) {
        return new DOMPos(text, Math.min(pos, text.nodeValue.length));
    }
    else {
        return view.domAtPos(pos);
    }
}
// These are drawn around uneditable widgets to avoid a number of
// browser bugs that show up when the cursor is directly next to
// uneditable inline content.
class WidgetBufferView extends ContentView {
    constructor(side) {
        super();
        this.side = side;
    }
    get length() { return 0; }
    merge() { return false; }
    become(other) {
        return other instanceof WidgetBufferView && other.side == this.side;
    }
    split() { return new WidgetBufferView(this.side); }
    sync() {
        if (!this.dom) {
            let dom = document.createElement("img");
            dom.className = "cm-widgetBuffer";
            this.setDOM(dom);
        }
    }
    getSide() { return this.side; }
    domAtPos(pos) { return DOMPos.before(this.dom); }
    localPosFromDOM() { return 0; }
    domBoundsAround() { return null; }
    coordsAt(pos) {
        return this.dom.getBoundingClientRect();
    }
    get overrideDOMText() {
        return Text.empty;
    }
}
TextView.prototype.children = WidgetView.prototype.children = WidgetBufferView.prototype.children = noChildren;
function inlineDOMAtPos(dom, children, pos) {
    let i = 0;
    for (let off = 0; i < children.length; i++) {
        let child = children[i], end = off + child.length;
        if (end == off && child.getSide() <= 0)
            continue;
        if (pos > off && pos < end && child.dom.parentNode == dom)
            return child.domAtPos(pos - off);
        if (pos <= off)
            break;
        off = end;
    }
    for (; i > 0; i--) {
        let before = children[i - 1].dom;
        if (before.parentNode == dom)
            return DOMPos.after(before);
    }
    return new DOMPos(dom, 0);
}
// Assumes `view`, if a mark view, has precisely 1 child.
function joinInlineInto(parent, view, open) {
    let last, { children } = parent;
    if (open > 0 && view instanceof MarkView && children.length &&
        (last = children[children.length - 1]) instanceof MarkView && last.mark.eq(view.mark)) {
        joinInlineInto(last, view.children[0], open - 1);
    }
    else {
        children.push(view);
        view.setParent(parent);
    }
    parent.length += view.length;
}
function coordsInChildren(view, pos, side) {
    for (let off = 0, i = 0; i < view.children.length; i++) {
        let child = view.children[i], end = off + child.length, next;
        if ((side <= 0 || end == view.length || child.getSide() > 0 ? end >= pos : end > pos) &&
            (pos < end || i + 1 == view.children.length || (next = view.children[i + 1]).length || next.getSide() > 0)) {
            let flatten = 0;
            if (end == off) {
                if (child.getSide() <= 0)
                    continue;
                flatten = side = -child.getSide();
            }
            let rect = child.coordsAt(Math.max(0, pos - off), side);
            return flatten && rect ? flattenRect(rect, side < 0) : rect;
        }
        off = end;
    }
    let last = view.dom.lastChild;
    if (!last)
        return view.dom.getBoundingClientRect();
    let rects = clientRectsFor(last);
    return rects[rects.length - 1] || null;
}

function combineAttrs(source, target) {
    for (let name in source) {
        if (name == "class" && target.class)
            target.class += " " + source.class;
        else if (name == "style" && target.style)
            target.style += ";" + source.style;
        else
            target[name] = source[name];
    }
    return target;
}
function attrsEq(a, b) {
    if (a == b)
        return true;
    if (!a || !b)
        return false;
    let keysA = Object.keys(a), keysB = Object.keys(b);
    if (keysA.length != keysB.length)
        return false;
    for (let key of keysA) {
        if (keysB.indexOf(key) == -1 || a[key] !== b[key])
            return false;
    }
    return true;
}
function updateAttrs(dom, prev, attrs) {
    if (prev)
        for (let name in prev)
            if (!(attrs && name in attrs))
                dom.removeAttribute(name);
    if (attrs)
        for (let name in attrs)
            if (!(prev && prev[name] == attrs[name]))
                dom.setAttribute(name, attrs[name]);
}

/**
Widgets added to the content are described by subclasses of this
class. Using a description object like that makes it possible to
delay creating of the DOM structure for a widget until it is
needed, and to avoid redrawing widgets even when the decorations
that define them are recreated.
*/
class WidgetType {
    /**
    Compare this instance to another instance of the same type.
    (TypeScript can't express this, but only instances of the same
    specific class will be passed to this method.) This is used to
    avoid redrawing widgets when they are replaced by a new
    decoration of the same type. The default implementation just
    returns `false`, which will cause new instances of the widget to
    always be redrawn.
    */
    eq(_widget) { return false; }
    /**
    Update a DOM element created by a widget of the same type (but
    different, non-`eq` content) to reflect this widget. May return
    true to indicate that it could update, false to indicate it
    couldn't (in which case the widget will be redrawn). The default
    implementation just returns false.
    */
    updateDOM(_dom) { return false; }
    /**
    @internal
    */
    compare(other) {
        return this == other || this.constructor == other.constructor && this.eq(other);
    }
    /**
    The estimated height this widget will have, to be used when
    estimating the height of content that hasn't been drawn. May
    return -1 to indicate you don't know. The default implementation
    returns -1.
    */
    get estimatedHeight() { return -1; }
    /**
    Can be used to configure which kinds of events inside the widget
    should be ignored by the editor. The default is to ignore all
    events.
    */
    ignoreEvent(_event) { return true; }
    /**
    @internal
    */
    get customView() { return null; }
    /**
    This is called when the an instance of the widget is removed
    from the editor view.
    */
    destroy(_dom) { }
}
/**
The different types of blocks that can occur in an editor view.
*/
var BlockType = /*@__PURE__*/(function (BlockType) {
    /**
    A line of text.
    */
    BlockType[BlockType["Text"] = 0] = "Text";
    /**
    A block widget associated with the position after it.
    */
    BlockType[BlockType["WidgetBefore"] = 1] = "WidgetBefore";
    /**
    A block widget associated with the position before it.
    */
    BlockType[BlockType["WidgetAfter"] = 2] = "WidgetAfter";
    /**
    A block widget [replacing](https://codemirror.net/6/docs/ref/#view.Decoration^replace) a range of content.
    */
    BlockType[BlockType["WidgetRange"] = 3] = "WidgetRange";
return BlockType})(BlockType || (BlockType = {}));
/**
A decoration provides information on how to draw or style a piece
of content. You'll usually use it wrapped in a
[`Range`](https://codemirror.net/6/docs/ref/#rangeset.Range), which adds a start and end position.
*/
class Decoration extends RangeValue {
    /**
    @internal
    */
    constructor(
    /**
    @internal
    */
    startSide, 
    /**
    @internal
    */
    endSide, 
    /**
    @internal
    */
    widget, 
    /**
    The config object used to create this decoration. You can
    include additional properties in there to store metadata about
    your decoration.
    */
    spec) {
        super();
        this.startSide = startSide;
        this.endSide = endSide;
        this.widget = widget;
        this.spec = spec;
    }
    /**
    @internal
    */
    get heightRelevant() { return false; }
    /**
    Create a mark decoration, which influences the styling of the
    content in its range. Nested mark decorations will cause nested
    DOM elements to be created. Nesting order is determined by
    precedence of the [facet](https://codemirror.net/6/docs/ref/#view.EditorView^decorations) or
    (below the facet-provided decorations) [view
    plugin](https://codemirror.net/6/docs/ref/#view.PluginSpec.decorations). Such elements are split
    on line boundaries and on the boundaries of higher-precedence
    decorations.
    */
    static mark(spec) {
        return new MarkDecoration(spec);
    }
    /**
    Create a widget decoration, which adds an element at the given
    position.
    */
    static widget(spec) {
        let side = spec.side || 0, block = !!spec.block;
        side += block ? (side > 0 ? 300000000 /* BlockAfter */ : -400000000 /* BlockBefore */) : (side > 0 ? 100000000 /* InlineAfter */ : -100000000 /* InlineBefore */);
        return new PointDecoration(spec, side, side, block, spec.widget || null, false);
    }
    /**
    Create a replace decoration which replaces the given range with
    a widget, or simply hides it.
    */
    static replace(spec) {
        let block = !!spec.block;
        let { start, end } = getInclusive(spec, block);
        let startSide = (start ? (block ? -300000000 /* BlockIncStart */ : -1 /* InlineIncStart */) : 400000000 /* NonIncStart */) - 1;
        let endSide = (end ? (block ? 200000000 /* BlockIncEnd */ : 1 /* InlineIncEnd */) : -500000000 /* NonIncEnd */) + 1;
        return new PointDecoration(spec, startSide, endSide, block, spec.widget || null, true);
    }
    /**
    Create a line decoration, which can add DOM attributes to the
    line starting at the given position.
    */
    static line(spec) {
        return new LineDecoration(spec);
    }
    /**
    Build a [`DecorationSet`](https://codemirror.net/6/docs/ref/#view.DecorationSet) from the given
    decorated range or ranges. If the ranges aren't already sorted,
    pass `true` for `sort` to make the library sort them for you.
    */
    static set(of, sort = false) {
        return RangeSet.of(of, sort);
    }
    /**
    @internal
    */
    hasHeight() { return this.widget ? this.widget.estimatedHeight > -1 : false; }
}
/**
The empty set of decorations.
*/
Decoration.none = RangeSet.empty;
class MarkDecoration extends Decoration {
    constructor(spec) {
        let { start, end } = getInclusive(spec);
        super(start ? -1 /* InlineIncStart */ : 400000000 /* NonIncStart */, end ? 1 /* InlineIncEnd */ : -500000000 /* NonIncEnd */, null, spec);
        this.tagName = spec.tagName || "span";
        this.class = spec.class || "";
        this.attrs = spec.attributes || null;
    }
    eq(other) {
        return this == other ||
            other instanceof MarkDecoration &&
                this.tagName == other.tagName &&
                this.class == other.class &&
                attrsEq(this.attrs, other.attrs);
    }
    range(from, to = from) {
        if (from >= to)
            throw new RangeError("Mark decorations may not be empty");
        return super.range(from, to);
    }
}
MarkDecoration.prototype.point = false;
class LineDecoration extends Decoration {
    constructor(spec) {
        super(-200000000 /* Line */, -200000000 /* Line */, null, spec);
    }
    eq(other) {
        return other instanceof LineDecoration && attrsEq(this.spec.attributes, other.spec.attributes);
    }
    range(from, to = from) {
        if (to != from)
            throw new RangeError("Line decoration ranges must be zero-length");
        return super.range(from, to);
    }
}
LineDecoration.prototype.mapMode = MapMode.TrackBefore;
LineDecoration.prototype.point = true;
class PointDecoration extends Decoration {
    constructor(spec, startSide, endSide, block, widget, isReplace) {
        super(startSide, endSide, widget, spec);
        this.block = block;
        this.isReplace = isReplace;
        this.mapMode = !block ? MapMode.TrackDel : startSide <= 0 ? MapMode.TrackBefore : MapMode.TrackAfter;
    }
    // Only relevant when this.block == true
    get type() {
        return this.startSide < this.endSide ? BlockType.WidgetRange
            : this.startSide <= 0 ? BlockType.WidgetBefore : BlockType.WidgetAfter;
    }
    get heightRelevant() { return this.block || !!this.widget && this.widget.estimatedHeight >= 5; }
    eq(other) {
        return other instanceof PointDecoration &&
            widgetsEq(this.widget, other.widget) &&
            this.block == other.block &&
            this.startSide == other.startSide && this.endSide == other.endSide;
    }
    range(from, to = from) {
        if (this.isReplace && (from > to || (from == to && this.startSide > 0 && this.endSide <= 0)))
            throw new RangeError("Invalid range for replacement decoration");
        if (!this.isReplace && to != from)
            throw new RangeError("Widget decorations can only have zero-length ranges");
        return super.range(from, to);
    }
}
PointDecoration.prototype.point = true;
function getInclusive(spec, block = false) {
    let { inclusiveStart: start, inclusiveEnd: end } = spec;
    if (start == null)
        start = spec.inclusive;
    if (end == null)
        end = spec.inclusive;
    return { start: start !== null && start !== void 0 ? start : block, end: end !== null && end !== void 0 ? end : block };
}
function widgetsEq(a, b) {
    return a == b || !!(a && b && a.compare(b));
}
function addRange(from, to, ranges, margin = 0) {
    let last = ranges.length - 1;
    if (last >= 0 && ranges[last] + margin >= from)
        ranges[last] = Math.max(ranges[last], to);
    else
        ranges.push(from, to);
}

class LineView extends ContentView {
    constructor() {
        super(...arguments);
        this.children = [];
        this.length = 0;
        this.prevAttrs = undefined;
        this.attrs = null;
        this.breakAfter = 0;
    }
    // Consumes source
    merge(from, to, source, hasStart, openStart, openEnd) {
        if (source) {
            if (!(source instanceof LineView))
                return false;
            if (!this.dom)
                source.transferDOM(this); // Reuse source.dom when appropriate
        }
        if (hasStart)
            this.setDeco(source ? source.attrs : null);
        mergeChildrenInto(this, from, to, source ? source.children : [], openStart, openEnd);
        return true;
    }
    split(at) {
        let end = new LineView;
        end.breakAfter = this.breakAfter;
        if (this.length == 0)
            return end;
        let { i, off } = this.childPos(at);
        if (off) {
            end.append(this.children[i].split(off), 0);
            this.children[i].merge(off, this.children[i].length, null, false, 0, 0);
            i++;
        }
        for (let j = i; j < this.children.length; j++)
            end.append(this.children[j], 0);
        while (i > 0 && this.children[i - 1].length == 0)
            this.children[--i].destroy();
        this.children.length = i;
        this.markDirty();
        this.length = at;
        return end;
    }
    transferDOM(other) {
        if (!this.dom)
            return;
        other.setDOM(this.dom);
        other.prevAttrs = this.prevAttrs === undefined ? this.attrs : this.prevAttrs;
        this.prevAttrs = undefined;
        this.dom = null;
    }
    setDeco(attrs) {
        if (!attrsEq(this.attrs, attrs)) {
            if (this.dom) {
                this.prevAttrs = this.attrs;
                this.markDirty();
            }
            this.attrs = attrs;
        }
    }
    append(child, openStart) {
        joinInlineInto(this, child, openStart);
    }
    // Only called when building a line view in ContentBuilder
    addLineDeco(deco) {
        let attrs = deco.spec.attributes, cls = deco.spec.class;
        if (attrs)
            this.attrs = combineAttrs(attrs, this.attrs || {});
        if (cls)
            this.attrs = combineAttrs({ class: cls }, this.attrs || {});
    }
    domAtPos(pos) {
        return inlineDOMAtPos(this.dom, this.children, pos);
    }
    reuseDOM(node) {
        if (node.nodeName == "DIV") {
            this.setDOM(node);
            this.dirty |= 4 /* Attrs */ | 2 /* Node */;
        }
    }
    sync(track) {
        var _a;
        if (!this.dom) {
            this.setDOM(document.createElement("div"));
            this.dom.className = "cm-line";
            this.prevAttrs = this.attrs ? null : undefined;
        }
        else if (this.dirty & 4 /* Attrs */) {
            clearAttributes(this.dom);
            this.dom.className = "cm-line";
            this.prevAttrs = this.attrs ? null : undefined;
        }
        if (this.prevAttrs !== undefined) {
            updateAttrs(this.dom, this.prevAttrs, this.attrs);
            this.dom.classList.add("cm-line");
            this.prevAttrs = undefined;
        }
        super.sync(track);
        let last = this.dom.lastChild;
        while (last && ContentView.get(last) instanceof MarkView)
            last = last.lastChild;
        if (!last ||
            last.nodeName != "BR" && ((_a = ContentView.get(last)) === null || _a === void 0 ? void 0 : _a.isEditable) == false &&
                (!browser.ios || !this.children.some(ch => ch instanceof TextView))) {
            let hack = document.createElement("BR");
            hack.cmIgnore = true;
            this.dom.appendChild(hack);
        }
    }
    measureTextSize() {
        if (this.children.length == 0 || this.length > 20)
            return null;
        let totalWidth = 0;
        for (let child of this.children) {
            if (!(child instanceof TextView))
                return null;
            let rects = clientRectsFor(child.dom);
            if (rects.length != 1)
                return null;
            totalWidth += rects[0].width;
        }
        return { lineHeight: this.dom.getBoundingClientRect().height,
            charWidth: totalWidth / this.length };
    }
    coordsAt(pos, side) {
        return coordsInChildren(this, pos, side);
    }
    become(_other) { return false; }
    get type() { return BlockType.Text; }
    static find(docView, pos) {
        for (let i = 0, off = 0; i < docView.children.length; i++) {
            let block = docView.children[i], end = off + block.length;
            if (end >= pos) {
                if (block instanceof LineView)
                    return block;
                if (end > pos)
                    break;
            }
            off = end + block.breakAfter;
        }
        return null;
    }
}
class BlockWidgetView extends ContentView {
    constructor(widget, length, type) {
        super();
        this.widget = widget;
        this.length = length;
        this.type = type;
        this.breakAfter = 0;
        this.prevWidget = null;
    }
    merge(from, to, source, _takeDeco, openStart, openEnd) {
        if (source && (!(source instanceof BlockWidgetView) || !this.widget.compare(source.widget) ||
            from > 0 && openStart <= 0 || to < this.length && openEnd <= 0))
            return false;
        this.length = from + (source ? source.length : 0) + (this.length - to);
        return true;
    }
    domAtPos(pos) {
        return pos == 0 ? DOMPos.before(this.dom) : DOMPos.after(this.dom, pos == this.length);
    }
    split(at) {
        let len = this.length - at;
        this.length = at;
        let end = new BlockWidgetView(this.widget, len, this.type);
        end.breakAfter = this.breakAfter;
        return end;
    }
    get children() { return noChildren; }
    sync() {
        if (!this.dom || !this.widget.updateDOM(this.dom)) {
            if (this.dom && this.prevWidget)
                this.prevWidget.destroy(this.dom);
            this.prevWidget = null;
            this.setDOM(this.widget.toDOM(this.editorView));
            this.dom.contentEditable = "false";
        }
    }
    get overrideDOMText() {
        return this.parent ? this.parent.view.state.doc.slice(this.posAtStart, this.posAtEnd) : Text.empty;
    }
    domBoundsAround() { return null; }
    become(other) {
        if (other instanceof BlockWidgetView && other.type == this.type &&
            other.widget.constructor == this.widget.constructor) {
            if (!other.widget.eq(this.widget))
                this.markDirty(true);
            if (this.dom && !this.prevWidget)
                this.prevWidget = this.widget;
            this.widget = other.widget;
            this.length = other.length;
            this.breakAfter = other.breakAfter;
            return true;
        }
        return false;
    }
    ignoreMutation() { return true; }
    ignoreEvent(event) { return this.widget.ignoreEvent(event); }
    destroy() {
        super.destroy();
        if (this.dom)
            this.widget.destroy(this.dom);
    }
}

class ContentBuilder {
    constructor(doc, pos, end, disallowBlockEffectsBelow) {
        this.doc = doc;
        this.pos = pos;
        this.end = end;
        this.disallowBlockEffectsBelow = disallowBlockEffectsBelow;
        this.content = [];
        this.curLine = null;
        this.breakAtStart = 0;
        this.pendingBuffer = 0 /* No */;
        // Set to false directly after a widget that covers the position after it
        this.atCursorPos = true;
        this.openStart = -1;
        this.openEnd = -1;
        this.text = "";
        this.textOff = 0;
        this.cursor = doc.iter();
        this.skip = pos;
    }
    posCovered() {
        if (this.content.length == 0)
            return !this.breakAtStart && this.doc.lineAt(this.pos).from != this.pos;
        let last = this.content[this.content.length - 1];
        return !last.breakAfter && !(last instanceof BlockWidgetView && last.type == BlockType.WidgetBefore);
    }
    getLine() {
        if (!this.curLine) {
            this.content.push(this.curLine = new LineView);
            this.atCursorPos = true;
        }
        return this.curLine;
    }
    flushBuffer(active) {
        if (this.pendingBuffer) {
            this.curLine.append(wrapMarks(new WidgetBufferView(-1), active), active.length);
            this.pendingBuffer = 0 /* No */;
        }
    }
    addBlockWidget(view) {
        this.flushBuffer([]);
        this.curLine = null;
        this.content.push(view);
    }
    finish(openEnd) {
        if (!openEnd)
            this.flushBuffer([]);
        else
            this.pendingBuffer = 0 /* No */;
        if (!this.posCovered())
            this.getLine();
    }
    buildText(length, active, openStart) {
        while (length > 0) {
            if (this.textOff == this.text.length) {
                let { value, lineBreak, done } = this.cursor.next(this.skip);
                this.skip = 0;
                if (done)
                    throw new Error("Ran out of text content when drawing inline views");
                if (lineBreak) {
                    if (!this.posCovered())
                        this.getLine();
                    if (this.content.length)
                        this.content[this.content.length - 1].breakAfter = 1;
                    else
                        this.breakAtStart = 1;
                    this.flushBuffer([]);
                    this.curLine = null;
                    length--;
                    continue;
                }
                else {
                    this.text = value;
                    this.textOff = 0;
                }
            }
            let take = Math.min(this.text.length - this.textOff, length, 512 /* Chunk */);
            this.flushBuffer(active.slice(0, openStart));
            this.getLine().append(wrapMarks(new TextView(this.text.slice(this.textOff, this.textOff + take)), active), openStart);
            this.atCursorPos = true;
            this.textOff += take;
            length -= take;
            openStart = 0;
        }
    }
    span(from, to, active, openStart) {
        this.buildText(to - from, active, openStart);
        this.pos = to;
        if (this.openStart < 0)
            this.openStart = openStart;
    }
    point(from, to, deco, active, openStart) {
        let len = to - from;
        if (deco instanceof PointDecoration) {
            if (deco.block) {
                let { type } = deco;
                if (type == BlockType.WidgetAfter && !this.posCovered())
                    this.getLine();
                this.addBlockWidget(new BlockWidgetView(deco.widget || new NullWidget("div"), len, type));
            }
            else {
                let view = WidgetView.create(deco.widget || new NullWidget("span"), len, deco.startSide);
                let cursorBefore = this.atCursorPos && !view.isEditable && openStart <= active.length && (from < to || deco.startSide > 0);
                let cursorAfter = !view.isEditable && (from < to || deco.startSide <= 0);
                let line = this.getLine();
                if (this.pendingBuffer == 2 /* IfCursor */ && !cursorBefore)
                    this.pendingBuffer = 0 /* No */;
                this.flushBuffer(active);
                if (cursorBefore) {
                    line.append(wrapMarks(new WidgetBufferView(1), active), openStart);
                    openStart = active.length + Math.max(0, openStart - active.length);
                }
                line.append(wrapMarks(view, active), openStart);
                this.atCursorPos = cursorAfter;
                this.pendingBuffer = !cursorAfter ? 0 /* No */ : from < to ? 1 /* Yes */ : 2 /* IfCursor */;
            }
        }
        else if (this.doc.lineAt(this.pos).from == this.pos) { // Line decoration
            this.getLine().addLineDeco(deco);
        }
        if (len) {
            // Advance the iterator past the replaced content
            if (this.textOff + len <= this.text.length) {
                this.textOff += len;
            }
            else {
                this.skip += len - (this.text.length - this.textOff);
                this.text = "";
                this.textOff = 0;
            }
            this.pos = to;
        }
        if (this.openStart < 0)
            this.openStart = openStart;
    }
    filterPoint(from, to, value, index) {
        if (index < this.disallowBlockEffectsBelow && value instanceof PointDecoration) {
            if (value.block)
                throw new RangeError("Block decorations may not be specified via plugins");
            if (to > this.doc.lineAt(this.pos).to)
                throw new RangeError("Decorations that replace line breaks may not be specified via plugins");
        }
        return true;
    }
    static build(text, from, to, decorations, pluginDecorationLength) {
        let builder = new ContentBuilder(text, from, to, pluginDecorationLength);
        builder.openEnd = RangeSet.spans(decorations, from, to, builder);
        if (builder.openStart < 0)
            builder.openStart = builder.openEnd;
        builder.finish(builder.openEnd);
        return builder;
    }
}
function wrapMarks(view, active) {
    for (let mark of active)
        view = new MarkView(mark, [view], view.length);
    return view;
}
class NullWidget extends WidgetType {
    constructor(tag) {
        super();
        this.tag = tag;
    }
    eq(other) { return other.tag == this.tag; }
    toDOM() { return document.createElement(this.tag); }
    updateDOM(elt) { return elt.nodeName.toLowerCase() == this.tag; }
}

const none = [];
const clickAddsSelectionRange = /*@__PURE__*/Facet.define();
const dragMovesSelection$1 = /*@__PURE__*/Facet.define();
const mouseSelectionStyle = /*@__PURE__*/Facet.define();
const exceptionSink = /*@__PURE__*/Facet.define();
const updateListener = /*@__PURE__*/Facet.define();
const inputHandler = /*@__PURE__*/Facet.define();
// FIXME remove
const scrollTo = /*@__PURE__*/StateEffect.define({
    map: (range, changes) => range.map(changes)
});
// FIXME remove
const centerOn = /*@__PURE__*/StateEffect.define({
    map: (range, changes) => range.map(changes)
});
class ScrollTarget {
    constructor(range, y = "nearest", x = "nearest", yMargin = 5, xMargin = 5) {
        this.range = range;
        this.y = y;
        this.x = x;
        this.yMargin = yMargin;
        this.xMargin = xMargin;
    }
    map(changes) {
        return changes.empty ? this : new ScrollTarget(this.range.map(changes), this.y, this.x, this.yMargin, this.xMargin);
    }
}
const scrollIntoView = /*@__PURE__*/StateEffect.define({ map: (t, ch) => t.map(ch) });
/**
Log or report an unhandled exception in client code. Should
probably only be used by extension code that allows client code to
provide functions, and calls those functions in a context where an
exception can't be propagated to calling code in a reasonable way
(for example when in an event handler).

Either calls a handler registered with
[`EditorView.exceptionSink`](https://codemirror.net/6/docs/ref/#view.EditorView^exceptionSink),
`window.onerror`, if defined, or `console.error` (in which case
it'll pass `context`, when given, as first argument).
*/
function logException(state, exception, context) {
    let handler = state.facet(exceptionSink);
    if (handler.length)
        handler[0](exception);
    else if (window.onerror)
        window.onerror(String(exception), context, undefined, undefined, exception);
    else if (context)
        console.error(context + ":", exception);
    else
        console.error(exception);
}
const editable = /*@__PURE__*/Facet.define({ combine: values => values.length ? values[0] : true });
/**
Used to [declare](https://codemirror.net/6/docs/ref/#view.PluginSpec.provide) which
[fields](https://codemirror.net/6/docs/ref/#view.PluginValue) a [view plugin](https://codemirror.net/6/docs/ref/#view.ViewPlugin)
provides.
*/
class PluginFieldProvider {
    /**
    @internal
    */
    constructor(
    /**
    @internal
    */
    field, 
    /**
    @internal
    */
    get) {
        this.field = field;
        this.get = get;
    }
}
/**
Plugin fields are a mechanism for allowing plugins to provide
values that can be retrieved through the
[`pluginField`](https://codemirror.net/6/docs/ref/#view.EditorView.pluginField) view method.
*/
class PluginField {
    /**
    Create a [provider](https://codemirror.net/6/docs/ref/#view.PluginFieldProvider) for this field,
    to use with a plugin's [provide](https://codemirror.net/6/docs/ref/#view.PluginSpec.provide)
    option.
    */
    from(get) {
        return new PluginFieldProvider(this, get);
    }
    /**
    Define a new plugin field.
    */
    static define() { return new PluginField(); }
}
/**
This field can be used by plugins to provide
[decorations](https://codemirror.net/6/docs/ref/#view.Decoration).

**Note**: For reasons of data flow (plugins are only updated
after the viewport is computed), decorations produced by plugins
are _not_ taken into account when predicting the vertical layout
structure of the editor. They **must not** introduce block
widgets (that will raise an error) or replacing decorations that
cover line breaks (these will be ignored if they occur). Such
decorations, or others that cause a large amount of vertical
size shift compared to the undecorated content, should be
provided through the state-level [`decorations`
facet](https://codemirror.net/6/docs/ref/#view.EditorView^decorations) instead.
*/
PluginField.decorations = /*@__PURE__*/PluginField.define();
/**
Used to provide ranges that should be treated as atoms as far as
cursor motion is concerned. This causes methods like
[`moveByChar`](https://codemirror.net/6/docs/ref/#view.EditorView.moveByChar) and
[`moveVertically`](https://codemirror.net/6/docs/ref/#view.EditorView.moveVertically) (and the
commands built on top of them) to skip across such regions when
a selection endpoint would enter them. This does _not_ prevent
direct programmatic [selection
updates](https://codemirror.net/6/docs/ref/#state.TransactionSpec.selection) from moving into such
regions.
*/
PluginField.atomicRanges = /*@__PURE__*/PluginField.define();
/**
Plugins can provide additional scroll margins (space around the
sides of the scrolling element that should be considered
invisible) through this field. This can be useful when the
plugin introduces elements that cover part of that element (for
example a horizontally fixed gutter).
*/
PluginField.scrollMargins = /*@__PURE__*/PluginField.define();
let nextPluginID = 0;
const viewPlugin = /*@__PURE__*/Facet.define();
/**
View plugins associate stateful values with a view. They can
influence the way the content is drawn, and are notified of things
that happen in the view.
*/
class ViewPlugin {
    constructor(
    /**
    @internal
    */
    id, 
    /**
    @internal
    */
    create, 
    /**
    @internal
    */
    fields) {
        this.id = id;
        this.create = create;
        this.fields = fields;
        this.extension = viewPlugin.of(this);
    }
    /**
    Define a plugin from a constructor function that creates the
    plugin's value, given an editor view.
    */
    static define(create, spec) {
        let { eventHandlers, provide, decorations } = spec || {};
        let fields = [];
        if (provide)
            for (let provider of Array.isArray(provide) ? provide : [provide])
                fields.push(provider);
        if (eventHandlers)
            fields.push(domEventHandlers.from((value) => ({ plugin: value, handlers: eventHandlers })));
        if (decorations)
            fields.push(PluginField.decorations.from(decorations));
        return new ViewPlugin(nextPluginID++, create, fields);
    }
    /**
    Create a plugin for a class whose constructor takes a single
    editor view as argument.
    */
    static fromClass(cls, spec) {
        return ViewPlugin.define(view => new cls(view), spec);
    }
}
const domEventHandlers = /*@__PURE__*/PluginField.define();
class PluginInstance {
    constructor(spec) {
        this.spec = spec;
        // When starting an update, all plugins have this field set to the
        // update object, indicating they need to be updated. When finished
        // updating, it is set to `false`. Retrieving a plugin that needs to
        // be updated with `view.plugin` forces an eager update.
        this.mustUpdate = null;
        // This is null when the plugin is initially created, but
        // initialized on the first update.
        this.value = null;
    }
    takeField(type, target) {
        if (this.spec)
            for (let { field, get } of this.spec.fields)
                if (field == type)
                    target.push(get(this.value));
    }
    update(view) {
        if (!this.value) {
            if (this.spec) {
                try {
                    this.value = this.spec.create(view);
                }
                catch (e) {
                    logException(view.state, e, "CodeMirror plugin crashed");
                    this.deactivate();
                }
            }
        }
        else if (this.mustUpdate) {
            let update = this.mustUpdate;
            this.mustUpdate = null;
            if (this.value.update) {
                try {
                    this.value.update(update);
                }
                catch (e) {
                    logException(update.state, e, "CodeMirror plugin crashed");
                    if (this.value.destroy)
                        try {
                            this.value.destroy();
                        }
                        catch (_) { }
                    this.deactivate();
                }
            }
        }
        return this;
    }
    destroy(view) {
        var _a;
        if ((_a = this.value) === null || _a === void 0 ? void 0 : _a.destroy) {
            try {
                this.value.destroy();
            }
            catch (e) {
                logException(view.state, e, "CodeMirror plugin crashed");
            }
        }
    }
    deactivate() {
        this.spec = this.value = null;
    }
}
const editorAttributes = /*@__PURE__*/Facet.define();
const contentAttributes = /*@__PURE__*/Facet.define();
// Provide decorations
const decorations = /*@__PURE__*/Facet.define();
const styleModule = /*@__PURE__*/Facet.define();
class ChangedRange {
    constructor(fromA, toA, fromB, toB) {
        this.fromA = fromA;
        this.toA = toA;
        this.fromB = fromB;
        this.toB = toB;
    }
    join(other) {
        return new ChangedRange(Math.min(this.fromA, other.fromA), Math.max(this.toA, other.toA), Math.min(this.fromB, other.fromB), Math.max(this.toB, other.toB));
    }
    addToSet(set) {
        let i = set.length, me = this;
        for (; i > 0; i--) {
            let range = set[i - 1];
            if (range.fromA > me.toA)
                continue;
            if (range.toA < me.fromA)
                break;
            me = me.join(range);
            set.splice(i - 1, 1);
        }
        set.splice(i, 0, me);
        return set;
    }
    static extendWithRanges(diff, ranges) {
        if (ranges.length == 0)
            return diff;
        let result = [];
        for (let dI = 0, rI = 0, posA = 0, posB = 0;; dI++) {
            let next = dI == diff.length ? null : diff[dI], off = posA - posB;
            let end = next ? next.fromB : 1e9;
            while (rI < ranges.length && ranges[rI] < end) {
                let from = ranges[rI], to = ranges[rI + 1];
                let fromB = Math.max(posB, from), toB = Math.min(end, to);
                if (fromB <= toB)
                    new ChangedRange(fromB + off, toB + off, fromB, toB).addToSet(result);
                if (to > end)
                    break;
                else
                    rI += 2;
            }
            if (!next)
                return result;
            new ChangedRange(next.fromA, next.toA, next.fromB, next.toB).addToSet(result);
            posA = next.toA;
            posB = next.toB;
        }
    }
}
/**
View [plugins](https://codemirror.net/6/docs/ref/#view.ViewPlugin) are given instances of this
class, which describe what happened, whenever the view is updated.
*/
class ViewUpdate {
    /**
    @internal
    */
    constructor(
    /**
    The editor view that the update is associated with.
    */
    view, 
    /**
    The new editor state.
    */
    state, 
    /**
    The transactions involved in the update. May be empty.
    */
    transactions = none) {
        this.view = view;
        this.state = state;
        this.transactions = transactions;
        /**
        @internal
        */
        this.flags = 0;
        this.startState = view.state;
        this.changes = ChangeSet.empty(this.startState.doc.length);
        for (let tr of transactions)
            this.changes = this.changes.compose(tr.changes);
        let changedRanges = [];
        this.changes.iterChangedRanges((fromA, toA, fromB, toB) => changedRanges.push(new ChangedRange(fromA, toA, fromB, toB)));
        this.changedRanges = changedRanges;
        let focus = view.hasFocus;
        if (focus != view.inputState.notifiedFocused) {
            view.inputState.notifiedFocused = focus;
            this.flags |= 1 /* Focus */;
        }
    }
    /**
    Tells you whether the [viewport](https://codemirror.net/6/docs/ref/#view.EditorView.viewport) or
    [visible ranges](https://codemirror.net/6/docs/ref/#view.EditorView.visibleRanges) changed in this
    update.
    */
    get viewportChanged() {
        return (this.flags & 4 /* Viewport */) > 0;
    }
    /**
    Indicates whether the height of an element in the editor changed
    in this update.
    */
    get heightChanged() {
        return (this.flags & 2 /* Height */) > 0;
    }
    /**
    Returns true when the document was modified or the size of the
    editor, or elements within the editor, changed.
    */
    get geometryChanged() {
        return this.docChanged || (this.flags & (8 /* Geometry */ | 2 /* Height */)) > 0;
    }
    /**
    True when this update indicates a focus change.
    */
    get focusChanged() {
        return (this.flags & 1 /* Focus */) > 0;
    }
    /**
    Whether the document changed in this update.
    */
    get docChanged() {
        return !this.changes.empty;
    }
    /**
    Whether the selection was explicitly set in this update.
    */
    get selectionSet() {
        return this.transactions.some(tr => tr.selection);
    }
    /**
    @internal
    */
    get empty() { return this.flags == 0 && this.transactions.length == 0; }
}

/**
Used to indicate [text direction](https://codemirror.net/6/docs/ref/#view.EditorView.textDirection).
*/
var Direction = /*@__PURE__*/(function (Direction) {
    // (These are chosen to match the base levels, in bidi algorithm
    // terms, of spans in that direction.)
    /**
    Left-to-right.
    */
    Direction[Direction["LTR"] = 0] = "LTR";
    /**
    Right-to-left.
    */
    Direction[Direction["RTL"] = 1] = "RTL";
return Direction})(Direction || (Direction = {}));
const LTR = Direction.LTR, RTL = Direction.RTL;
// Decode a string with each type encoded as log2(type)
function dec(str) {
    let result = [];
    for (let i = 0; i < str.length; i++)
        result.push(1 << +str[i]);
    return result;
}
// Character types for codepoints 0 to 0xf8
const LowTypes = /*@__PURE__*/dec("88888888888888888888888888888888888666888888787833333333337888888000000000000000000000000008888880000000000000000000000000088888888888888888888888888888888888887866668888088888663380888308888800000000000000000000000800000000000000000000000000000008");
// Character types for codepoints 0x600 to 0x6f9
const ArabicTypes = /*@__PURE__*/dec("4444448826627288999999999992222222222222222222222222222222222222222222222229999999999999999999994444444444644222822222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222999999949999999229989999223333333333");
const Brackets = /*@__PURE__*/Object.create(null), BracketStack = [];
// There's a lot more in
// https://www.unicode.org/Public/UCD/latest/ucd/BidiBrackets.txt,
// which are left out to keep code size down.
for (let p of ["()", "[]", "{}"]) {
    let l = /*@__PURE__*/p.charCodeAt(0), r = /*@__PURE__*/p.charCodeAt(1);
    Brackets[l] = r;
    Brackets[r] = -l;
}
function charType(ch) {
    return ch <= 0xf7 ? LowTypes[ch] :
        0x590 <= ch && ch <= 0x5f4 ? 2 /* R */ :
            0x600 <= ch && ch <= 0x6f9 ? ArabicTypes[ch - 0x600] :
                0x6ee <= ch && ch <= 0x8ac ? 4 /* AL */ :
                    0x2000 <= ch && ch <= 0x200b ? 256 /* NI */ :
                        ch == 0x200c ? 256 /* NI */ : 1 /* L */;
}
const BidiRE = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
/**
Represents a contiguous range of text that has a single direction
(as in left-to-right or right-to-left).
*/
class BidiSpan {
    /**
    @internal
    */
    constructor(
    /**
    The start of the span (relative to the start of the line).
    */
    from, 
    /**
    The end of the span.
    */
    to, 
    /**
    The ["bidi
    level"](https://unicode.org/reports/tr9/#Basic_Display_Algorithm)
    of the span (in this context, 0 means
    left-to-right, 1 means right-to-left, 2 means left-to-right
    number inside right-to-left text).
    */
    level) {
        this.from = from;
        this.to = to;
        this.level = level;
    }
    /**
    The direction of this span.
    */
    get dir() { return this.level % 2 ? RTL : LTR; }
    /**
    @internal
    */
    side(end, dir) { return (this.dir == dir) == end ? this.to : this.from; }
    /**
    @internal
    */
    static find(order, index, level, assoc) {
        let maybe = -1;
        for (let i = 0; i < order.length; i++) {
            let span = order[i];
            if (span.from <= index && span.to >= index) {
                if (span.level == level)
                    return i;
                // When multiple spans match, if assoc != 0, take the one that
                // covers that side, otherwise take the one with the minimum
                // level.
                if (maybe < 0 || (assoc != 0 ? (assoc < 0 ? span.from < index : span.to > index) : order[maybe].level > span.level))
                    maybe = i;
            }
        }
        if (maybe < 0)
            throw new RangeError("Index out of range");
        return maybe;
    }
}
// Reused array of character types
const types = [];
function computeOrder(line, direction) {
    let len = line.length, outerType = direction == LTR ? 1 /* L */ : 2 /* R */, oppositeType = direction == LTR ? 2 /* R */ : 1 /* L */;
    if (!line || outerType == 1 /* L */ && !BidiRE.test(line))
        return trivialOrder(len);
    // W1. Examine each non-spacing mark (NSM) in the level run, and
    // change the type of the NSM to the type of the previous
    // character. If the NSM is at the start of the level run, it will
    // get the type of sor.
    // W2. Search backwards from each instance of a European number
    // until the first strong type (R, L, AL, or sor) is found. If an
    // AL is found, change the type of the European number to Arabic
    // number.
    // W3. Change all ALs to R.
    // (Left after this: L, R, EN, AN, ET, CS, NI)
    for (let i = 0, prev = outerType, prevStrong = outerType; i < len; i++) {
        let type = charType(line.charCodeAt(i));
        if (type == 512 /* NSM */)
            type = prev;
        else if (type == 8 /* EN */ && prevStrong == 4 /* AL */)
            type = 16 /* AN */;
        types[i] = type == 4 /* AL */ ? 2 /* R */ : type;
        if (type & 7 /* Strong */)
            prevStrong = type;
        prev = type;
    }
    // W5. A sequence of European terminators adjacent to European
    // numbers changes to all European numbers.
    // W6. Otherwise, separators and terminators change to Other
    // Neutral.
    // W7. Search backwards from each instance of a European number
    // until the first strong type (R, L, or sor) is found. If an L is
    // found, then change the type of the European number to L.
    // (Left after this: L, R, EN+AN, NI)
    for (let i = 0, prev = outerType, prevStrong = outerType; i < len; i++) {
        let type = types[i];
        if (type == 128 /* CS */) {
            if (i < len - 1 && prev == types[i + 1] && (prev & 24 /* Num */))
                type = types[i] = prev;
            else
                types[i] = 256 /* NI */;
        }
        else if (type == 64 /* ET */) {
            let end = i + 1;
            while (end < len && types[end] == 64 /* ET */)
                end++;
            let replace = (i && prev == 8 /* EN */) || (end < len && types[end] == 8 /* EN */) ? (prevStrong == 1 /* L */ ? 1 /* L */ : 8 /* EN */) : 256 /* NI */;
            for (let j = i; j < end; j++)
                types[j] = replace;
            i = end - 1;
        }
        else if (type == 8 /* EN */ && prevStrong == 1 /* L */) {
            types[i] = 1 /* L */;
        }
        prev = type;
        if (type & 7 /* Strong */)
            prevStrong = type;
    }
    // N0. Process bracket pairs in an isolating run sequence
    // sequentially in the logical order of the text positions of the
    // opening paired brackets using the logic given below. Within this
    // scope, bidirectional types EN and AN are treated as R.
    for (let i = 0, sI = 0, context = 0, ch, br, type; i < len; i++) {
        // Keeps [startIndex, type, strongSeen] triples for each open
        // bracket on BracketStack.
        if (br = Brackets[ch = line.charCodeAt(i)]) {
            if (br < 0) { // Closing bracket
                for (let sJ = sI - 3; sJ >= 0; sJ -= 3) {
                    if (BracketStack[sJ + 1] == -br) {
                        let flags = BracketStack[sJ + 2];
                        let type = (flags & 2 /* EmbedInside */) ? outerType :
                            !(flags & 4 /* OppositeInside */) ? 0 :
                                (flags & 1 /* OppositeBefore */) ? oppositeType : outerType;
                        if (type)
                            types[i] = types[BracketStack[sJ]] = type;
                        sI = sJ;
                        break;
                    }
                }
            }
            else if (BracketStack.length == 189 /* MaxDepth */) {
                break;
            }
            else {
                BracketStack[sI++] = i;
                BracketStack[sI++] = ch;
                BracketStack[sI++] = context;
            }
        }
        else if ((type = types[i]) == 2 /* R */ || type == 1 /* L */) {
            let embed = type == outerType;
            context = embed ? 0 : 1 /* OppositeBefore */;
            for (let sJ = sI - 3; sJ >= 0; sJ -= 3) {
                let cur = BracketStack[sJ + 2];
                if (cur & 2 /* EmbedInside */)
                    break;
                if (embed) {
                    BracketStack[sJ + 2] |= 2 /* EmbedInside */;
                }
                else {
                    if (cur & 4 /* OppositeInside */)
                        break;
                    BracketStack[sJ + 2] |= 4 /* OppositeInside */;
                }
            }
        }
    }
    // N1. A sequence of neutrals takes the direction of the
    // surrounding strong text if the text on both sides has the same
    // direction. European and Arabic numbers act as if they were R in
    // terms of their influence on neutrals. Start-of-level-run (sor)
    // and end-of-level-run (eor) are used at level run boundaries.
    // N2. Any remaining neutrals take the embedding direction.
    // (Left after this: L, R, EN+AN)
    for (let i = 0; i < len; i++) {
        if (types[i] == 256 /* NI */) {
            let end = i + 1;
            while (end < len && types[end] == 256 /* NI */)
                end++;
            let beforeL = (i ? types[i - 1] : outerType) == 1 /* L */;
            let afterL = (end < len ? types[end] : outerType) == 1 /* L */;
            let replace = beforeL == afterL ? (beforeL ? 1 /* L */ : 2 /* R */) : outerType;
            for (let j = i; j < end; j++)
                types[j] = replace;
            i = end - 1;
        }
    }
    // Here we depart from the documented algorithm, in order to avoid
    // building up an actual levels array. Since there are only three
    // levels (0, 1, 2) in an implementation that doesn't take
    // explicit embedding into account, we can build up the order on
    // the fly, without following the level-based algorithm.
    let order = [];
    if (outerType == 1 /* L */) {
        for (let i = 0; i < len;) {
            let start = i, rtl = types[i++] != 1 /* L */;
            while (i < len && rtl == (types[i] != 1 /* L */))
                i++;
            if (rtl) {
                for (let j = i; j > start;) {
                    let end = j, l = types[--j] != 2 /* R */;
                    while (j > start && l == (types[j - 1] != 2 /* R */))
                        j--;
                    order.push(new BidiSpan(j, end, l ? 2 : 1));
                }
            }
            else {
                order.push(new BidiSpan(start, i, 0));
            }
        }
    }
    else {
        for (let i = 0; i < len;) {
            let start = i, rtl = types[i++] == 2 /* R */;
            while (i < len && rtl == (types[i] == 2 /* R */))
                i++;
            order.push(new BidiSpan(start, i, rtl ? 1 : 2));
        }
    }
    return order;
}
function trivialOrder(length) {
    return [new BidiSpan(0, length, 0)];
}
let movedOver = "";
function moveVisually(line, order, dir, start, forward) {
    var _a;
    let startIndex = start.head - line.from, spanI = -1;
    if (startIndex == 0) {
        if (!forward || !line.length)
            return null;
        if (order[0].level != dir) {
            startIndex = order[0].side(false, dir);
            spanI = 0;
        }
    }
    else if (startIndex == line.length) {
        if (forward)
            return null;
        let last = order[order.length - 1];
        if (last.level != dir) {
            startIndex = last.side(true, dir);
            spanI = order.length - 1;
        }
    }
    if (spanI < 0)
        spanI = BidiSpan.find(order, startIndex, (_a = start.bidiLevel) !== null && _a !== void 0 ? _a : -1, start.assoc);
    let span = order[spanI];
    // End of span. (But not end of line--that was checked for above.)
    if (startIndex == span.side(forward, dir)) {
        span = order[spanI += forward ? 1 : -1];
        startIndex = span.side(!forward, dir);
    }
    let indexForward = forward == (span.dir == dir);
    let nextIndex = findClusterBreak(line.text, startIndex, indexForward);
    movedOver = line.text.slice(Math.min(startIndex, nextIndex), Math.max(startIndex, nextIndex));
    if (nextIndex != span.side(forward, dir))
        return EditorSelection.cursor(nextIndex + line.from, indexForward ? -1 : 1, span.level);
    let nextSpan = spanI == (forward ? order.length - 1 : 0) ? null : order[spanI + (forward ? 1 : -1)];
    if (!nextSpan && span.level != dir)
        return EditorSelection.cursor(forward ? line.to : line.from, forward ? -1 : 1, dir);
    if (nextSpan && nextSpan.level < span.level)
        return EditorSelection.cursor(nextSpan.side(!forward, dir) + line.from, forward ? 1 : -1, nextSpan.level);
    return EditorSelection.cursor(nextIndex + line.from, forward ? -1 : 1, span.level);
}

const LineBreakPlaceholder = "\uffff";
class DOMReader {
    constructor(points, state) {
        this.points = points;
        this.text = "";
        this.lineSeparator = state.facet(EditorState.lineSeparator);
    }
    append(text) {
        this.text += text;
    }
    lineBreak() {
        this.text += LineBreakPlaceholder;
    }
    readRange(start, end) {
        if (!start)
            return this;
        let parent = start.parentNode;
        for (let cur = start;;) {
            this.findPointBefore(parent, cur);
            this.readNode(cur);
            let next = cur.nextSibling;
            if (next == end)
                break;
            let view = ContentView.get(cur), nextView = ContentView.get(next);
            if (view && nextView ? view.breakAfter :
                (view ? view.breakAfter : isBlockElement(cur)) ||
                    (isBlockElement(next) && (cur.nodeName != "BR" || cur.cmIgnore)))
                this.lineBreak();
            cur = next;
        }
        this.findPointBefore(parent, end);
        return this;
    }
    readTextNode(node) {
        let text = node.nodeValue;
        for (let point of this.points)
            if (point.node == node)
                point.pos = this.text.length + Math.min(point.offset, text.length);
        for (let off = 0, re = this.lineSeparator ? null : /\r\n?|\n/g;;) {
            let nextBreak = -1, breakSize = 1, m;
            if (this.lineSeparator) {
                nextBreak = text.indexOf(this.lineSeparator, off);
                breakSize = this.lineSeparator.length;
            }
            else if (m = re.exec(text)) {
                nextBreak = m.index;
                breakSize = m[0].length;
            }
            this.append(text.slice(off, nextBreak < 0 ? text.length : nextBreak));
            if (nextBreak < 0)
                break;
            this.lineBreak();
            if (breakSize > 1)
                for (let point of this.points)
                    if (point.node == node && point.pos > this.text.length)
                        point.pos -= breakSize - 1;
            off = nextBreak + breakSize;
        }
    }
    readNode(node) {
        if (node.cmIgnore)
            return;
        let view = ContentView.get(node);
        let fromView = view && view.overrideDOMText;
        if (fromView != null) {
            this.findPointInside(node, fromView.length);
            for (let i = fromView.iter(); !i.next().done;) {
                if (i.lineBreak)
                    this.lineBreak();
                else
                    this.append(i.value);
            }
        }
        else if (node.nodeType == 3) {
            this.readTextNode(node);
        }
        else if (node.nodeName == "BR") {
            if (node.nextSibling)
                this.lineBreak();
        }
        else if (node.nodeType == 1) {
            this.readRange(node.firstChild, null);
        }
    }
    findPointBefore(node, next) {
        for (let point of this.points)
            if (point.node == node && node.childNodes[point.offset] == next)
                point.pos = this.text.length;
    }
    findPointInside(node, maxLen) {
        for (let point of this.points)
            if (node.nodeType == 3 ? point.node == node : node.contains(point.node))
                point.pos = this.text.length + Math.min(maxLen, point.offset);
    }
}
function isBlockElement(node) {
    return node.nodeType == 1 && /^(DIV|P|LI|UL|OL|BLOCKQUOTE|DD|DT|H\d|SECTION|PRE)$/.test(node.nodeName);
}
class DOMPoint {
    constructor(node, offset) {
        this.node = node;
        this.offset = offset;
        this.pos = -1;
    }
}

class DocView extends ContentView {
    constructor(view) {
        super();
        this.view = view;
        this.compositionDeco = Decoration.none;
        this.decorations = [];
        this.pluginDecorationLength = 0;
        // Track a minimum width for the editor. When measuring sizes in
        // measureVisibleLineHeights, this is updated to point at the width
        // of a given element and its extent in the document. When a change
        // happens in that range, these are reset. That way, once we've seen
        // a line/element of a given length, we keep the editor wide enough
        // to fit at least that element, until it is changed, at which point
        // we forget it again.
        this.minWidth = 0;
        this.minWidthFrom = 0;
        this.minWidthTo = 0;
        // Track whether the DOM selection was set in a lossy way, so that
        // we don't mess it up when reading it back it
        this.impreciseAnchor = null;
        this.impreciseHead = null;
        this.forceSelection = false;
        // Used by the resize observer to ignore resizes that we caused
        // ourselves
        this.lastUpdate = Date.now();
        this.setDOM(view.contentDOM);
        this.children = [new LineView];
        this.children[0].setParent(this);
        this.updateDeco();
        this.updateInner([new ChangedRange(0, 0, 0, view.state.doc.length)], 0);
    }
    get root() { return this.view.root; }
    get editorView() { return this.view; }
    get length() { return this.view.state.doc.length; }
    // Update the document view to a given state. scrollIntoView can be
    // used as a hint to compute a new viewport that includes that
    // position, if we know the editor is going to scroll that position
    // into view.
    update(update) {
        let changedRanges = update.changedRanges;
        if (this.minWidth > 0 && changedRanges.length) {
            if (!changedRanges.every(({ fromA, toA }) => toA < this.minWidthFrom || fromA > this.minWidthTo)) {
                this.minWidth = this.minWidthFrom = this.minWidthTo = 0;
            }
            else {
                this.minWidthFrom = update.changes.mapPos(this.minWidthFrom, 1);
                this.minWidthTo = update.changes.mapPos(this.minWidthTo, 1);
            }
        }
        if (this.view.inputState.composing < 0)
            this.compositionDeco = Decoration.none;
        else if (update.transactions.length || this.dirty)
            this.compositionDeco = computeCompositionDeco(this.view, update.changes);
        // When the DOM nodes around the selection are moved to another
        // parent, Chrome sometimes reports a different selection through
        // getSelection than the one that it actually shows to the user.
        // This forces a selection update when lines are joined to work
        // around that. Issue #54
        if ((browser.ie || browser.chrome) && !this.compositionDeco.size && update &&
            update.state.doc.lines != update.startState.doc.lines)
            this.forceSelection = true;
        let prevDeco = this.decorations, deco = this.updateDeco();
        let decoDiff = findChangedDeco(prevDeco, deco, update.changes);
        changedRanges = ChangedRange.extendWithRanges(changedRanges, decoDiff);
        if (this.dirty == 0 /* Not */ && changedRanges.length == 0) {
            return false;
        }
        else {
            this.updateInner(changedRanges, update.startState.doc.length);
            if (update.transactions.length)
                this.lastUpdate = Date.now();
            return true;
        }
    }
    // Used by update and the constructor do perform the actual DOM
    // update
    updateInner(changes, oldLength) {
        this.view.viewState.mustMeasureContent = true;
        this.updateChildren(changes, oldLength);
        let { observer } = this.view;
        observer.ignore(() => {
            // Lock the height during redrawing, since Chrome sometimes
            // messes with the scroll position during DOM mutation (though
            // no relayout is triggered and I cannot imagine how it can
            // recompute the scroll position without a layout)
            this.dom.style.height = this.view.viewState.contentHeight + "px";
            this.dom.style.minWidth = this.minWidth ? this.minWidth + "px" : "";
            // Chrome will sometimes, when DOM mutations occur directly
            // around the selection, get confused and report a different
            // selection from the one it displays (issue #218). This tries
            // to detect that situation.
            let track = browser.chrome || browser.ios ? { node: observer.selectionRange.focusNode, written: false } : undefined;
            this.sync(track);
            this.dirty = 0 /* Not */;
            if (track && (track.written || observer.selectionRange.focusNode != track.node))
                this.forceSelection = true;
            this.dom.style.height = "";
        });
        let gaps = [];
        if (this.view.viewport.from || this.view.viewport.to < this.view.state.doc.length)
            for (let child of this.children)
                if (child instanceof BlockWidgetView && child.widget instanceof BlockGapWidget)
                    gaps.push(child.dom);
        observer.updateGaps(gaps);
    }
    updateChildren(changes, oldLength) {
        let cursor = this.childCursor(oldLength);
        for (let i = changes.length - 1;; i--) {
            let next = i >= 0 ? changes[i] : null;
            if (!next)
                break;
            let { fromA, toA, fromB, toB } = next;
            let { content, breakAtStart, openStart, openEnd } = ContentBuilder.build(this.view.state.doc, fromB, toB, this.decorations, this.pluginDecorationLength);
            let { i: toI, off: toOff } = cursor.findPos(toA, 1);
            let { i: fromI, off: fromOff } = cursor.findPos(fromA, -1);
            replaceRange(this, fromI, fromOff, toI, toOff, content, breakAtStart, openStart, openEnd);
        }
    }
    // Sync the DOM selection to this.state.selection
    updateSelection(mustRead = false, fromPointer = false) {
        if (mustRead)
            this.view.observer.readSelectionRange();
        if (!(fromPointer || this.mayControlSelection()) ||
            browser.ios && this.view.inputState.rapidCompositionStart)
            return;
        let force = this.forceSelection;
        this.forceSelection = false;
        let main = this.view.state.selection.main;
        // FIXME need to handle the case where the selection falls inside a block range
        let anchor = this.domAtPos(main.anchor);
        let head = main.empty ? anchor : this.domAtPos(main.head);
        // Always reset on Firefox when next to an uneditable node to
        // avoid invisible cursor bugs (#111)
        if (browser.gecko && main.empty && betweenUneditable(anchor)) {
            let dummy = document.createTextNode("");
            this.view.observer.ignore(() => anchor.node.insertBefore(dummy, anchor.node.childNodes[anchor.offset] || null));
            anchor = head = new DOMPos(dummy, 0);
            force = true;
        }
        let domSel = this.view.observer.selectionRange;
        // If the selection is already here, or in an equivalent position, don't touch it
        if (force || !domSel.focusNode ||
            !isEquivalentPosition(anchor.node, anchor.offset, domSel.anchorNode, domSel.anchorOffset) ||
            !isEquivalentPosition(head.node, head.offset, domSel.focusNode, domSel.focusOffset)) {
            this.view.observer.ignore(() => {
                // Chrome Android will hide the virtual keyboard when tapping
                // inside an uneditable node, and not bring it back when we
                // move the cursor to its proper position. This tries to
                // restore the keyboard by cycling focus.
                if (browser.android && browser.chrome && this.dom.contains(domSel.focusNode) &&
                    inUneditable(domSel.focusNode, this.dom)) {
                    this.dom.blur();
                    this.dom.focus({ preventScroll: true });
                }
                let rawSel = getSelection(this.root);
                if (main.empty) {
                    // Work around https://bugzilla.mozilla.org/show_bug.cgi?id=1612076
                    if (browser.gecko) {
                        let nextTo = nextToUneditable(anchor.node, anchor.offset);
                        if (nextTo && nextTo != (1 /* Before */ | 2 /* After */)) {
                            let text = nearbyTextNode(anchor.node, anchor.offset, nextTo == 1 /* Before */ ? 1 : -1);
                            if (text)
                                anchor = new DOMPos(text, nextTo == 1 /* Before */ ? 0 : text.nodeValue.length);
                        }
                    }
                    rawSel.collapse(anchor.node, anchor.offset);
                    if (main.bidiLevel != null && domSel.cursorBidiLevel != null)
                        domSel.cursorBidiLevel = main.bidiLevel;
                }
                else if (rawSel.extend) {
                    // Selection.extend can be used to create an 'inverted' selection
                    // (one where the focus is before the anchor), but not all
                    // browsers support it yet.
                    rawSel.collapse(anchor.node, anchor.offset);
                    rawSel.extend(head.node, head.offset);
                }
                else {
                    // Primitive (IE) way
                    let range = document.createRange();
                    if (main.anchor > main.head)
                        [anchor, head] = [head, anchor];
                    range.setEnd(head.node, head.offset);
                    range.setStart(anchor.node, anchor.offset);
                    rawSel.removeAllRanges();
                    rawSel.addRange(range);
                }
            });
            this.view.observer.setSelectionRange(anchor, head);
        }
        this.impreciseAnchor = anchor.precise ? null : new DOMPos(domSel.anchorNode, domSel.anchorOffset);
        this.impreciseHead = head.precise ? null : new DOMPos(domSel.focusNode, domSel.focusOffset);
    }
    enforceCursorAssoc() {
        if (this.compositionDeco.size)
            return;
        let cursor = this.view.state.selection.main;
        let sel = getSelection(this.root);
        if (!cursor.empty || !cursor.assoc || !sel.modify)
            return;
        let line = LineView.find(this, cursor.head);
        if (!line)
            return;
        let lineStart = line.posAtStart;
        if (cursor.head == lineStart || cursor.head == lineStart + line.length)
            return;
        let before = this.coordsAt(cursor.head, -1), after = this.coordsAt(cursor.head, 1);
        if (!before || !after || before.bottom > after.top)
            return;
        let dom = this.domAtPos(cursor.head + cursor.assoc);
        sel.collapse(dom.node, dom.offset);
        sel.modify("move", cursor.assoc < 0 ? "forward" : "backward", "lineboundary");
    }
    mayControlSelection() {
        return this.view.state.facet(editable) ? this.root.activeElement == this.dom
            : hasSelection(this.dom, this.view.observer.selectionRange);
    }
    nearest(dom) {
        for (let cur = dom; cur;) {
            let domView = ContentView.get(cur);
            if (domView && domView.rootView == this)
                return domView;
            cur = cur.parentNode;
        }
        return null;
    }
    posFromDOM(node, offset) {
        let view = this.nearest(node);
        if (!view)
            throw new RangeError("Trying to find position for a DOM position outside of the document");
        return view.localPosFromDOM(node, offset) + view.posAtStart;
    }
    domAtPos(pos) {
        let { i, off } = this.childCursor().findPos(pos, -1);
        for (; i < this.children.length - 1;) {
            let child = this.children[i];
            if (off < child.length || child instanceof LineView)
                break;
            i++;
            off = 0;
        }
        return this.children[i].domAtPos(off);
    }
    coordsAt(pos, side) {
        for (let off = this.length, i = this.children.length - 1;; i--) {
            let child = this.children[i], start = off - child.breakAfter - child.length;
            if (pos > start ||
                (pos == start && child.type != BlockType.WidgetBefore && child.type != BlockType.WidgetAfter &&
                    (!i || side == 2 || this.children[i - 1].breakAfter ||
                        (this.children[i - 1].type == BlockType.WidgetBefore && side > -2))))
                return child.coordsAt(pos - start, side);
            off = start;
        }
    }
    measureVisibleLineHeights() {
        let result = [], { from, to } = this.view.viewState.viewport;
        let contentWidth = this.view.contentDOM.clientWidth;
        let isWider = contentWidth > Math.max(this.view.scrollDOM.clientWidth, this.minWidth) + 1;
        let widest = -1;
        for (let pos = 0, i = 0; i < this.children.length; i++) {
            let child = this.children[i], end = pos + child.length;
            if (end > to)
                break;
            if (pos >= from) {
                let childRect = child.dom.getBoundingClientRect();
                result.push(childRect.height);
                if (isWider) {
                    let last = child.dom.lastChild;
                    let rects = last ? clientRectsFor(last) : [];
                    if (rects.length) {
                        let rect = rects[rects.length - 1];
                        let width = this.view.textDirection == Direction.LTR ? rect.right - childRect.left
                            : childRect.right - rect.left;
                        if (width > widest) {
                            widest = width;
                            this.minWidth = contentWidth;
                            this.minWidthFrom = pos;
                            this.minWidthTo = end;
                        }
                    }
                }
            }
            pos = end + child.breakAfter;
        }
        return result;
    }
    measureTextSize() {
        for (let child of this.children) {
            if (child instanceof LineView) {
                let measure = child.measureTextSize();
                if (measure)
                    return measure;
            }
        }
        // If no workable line exists, force a layout of a measurable element
        let dummy = document.createElement("div"), lineHeight, charWidth;
        dummy.className = "cm-line";
        dummy.textContent = "abc def ghi jkl mno pqr stu";
        this.view.observer.ignore(() => {
            this.dom.appendChild(dummy);
            let rect = clientRectsFor(dummy.firstChild)[0];
            lineHeight = dummy.getBoundingClientRect().height;
            charWidth = rect ? rect.width / 27 : 7;
            dummy.remove();
        });
        return { lineHeight, charWidth };
    }
    childCursor(pos = this.length) {
        // Move back to start of last element when possible, so that
        // `ChildCursor.findPos` doesn't have to deal with the edge case
        // of being after the last element.
        let i = this.children.length;
        if (i)
            pos -= this.children[--i].length;
        return new ChildCursor(this.children, pos, i);
    }
    computeBlockGapDeco() {
        let deco = [], vs = this.view.viewState;
        for (let pos = 0, i = 0;; i++) {
            let next = i == vs.viewports.length ? null : vs.viewports[i];
            let end = next ? next.from - 1 : this.length;
            if (end > pos) {
                let height = vs.lineBlockAt(end).bottom - vs.lineBlockAt(pos).top;
                deco.push(Decoration.replace({ widget: new BlockGapWidget(height), block: true, inclusive: true }).range(pos, end));
            }
            if (!next)
                break;
            pos = next.to + 1;
        }
        return Decoration.set(deco);
    }
    updateDeco() {
        let pluginDecorations = this.view.pluginField(PluginField.decorations);
        this.pluginDecorationLength = pluginDecorations.length;
        return this.decorations = [
            ...pluginDecorations,
            ...this.view.state.facet(decorations),
            this.compositionDeco,
            this.computeBlockGapDeco(),
            this.view.viewState.lineGapDeco
        ];
    }
    scrollIntoView(target) {
        let { range } = target;
        let rect = this.coordsAt(range.head, range.empty ? range.assoc : range.head > range.anchor ? -1 : 1), other;
        if (!rect)
            return;
        if (!range.empty && (other = this.coordsAt(range.anchor, range.anchor > range.head ? -1 : 1)))
            rect = { left: Math.min(rect.left, other.left), top: Math.min(rect.top, other.top),
                right: Math.max(rect.right, other.right), bottom: Math.max(rect.bottom, other.bottom) };
        let mLeft = 0, mRight = 0, mTop = 0, mBottom = 0;
        for (let margins of this.view.pluginField(PluginField.scrollMargins))
            if (margins) {
                let { left, right, top, bottom } = margins;
                if (left != null)
                    mLeft = Math.max(mLeft, left);
                if (right != null)
                    mRight = Math.max(mRight, right);
                if (top != null)
                    mTop = Math.max(mTop, top);
                if (bottom != null)
                    mBottom = Math.max(mBottom, bottom);
            }
        let targetRect = {
            left: rect.left - mLeft, top: rect.top - mTop,
            right: rect.right + mRight, bottom: rect.bottom + mBottom
        };
        scrollRectIntoView(this.view.scrollDOM, targetRect, range.head < range.anchor ? -1 : 1, target.x, target.y, target.xMargin, target.yMargin, this.view.textDirection == Direction.LTR);
    }
}
function betweenUneditable(pos) {
    return pos.node.nodeType == 1 && pos.node.firstChild &&
        (pos.offset == 0 || pos.node.childNodes[pos.offset - 1].contentEditable == "false") &&
        (pos.offset == pos.node.childNodes.length || pos.node.childNodes[pos.offset].contentEditable == "false");
}
class BlockGapWidget extends WidgetType {
    constructor(height) {
        super();
        this.height = height;
    }
    toDOM() {
        let elt = document.createElement("div");
        this.updateDOM(elt);
        return elt;
    }
    eq(other) { return other.height == this.height; }
    updateDOM(elt) {
        elt.style.height = this.height + "px";
        return true;
    }
    get estimatedHeight() { return this.height; }
}
function compositionSurroundingNode(view) {
    let sel = view.observer.selectionRange;
    let textNode = sel.focusNode && nearbyTextNode(sel.focusNode, sel.focusOffset, 0);
    if (!textNode)
        return null;
    let cView = view.docView.nearest(textNode);
    if (!cView)
        return null;
    if (cView instanceof LineView) {
        let topNode = textNode;
        while (topNode.parentNode != cView.dom)
            topNode = topNode.parentNode;
        let prev = topNode.previousSibling;
        while (prev && !ContentView.get(prev))
            prev = prev.previousSibling;
        let pos = prev ? ContentView.get(prev).posAtEnd : cView.posAtStart;
        return { from: pos, to: pos, node: topNode, text: textNode };
    }
    else {
        for (;;) {
            let { parent } = cView;
            if (!parent)
                return null;
            if (parent instanceof LineView)
                break;
            cView = parent;
        }
        let from = cView.posAtStart;
        return { from, to: from + cView.length, node: cView.dom, text: textNode };
    }
}
function computeCompositionDeco(view, changes) {
    let surrounding = compositionSurroundingNode(view);
    if (!surrounding)
        return Decoration.none;
    let { from, to, node, text: textNode } = surrounding;
    let newFrom = changes.mapPos(from, 1), newTo = Math.max(newFrom, changes.mapPos(to, -1));
    let { state } = view, text = node.nodeType == 3 ? node.nodeValue :
        new DOMReader([], state).readRange(node.firstChild, null).text;
    if (newTo - newFrom < text.length) {
        if (state.doc.sliceString(newFrom, Math.min(state.doc.length, newFrom + text.length), LineBreakPlaceholder) == text)
            newTo = newFrom + text.length;
        else if (state.doc.sliceString(Math.max(0, newTo - text.length), newTo, LineBreakPlaceholder) == text)
            newFrom = newTo - text.length;
        else
            return Decoration.none;
    }
    else if (state.doc.sliceString(newFrom, newTo, LineBreakPlaceholder) != text) {
        return Decoration.none;
    }
    let topView = ContentView.get(node);
    if (topView instanceof CompositionView)
        topView = topView.widget.topView;
    else if (topView)
        topView.parent = null;
    return Decoration.set(Decoration.replace({ widget: new CompositionWidget(node, textNode, topView) }).range(newFrom, newTo));
}
class CompositionWidget extends WidgetType {
    constructor(top, text, topView) {
        super();
        this.top = top;
        this.text = text;
        this.topView = topView;
    }
    eq(other) { return this.top == other.top && this.text == other.text; }
    toDOM() { return this.top; }
    ignoreEvent() { return false; }
    get customView() { return CompositionView; }
}
function nearbyTextNode(node, offset, side) {
    for (;;) {
        if (node.nodeType == 3)
            return node;
        if (node.nodeType == 1 && offset > 0 && side <= 0) {
            node = node.childNodes[offset - 1];
            offset = maxOffset(node);
        }
        else if (node.nodeType == 1 && offset < node.childNodes.length && side >= 0) {
            node = node.childNodes[offset];
            offset = 0;
        }
        else {
            return null;
        }
    }
}
function nextToUneditable(node, offset) {
    if (node.nodeType != 1)
        return 0;
    return (offset && node.childNodes[offset - 1].contentEditable == "false" ? 1 /* Before */ : 0) |
        (offset < node.childNodes.length && node.childNodes[offset].contentEditable == "false" ? 2 /* After */ : 0);
}
class DecorationComparator$1 {
    constructor() {
        this.changes = [];
    }
    compareRange(from, to) { addRange(from, to, this.changes); }
    comparePoint(from, to) { addRange(from, to, this.changes); }
}
function findChangedDeco(a, b, diff) {
    let comp = new DecorationComparator$1;
    RangeSet.compare(a, b, diff, comp);
    return comp.changes;
}
function inUneditable(node, inside) {
    for (let cur = node; cur && cur != inside; cur = cur.assignedSlot || cur.parentNode) {
        if (cur.nodeType == 1 && cur.contentEditable == 'false') {
            return true;
        }
    }
    return false;
}

function groupAt(state, pos, bias = 1) {
    let categorize = state.charCategorizer(pos);
    let line = state.doc.lineAt(pos), linePos = pos - line.from;
    if (line.length == 0)
        return EditorSelection.cursor(pos);
    if (linePos == 0)
        bias = 1;
    else if (linePos == line.length)
        bias = -1;
    let from = linePos, to = linePos;
    if (bias < 0)
        from = findClusterBreak(line.text, linePos, false);
    else
        to = findClusterBreak(line.text, linePos);
    let cat = categorize(line.text.slice(from, to));
    while (from > 0) {
        let prev = findClusterBreak(line.text, from, false);
        if (categorize(line.text.slice(prev, from)) != cat)
            break;
        from = prev;
    }
    while (to < line.length) {
        let next = findClusterBreak(line.text, to);
        if (categorize(line.text.slice(to, next)) != cat)
            break;
        to = next;
    }
    return EditorSelection.range(from + line.from, to + line.from);
}
// Search the DOM for the {node, offset} position closest to the given
// coordinates. Very inefficient and crude, but can usually be avoided
// by calling caret(Position|Range)FromPoint instead.
function getdx(x, rect) {
    return rect.left > x ? rect.left - x : Math.max(0, x - rect.right);
}
function getdy(y, rect) {
    return rect.top > y ? rect.top - y : Math.max(0, y - rect.bottom);
}
function yOverlap(a, b) {
    return a.top < b.bottom - 1 && a.bottom > b.top + 1;
}
function upTop(rect, top) {
    return top < rect.top ? { top, left: rect.left, right: rect.right, bottom: rect.bottom } : rect;
}
function upBot(rect, bottom) {
    return bottom > rect.bottom ? { top: rect.top, left: rect.left, right: rect.right, bottom } : rect;
}
function domPosAtCoords(parent, x, y) {
    let closest, closestRect, closestX, closestY;
    let above, below, aboveRect, belowRect;
    for (let child = parent.firstChild; child; child = child.nextSibling) {
        let rects = clientRectsFor(child);
        for (let i = 0; i < rects.length; i++) {
            let rect = rects[i];
            if (closestRect && yOverlap(closestRect, rect))
                rect = upTop(upBot(rect, closestRect.bottom), closestRect.top);
            let dx = getdx(x, rect), dy = getdy(y, rect);
            if (dx == 0 && dy == 0)
                return child.nodeType == 3 ? domPosInText(child, x, y) : domPosAtCoords(child, x, y);
            if (!closest || closestY > dy || closestY == dy && closestX > dx) {
                closest = child;
                closestRect = rect;
                closestX = dx;
                closestY = dy;
            }
            if (dx == 0) {
                if (y > rect.bottom && (!aboveRect || aboveRect.bottom < rect.bottom)) {
                    above = child;
                    aboveRect = rect;
                }
                else if (y < rect.top && (!belowRect || belowRect.top > rect.top)) {
                    below = child;
                    belowRect = rect;
                }
            }
            else if (aboveRect && yOverlap(aboveRect, rect)) {
                aboveRect = upBot(aboveRect, rect.bottom);
            }
            else if (belowRect && yOverlap(belowRect, rect)) {
                belowRect = upTop(belowRect, rect.top);
            }
        }
    }
    if (aboveRect && aboveRect.bottom >= y) {
        closest = above;
        closestRect = aboveRect;
    }
    else if (belowRect && belowRect.top <= y) {
        closest = below;
        closestRect = belowRect;
    }
    if (!closest)
        return { node: parent, offset: 0 };
    let clipX = Math.max(closestRect.left, Math.min(closestRect.right, x));
    if (closest.nodeType == 3)
        return domPosInText(closest, clipX, y);
    if (!closestX && closest.contentEditable == "true")
        return domPosAtCoords(closest, clipX, y);
    let offset = Array.prototype.indexOf.call(parent.childNodes, closest) +
        (x >= (closestRect.left + closestRect.right) / 2 ? 1 : 0);
    return { node: parent, offset };
}
function domPosInText(node, x, y) {
    let len = node.nodeValue.length;
    let closestOffset = -1, closestDY = 1e9, generalSide = 0;
    for (let i = 0; i < len; i++) {
        let rects = textRange(node, i, i + 1).getClientRects();
        for (let j = 0; j < rects.length; j++) {
            let rect = rects[j];
            if (rect.top == rect.bottom)
                continue;
            if (!generalSide)
                generalSide = x - rect.left;
            let dy = (rect.top > y ? rect.top - y : y - rect.bottom) - 1;
            if (rect.left - 1 <= x && rect.right + 1 >= x && dy < closestDY) {
                let right = x >= (rect.left + rect.right) / 2, after = right;
                if (browser.chrome || browser.gecko) {
                    // Check for RTL on browsers that support getting client
                    // rects for empty ranges.
                    let rectBefore = textRange(node, i).getBoundingClientRect();
                    if (rectBefore.left == rect.right)
                        after = !right;
                }
                if (dy <= 0)
                    return { node, offset: i + (after ? 1 : 0) };
                closestOffset = i + (after ? 1 : 0);
                closestDY = dy;
            }
        }
    }
    return { node, offset: closestOffset > -1 ? closestOffset : generalSide > 0 ? node.nodeValue.length : 0 };
}
function posAtCoords(view, { x, y }, precise, bias = -1) {
    var _a;
    let content = view.contentDOM.getBoundingClientRect(), docTop = content.top + view.viewState.paddingTop;
    let block, { docHeight } = view.viewState;
    let yOffset = y - docTop;
    if (yOffset < 0)
        return 0;
    if (yOffset > docHeight)
        return view.state.doc.length;
    // Scan for a text block near the queried y position
    for (let halfLine = view.defaultLineHeight / 2, bounced = false;;) {
        block = view.elementAtHeight(yOffset);
        if (block.type == BlockType.Text)
            break;
        for (;;) {
            // Move the y position out of this block
            yOffset = bias > 0 ? block.bottom + halfLine : block.top - halfLine;
            if (yOffset >= 0 && yOffset <= docHeight)
                break;
            // If the document consists entirely of replaced widgets, we
            // won't find a text block, so return 0
            if (bounced)
                return precise ? null : 0;
            bounced = true;
            bias = -bias;
        }
    }
    y = docTop + yOffset;
    let lineStart = block.from;
    // If this is outside of the rendered viewport, we can't determine a position
    if (lineStart < view.viewport.from)
        return view.viewport.from == 0 ? 0 : precise ? null : posAtCoordsImprecise(view, content, block, x, y);
    if (lineStart > view.viewport.to)
        return view.viewport.to == view.state.doc.length ? view.state.doc.length :
            precise ? null : posAtCoordsImprecise(view, content, block, x, y);
    // Prefer ShadowRootOrDocument.elementFromPoint if present, fall back to document if not
    let doc = view.dom.ownerDocument;
    let root = view.root.elementFromPoint ? view.root : doc;
    let element = root.elementFromPoint(x, y);
    if (element && !view.contentDOM.contains(element))
        element = null;
    // If the element is unexpected, clip x at the sides of the content area and try again
    if (!element) {
        x = Math.max(content.left + 1, Math.min(content.right - 1, x));
        element = root.elementFromPoint(x, y);
        if (element && !view.contentDOM.contains(element))
            element = null;
    }
    // There's visible editor content under the point, so we can try
    // using caret(Position|Range)FromPoint as a shortcut
    let node, offset = -1;
    if (element && ((_a = view.docView.nearest(element)) === null || _a === void 0 ? void 0 : _a.isEditable) != false) {
        if (doc.caretPositionFromPoint) {
            let pos = doc.caretPositionFromPoint(x, y);
            if (pos)
                ({ offsetNode: node, offset } = pos);
        }
        else if (doc.caretRangeFromPoint) {
            let range = doc.caretRangeFromPoint(x, y);
            if (range) {
                ({ startContainer: node, startOffset: offset } = range);
                if (browser.safari && isSuspiciousCaretResult(node, offset, x))
                    node = undefined;
            }
        }
    }
    // No luck, do our own (potentially expensive) search
    if (!node || !view.docView.dom.contains(node)) {
        let line = LineView.find(view.docView, lineStart);
        if (!line)
            return yOffset > block.top + block.height / 2 ? block.to : block.from;
        ({ node, offset } = domPosAtCoords(line.dom, x, y));
    }
    return view.docView.posFromDOM(node, offset);
}
function posAtCoordsImprecise(view, contentRect, block, x, y) {
    let into = Math.round((x - contentRect.left) * view.defaultCharacterWidth);
    if (view.lineWrapping && block.height > view.defaultLineHeight * 1.5) {
        let line = Math.floor((y - block.top) / view.defaultLineHeight);
        into += line * view.viewState.heightOracle.lineLength;
    }
    let content = view.state.sliceDoc(block.from, block.to);
    return block.from + findColumn(content, into, view.state.tabSize);
}
// In case of a high line height, Safari's caretRangeFromPoint treats
// the space between lines as belonging to the last character of the
// line before. This is used to detect such a result so that it can be
// ignored (issue #401).
function isSuspiciousCaretResult(node, offset, x) {
    let len;
    if (node.nodeType != 3 || offset != (len = node.nodeValue.length))
        return false;
    for (let next = node.nextSibling; next; next = next.nextSibling)
        if (next.nodeType != 1 || next.nodeName != "BR")
            return false;
    return textRange(node, len - 1, len).getBoundingClientRect().left > x;
}
function moveToLineBoundary(view, start, forward, includeWrap) {
    let line = view.state.doc.lineAt(start.head);
    let coords = !includeWrap || !view.lineWrapping ? null
        : view.coordsAtPos(start.assoc < 0 && start.head > line.from ? start.head - 1 : start.head);
    if (coords) {
        let editorRect = view.dom.getBoundingClientRect();
        let pos = view.posAtCoords({ x: forward == (view.textDirection == Direction.LTR) ? editorRect.right - 1 : editorRect.left + 1,
            y: (coords.top + coords.bottom) / 2 });
        if (pos != null)
            return EditorSelection.cursor(pos, forward ? -1 : 1);
    }
    let lineView = LineView.find(view.docView, start.head);
    let end = lineView ? (forward ? lineView.posAtEnd : lineView.posAtStart) : (forward ? line.to : line.from);
    return EditorSelection.cursor(end, forward ? -1 : 1);
}
function moveByChar(view, start, forward, by) {
    let line = view.state.doc.lineAt(start.head), spans = view.bidiSpans(line);
    for (let cur = start, check = null;;) {
        let next = moveVisually(line, spans, view.textDirection, cur, forward), char = movedOver;
        if (!next) {
            if (line.number == (forward ? view.state.doc.lines : 1))
                return cur;
            char = "\n";
            line = view.state.doc.line(line.number + (forward ? 1 : -1));
            spans = view.bidiSpans(line);
            next = EditorSelection.cursor(forward ? line.from : line.to);
        }
        if (!check) {
            if (!by)
                return next;
            check = by(char);
        }
        else if (!check(char)) {
            return cur;
        }
        cur = next;
    }
}
function byGroup(view, pos, start) {
    let categorize = view.state.charCategorizer(pos);
    let cat = categorize(start);
    return (next) => {
        let nextCat = categorize(next);
        if (cat == CharCategory.Space)
            cat = nextCat;
        return cat == nextCat;
    };
}
function moveVertically(view, start, forward, distance) {
    let startPos = start.head, dir = forward ? 1 : -1;
    if (startPos == (forward ? view.state.doc.length : 0))
        return EditorSelection.cursor(startPos, start.assoc);
    let goal = start.goalColumn, startY;
    let rect = view.contentDOM.getBoundingClientRect();
    let startCoords = view.coordsAtPos(startPos), docTop = view.documentTop;
    if (startCoords) {
        if (goal == null)
            goal = startCoords.left - rect.left;
        startY = dir < 0 ? startCoords.top : startCoords.bottom;
    }
    else {
        let line = view.viewState.lineBlockAt(startPos - docTop);
        if (goal == null)
            goal = Math.min(rect.right - rect.left, view.defaultCharacterWidth * (startPos - line.from));
        startY = (dir < 0 ? line.top : line.bottom) + docTop;
    }
    let resolvedGoal = rect.left + goal;
    let dist = distance !== null && distance !== void 0 ? distance : (view.defaultLineHeight >> 1);
    for (let extra = 0;; extra += 10) {
        let curY = startY + (dist + extra) * dir;
        let pos = posAtCoords(view, { x: resolvedGoal, y: curY }, false, dir);
        if (curY < rect.top || curY > rect.bottom || (dir < 0 ? pos < startPos : pos > startPos))
            return EditorSelection.cursor(pos, start.assoc, undefined, goal);
    }
}
function skipAtoms(view, oldPos, pos) {
    let atoms = view.pluginField(PluginField.atomicRanges);
    for (;;) {
        let moved = false;
        for (let set of atoms) {
            set.between(pos.from - 1, pos.from + 1, (from, to, value) => {
                if (pos.from > from && pos.from < to) {
                    pos = oldPos.from > pos.from ? EditorSelection.cursor(from, 1) : EditorSelection.cursor(to, -1);
                    moved = true;
                }
            });
        }
        if (!moved)
            return pos;
    }
}

// This will also be where dragging info and such goes
class InputState {
    constructor(view) {
        this.lastKeyCode = 0;
        this.lastKeyTime = 0;
        // On iOS, some keys need to have their default behavior happen
        // (after which we retroactively handle them and reset the DOM) to
        // avoid messing up the virtual keyboard state.
        this.pendingIOSKey = undefined;
        this.lastSelectionOrigin = null;
        this.lastSelectionTime = 0;
        this.lastEscPress = 0;
        this.lastContextMenu = 0;
        this.scrollHandlers = [];
        this.registeredEvents = [];
        this.customHandlers = [];
        // -1 means not in a composition. Otherwise, this counts the number
        // of changes made during the composition. The count is used to
        // avoid treating the start state of the composition, before any
        // changes have been made, as part of the composition.
        this.composing = -1;
        // Tracks whether the next change should be marked as starting the
        // composition (null means no composition, true means next is the
        // first, false means first has already been marked for this
        // composition)
        this.compositionFirstChange = null;
        this.compositionEndedAt = 0;
        this.rapidCompositionStart = false;
        this.mouseSelection = null;
        for (let type in handlers) {
            let handler = handlers[type];
            view.contentDOM.addEventListener(type, (event) => {
                if (type == "keydown" && this.keydown(view, event))
                    return;
                if (!eventBelongsToEditor(view, event) || this.ignoreDuringComposition(event))
                    return;
                if (this.mustFlushObserver(event))
                    view.observer.forceFlush();
                if (this.runCustomHandlers(type, view, event))
                    event.preventDefault();
                else
                    handler(view, event);
            });
            this.registeredEvents.push(type);
        }
        this.notifiedFocused = view.hasFocus;
        this.ensureHandlers(view);
        // On Safari adding an input event handler somehow prevents an
        // issue where the composition vanishes when you press enter.
        if (browser.safari)
            view.contentDOM.addEventListener("input", () => null);
    }
    setSelectionOrigin(origin) {
        this.lastSelectionOrigin = origin;
        this.lastSelectionTime = Date.now();
    }
    ensureHandlers(view) {
        let handlers = this.customHandlers = view.pluginField(domEventHandlers);
        for (let set of handlers) {
            for (let type in set.handlers)
                if (this.registeredEvents.indexOf(type) < 0 && type != "scroll") {
                    this.registeredEvents.push(type);
                    view.contentDOM.addEventListener(type, (event) => {
                        if (!eventBelongsToEditor(view, event))
                            return;
                        if (this.runCustomHandlers(type, view, event))
                            event.preventDefault();
                    });
                }
        }
    }
    runCustomHandlers(type, view, event) {
        for (let set of this.customHandlers) {
            let handler = set.handlers[type];
            if (handler) {
                try {
                    if (handler.call(set.plugin, event, view) || event.defaultPrevented)
                        return true;
                }
                catch (e) {
                    logException(view.state, e);
                }
            }
        }
        return false;
    }
    runScrollHandlers(view, event) {
        for (let set of this.customHandlers) {
            let handler = set.handlers.scroll;
            if (handler) {
                try {
                    handler.call(set.plugin, event, view);
                }
                catch (e) {
                    logException(view.state, e);
                }
            }
        }
    }
    keydown(view, event) {
        // Must always run, even if a custom handler handled the event
        this.lastKeyCode = event.keyCode;
        this.lastKeyTime = Date.now();
        if (this.screenKeyEvent(view, event))
            return true;
        // Chrome for Android usually doesn't fire proper key events, but
        // occasionally does, usually surrounded by a bunch of complicated
        // composition changes. When an enter or backspace key event is
        // seen, hold off on handling DOM events for a bit, and then
        // dispatch it.
        if (browser.android && browser.chrome && !event.synthetic &&
            (event.keyCode == 13 || event.keyCode == 8)) {
            view.observer.delayAndroidKey(event.key, event.keyCode);
            return true;
        }
        // Prevent the default behavior of Enter on iOS makes the
        // virtual keyboard get stuck in the wrong (lowercase)
        // state. So we let it go through, and then, in
        // applyDOMChange, notify key handlers of it and reset to
        // the state they produce.
        let pending;
        if (browser.ios && (pending = PendingKeys.find(key => key.keyCode == event.keyCode)) &&
            !(event.ctrlKey || event.altKey || event.metaKey) && !event.synthetic) {
            this.pendingIOSKey = pending;
            setTimeout(() => this.flushIOSKey(view), 250);
            return true;
        }
        return false;
    }
    flushIOSKey(view) {
        let key = this.pendingIOSKey;
        if (!key)
            return false;
        this.pendingIOSKey = undefined;
        return dispatchKey(view.contentDOM, key.key, key.keyCode);
    }
    ignoreDuringComposition(event) {
        if (!/^key/.test(event.type))
            return false;
        if (this.composing > 0)
            return true;
        // See https://www.stum.de/2016/06/24/handling-ime-events-in-javascript/.
        // On some input method editors (IMEs), the Enter key is used to
        // confirm character selection. On Safari, when Enter is pressed,
        // compositionend and keydown events are sometimes emitted in the
        // wrong order. The key event should still be ignored, even when
        // it happens after the compositionend event.
        if (browser.safari && Date.now() - this.compositionEndedAt < 500) {
            this.compositionEndedAt = 0;
            return true;
        }
        return false;
    }
    screenKeyEvent(view, event) {
        let protectedTab = event.keyCode == 9 && Date.now() < this.lastEscPress + 2000;
        if (event.keyCode == 27)
            this.lastEscPress = Date.now();
        else if (modifierCodes.indexOf(event.keyCode) < 0)
            this.lastEscPress = 0;
        return protectedTab;
    }
    mustFlushObserver(event) {
        return (event.type == "keydown" && event.keyCode != 229) ||
            event.type == "compositionend" && !browser.ios;
    }
    startMouseSelection(mouseSelection) {
        if (this.mouseSelection)
            this.mouseSelection.destroy();
        this.mouseSelection = mouseSelection;
    }
    update(update) {
        if (this.mouseSelection)
            this.mouseSelection.update(update);
        if (update.transactions.length)
            this.lastKeyCode = this.lastSelectionTime = 0;
    }
    destroy() {
        if (this.mouseSelection)
            this.mouseSelection.destroy();
    }
}
const PendingKeys = [
    { key: "Backspace", keyCode: 8, inputType: "deleteContentBackward" },
    { key: "Enter", keyCode: 13, inputType: "insertParagraph" },
    { key: "Delete", keyCode: 46, inputType: "deleteContentForward" }
];
// Key codes for modifier keys
const modifierCodes = [16, 17, 18, 20, 91, 92, 224, 225];
class MouseSelection {
    constructor(view, startEvent, style, mustSelect) {
        this.view = view;
        this.style = style;
        this.mustSelect = mustSelect;
        this.lastEvent = startEvent;
        let doc = view.contentDOM.ownerDocument;
        doc.addEventListener("mousemove", this.move = this.move.bind(this));
        doc.addEventListener("mouseup", this.up = this.up.bind(this));
        this.extend = startEvent.shiftKey;
        this.multiple = view.state.facet(EditorState.allowMultipleSelections) && addsSelectionRange(view, startEvent);
        this.dragMove = dragMovesSelection(view, startEvent);
        this.dragging = isInPrimarySelection(view, startEvent) && getClickType(startEvent) == 1 ? null : false;
        // When clicking outside of the selection, immediately apply the
        // effect of starting the selection
        if (this.dragging === false) {
            startEvent.preventDefault();
            this.select(startEvent);
        }
    }
    move(event) {
        if (event.buttons == 0)
            return this.destroy();
        if (this.dragging !== false)
            return;
        this.select(this.lastEvent = event);
    }
    up(event) {
        if (this.dragging == null)
            this.select(this.lastEvent);
        if (!this.dragging)
            event.preventDefault();
        this.destroy();
    }
    destroy() {
        let doc = this.view.contentDOM.ownerDocument;
        doc.removeEventListener("mousemove", this.move);
        doc.removeEventListener("mouseup", this.up);
        this.view.inputState.mouseSelection = null;
    }
    select(event) {
        let selection = this.style.get(event, this.extend, this.multiple);
        if (this.mustSelect || !selection.eq(this.view.state.selection) ||
            selection.main.assoc != this.view.state.selection.main.assoc)
            this.view.dispatch({
                selection,
                userEvent: "select.pointer",
                scrollIntoView: true
            });
        this.mustSelect = false;
    }
    update(update) {
        if (update.docChanged && this.dragging)
            this.dragging = this.dragging.map(update.changes);
        if (this.style.update(update))
            setTimeout(() => this.select(this.lastEvent), 20);
    }
}
function addsSelectionRange(view, event) {
    let facet = view.state.facet(clickAddsSelectionRange);
    return facet.length ? facet[0](event) : browser.mac ? event.metaKey : event.ctrlKey;
}
function dragMovesSelection(view, event) {
    let facet = view.state.facet(dragMovesSelection$1);
    return facet.length ? facet[0](event) : browser.mac ? !event.altKey : !event.ctrlKey;
}
function isInPrimarySelection(view, event) {
    let { main } = view.state.selection;
    if (main.empty)
        return false;
    // On boundary clicks, check whether the coordinates are inside the
    // selection's client rectangles
    let sel = getSelection(view.root);
    if (sel.rangeCount == 0)
        return true;
    let rects = sel.getRangeAt(0).getClientRects();
    for (let i = 0; i < rects.length; i++) {
        let rect = rects[i];
        if (rect.left <= event.clientX && rect.right >= event.clientX &&
            rect.top <= event.clientY && rect.bottom >= event.clientY)
            return true;
    }
    return false;
}
function eventBelongsToEditor(view, event) {
    if (!event.bubbles)
        return true;
    if (event.defaultPrevented)
        return false;
    for (let node = event.target, cView; node != view.contentDOM; node = node.parentNode)
        if (!node || node.nodeType == 11 || ((cView = ContentView.get(node)) && cView.ignoreEvent(event)))
            return false;
    return true;
}
const handlers = /*@__PURE__*/Object.create(null);
// This is very crude, but unfortunately both these browsers _pretend_
// that they have a clipboard API—all the objects and methods are
// there, they just don't work, and they are hard to test.
const brokenClipboardAPI = (browser.ie && browser.ie_version < 15) ||
    (browser.ios && browser.webkit_version < 604);
function capturePaste(view) {
    let parent = view.dom.parentNode;
    if (!parent)
        return;
    let target = parent.appendChild(document.createElement("textarea"));
    target.style.cssText = "position: fixed; left: -10000px; top: 10px";
    target.focus();
    setTimeout(() => {
        view.focus();
        target.remove();
        doPaste(view, target.value);
    }, 50);
}
function doPaste(view, input) {
    let { state } = view, changes, i = 1, text = state.toText(input);
    let byLine = text.lines == state.selection.ranges.length;
    let linewise = lastLinewiseCopy != null && state.selection.ranges.every(r => r.empty) && lastLinewiseCopy == text.toString();
    if (linewise) {
        let lastLine = -1;
        changes = state.changeByRange(range => {
            let line = state.doc.lineAt(range.from);
            if (line.from == lastLine)
                return { range };
            lastLine = line.from;
            let insert = state.toText((byLine ? text.line(i++).text : input) + state.lineBreak);
            return { changes: { from: line.from, insert },
                range: EditorSelection.cursor(range.from + insert.length) };
        });
    }
    else if (byLine) {
        changes = state.changeByRange(range => {
            let line = text.line(i++);
            return { changes: { from: range.from, to: range.to, insert: line.text },
                range: EditorSelection.cursor(range.from + line.length) };
        });
    }
    else {
        changes = state.replaceSelection(text);
    }
    view.dispatch(changes, {
        userEvent: "input.paste",
        scrollIntoView: true
    });
}
handlers.keydown = (view, event) => {
    view.inputState.setSelectionOrigin("select");
};
let lastTouch = 0;
handlers.touchstart = (view, e) => {
    lastTouch = Date.now();
    view.inputState.setSelectionOrigin("select.pointer");
};
handlers.touchmove = view => {
    view.inputState.setSelectionOrigin("select.pointer");
};
handlers.mousedown = (view, event) => {
    view.observer.flush();
    if (lastTouch > Date.now() - 2000 && getClickType(event) == 1)
        return; // Ignore touch interaction
    let style = null;
    for (let makeStyle of view.state.facet(mouseSelectionStyle)) {
        style = makeStyle(view, event);
        if (style)
            break;
    }
    if (!style && event.button == 0)
        style = basicMouseSelection(view, event);
    if (style) {
        let mustFocus = view.root.activeElement != view.contentDOM;
        if (mustFocus)
            view.observer.ignore(() => focusPreventScroll(view.contentDOM));
        view.inputState.startMouseSelection(new MouseSelection(view, event, style, mustFocus));
    }
};
function rangeForClick(view, pos, bias, type) {
    if (type == 1) { // Single click
        return EditorSelection.cursor(pos, bias);
    }
    else if (type == 2) { // Double click
        return groupAt(view.state, pos, bias);
    }
    else { // Triple click
        let visual = LineView.find(view.docView, pos), line = view.state.doc.lineAt(visual ? visual.posAtEnd : pos);
        let from = visual ? visual.posAtStart : line.from, to = visual ? visual.posAtEnd : line.to;
        if (to < view.state.doc.length && to == line.to)
            to++;
        return EditorSelection.range(from, to);
    }
}
let insideY = (y, rect) => y >= rect.top && y <= rect.bottom;
let inside = (x, y, rect) => insideY(y, rect) && x >= rect.left && x <= rect.right;
// Try to determine, for the given coordinates, associated with the
// given position, whether they are related to the element before or
// the element after the position.
function findPositionSide(view, pos, x, y) {
    let line = LineView.find(view.docView, pos);
    if (!line)
        return 1;
    let off = pos - line.posAtStart;
    // Line boundaries point into the line
    if (off == 0)
        return 1;
    if (off == line.length)
        return -1;
    // Positions on top of an element point at that element
    let before = line.coordsAt(off, -1);
    if (before && inside(x, y, before))
        return -1;
    let after = line.coordsAt(off, 1);
    if (after && inside(x, y, after))
        return 1;
    // This is probably a line wrap point. Pick before if the point is
    // beside it.
    return before && insideY(y, before) ? -1 : 1;
}
function queryPos(view, event) {
    let pos = view.posAtCoords({ x: event.clientX, y: event.clientY }, false);
    return { pos, bias: findPositionSide(view, pos, event.clientX, event.clientY) };
}
const BadMouseDetail = browser.ie && browser.ie_version <= 11;
let lastMouseDown = null, lastMouseDownCount = 0, lastMouseDownTime = 0;
function getClickType(event) {
    if (!BadMouseDetail)
        return event.detail;
    let last = lastMouseDown, lastTime = lastMouseDownTime;
    lastMouseDown = event;
    lastMouseDownTime = Date.now();
    return lastMouseDownCount = !last || (lastTime > Date.now() - 400 && Math.abs(last.clientX - event.clientX) < 2 &&
        Math.abs(last.clientY - event.clientY) < 2) ? (lastMouseDownCount + 1) % 3 : 1;
}
function basicMouseSelection(view, event) {
    let start = queryPos(view, event), type = getClickType(event);
    let startSel = view.state.selection;
    let last = start, lastEvent = event;
    return {
        update(update) {
            if (update.docChanged) {
                if (start)
                    start.pos = update.changes.mapPos(start.pos);
                startSel = startSel.map(update.changes);
                lastEvent = null;
            }
        },
        get(event, extend, multiple) {
            let cur;
            if (lastEvent && event.clientX == lastEvent.clientX && event.clientY == lastEvent.clientY)
                cur = last;
            else {
                cur = last = queryPos(view, event);
                lastEvent = event;
            }
            if (!cur || !start)
                return startSel;
            let range = rangeForClick(view, cur.pos, cur.bias, type);
            if (start.pos != cur.pos && !extend) {
                let startRange = rangeForClick(view, start.pos, start.bias, type);
                let from = Math.min(startRange.from, range.from), to = Math.max(startRange.to, range.to);
                range = from < range.from ? EditorSelection.range(from, to) : EditorSelection.range(to, from);
            }
            if (extend)
                return startSel.replaceRange(startSel.main.extend(range.from, range.to));
            else if (multiple)
                return startSel.addRange(range);
            else
                return EditorSelection.create([range]);
        }
    };
}
handlers.dragstart = (view, event) => {
    let { selection: { main } } = view.state;
    let { mouseSelection } = view.inputState;
    if (mouseSelection)
        mouseSelection.dragging = main;
    if (event.dataTransfer) {
        event.dataTransfer.setData("Text", view.state.sliceDoc(main.from, main.to));
        event.dataTransfer.effectAllowed = "copyMove";
    }
};
function dropText(view, event, text, direct) {
    if (!text)
        return;
    let dropPos = view.posAtCoords({ x: event.clientX, y: event.clientY }, false);
    event.preventDefault();
    let { mouseSelection } = view.inputState;
    let del = direct && mouseSelection && mouseSelection.dragging && mouseSelection.dragMove ?
        { from: mouseSelection.dragging.from, to: mouseSelection.dragging.to } : null;
    let ins = { from: dropPos, insert: text };
    let changes = view.state.changes(del ? [del, ins] : ins);
    view.focus();
    view.dispatch({
        changes,
        selection: { anchor: changes.mapPos(dropPos, -1), head: changes.mapPos(dropPos, 1) },
        userEvent: del ? "move.drop" : "input.drop"
    });
}
handlers.drop = (view, event) => {
    if (!event.dataTransfer)
        return;
    if (view.state.readOnly)
        return event.preventDefault();
    let files = event.dataTransfer.files;
    if (files && files.length) { // For a file drop, read the file's text.
        event.preventDefault();
        let text = Array(files.length), read = 0;
        let finishFile = () => {
            if (++read == files.length)
                dropText(view, event, text.filter(s => s != null).join(view.state.lineBreak), false);
        };
        for (let i = 0; i < files.length; i++) {
            let reader = new FileReader;
            reader.onerror = finishFile;
            reader.onload = () => {
                if (!/[\x00-\x08\x0e-\x1f]{2}/.test(reader.result))
                    text[i] = reader.result;
                finishFile();
            };
            reader.readAsText(files[i]);
        }
    }
    else {
        dropText(view, event, event.dataTransfer.getData("Text"), true);
    }
};
handlers.paste = (view, event) => {
    if (view.state.readOnly)
        return event.preventDefault();
    view.observer.flush();
    let data = brokenClipboardAPI ? null : event.clipboardData;
    if (data) {
        doPaste(view, data.getData("text/plain"));
        event.preventDefault();
    }
    else {
        capturePaste(view);
    }
};
function captureCopy(view, text) {
    // The extra wrapper is somehow necessary on IE/Edge to prevent the
    // content from being mangled when it is put onto the clipboard
    let parent = view.dom.parentNode;
    if (!parent)
        return;
    let target = parent.appendChild(document.createElement("textarea"));
    target.style.cssText = "position: fixed; left: -10000px; top: 10px";
    target.value = text;
    target.focus();
    target.selectionEnd = text.length;
    target.selectionStart = 0;
    setTimeout(() => {
        target.remove();
        view.focus();
    }, 50);
}
function copiedRange(state) {
    let content = [], ranges = [], linewise = false;
    for (let range of state.selection.ranges)
        if (!range.empty) {
            content.push(state.sliceDoc(range.from, range.to));
            ranges.push(range);
        }
    if (!content.length) {
        // Nothing selected, do a line-wise copy
        let upto = -1;
        for (let { from } of state.selection.ranges) {
            let line = state.doc.lineAt(from);
            if (line.number > upto) {
                content.push(line.text);
                ranges.push({ from: line.from, to: Math.min(state.doc.length, line.to + 1) });
            }
            upto = line.number;
        }
        linewise = true;
    }
    return { text: content.join(state.lineBreak), ranges, linewise };
}
let lastLinewiseCopy = null;
handlers.copy = handlers.cut = (view, event) => {
    let { text, ranges, linewise } = copiedRange(view.state);
    if (!text && !linewise)
        return;
    lastLinewiseCopy = linewise ? text : null;
    let data = brokenClipboardAPI ? null : event.clipboardData;
    if (data) {
        event.preventDefault();
        data.clearData();
        data.setData("text/plain", text);
    }
    else {
        captureCopy(view, text);
    }
    if (event.type == "cut" && !view.state.readOnly)
        view.dispatch({
            changes: ranges,
            scrollIntoView: true,
            userEvent: "delete.cut"
        });
};
handlers.focus = handlers.blur = view => {
    setTimeout(() => {
        if (view.hasFocus != view.inputState.notifiedFocused)
            view.update([]);
    }, 10);
};
handlers.beforeprint = view => {
    view.viewState.printing = true;
    view.requestMeasure();
    setTimeout(() => {
        view.viewState.printing = false;
        view.requestMeasure();
    }, 2000);
};
function forceClearComposition(view, rapid) {
    if (view.docView.compositionDeco.size) {
        view.inputState.rapidCompositionStart = rapid;
        try {
            view.update([]);
        }
        finally {
            view.inputState.rapidCompositionStart = false;
        }
    }
}
handlers.compositionstart = handlers.compositionupdate = view => {
    if (view.inputState.compositionFirstChange == null)
        view.inputState.compositionFirstChange = true;
    if (view.inputState.composing < 0) {
        // FIXME possibly set a timeout to clear it again on Android
        view.inputState.composing = 0;
        if (view.docView.compositionDeco.size) {
            view.observer.flush();
            forceClearComposition(view, true);
        }
    }
};
handlers.compositionend = view => {
    view.inputState.composing = -1;
    view.inputState.compositionEndedAt = Date.now();
    view.inputState.compositionFirstChange = null;
    setTimeout(() => {
        if (view.inputState.composing < 0)
            forceClearComposition(view, false);
    }, 50);
};
handlers.contextmenu = view => {
    view.inputState.lastContextMenu = Date.now();
};
handlers.beforeinput = (view, event) => {
    var _a;
    // Because Chrome Android doesn't fire useful key events, use
    // beforeinput to detect backspace (and possibly enter and delete,
    // but those usually don't even seem to fire beforeinput events at
    // the moment) and fake a key event for it.
    //
    // (preventDefault on beforeinput, though supported in the spec,
    // seems to do nothing at all on Chrome).
    let pending;
    if (browser.chrome && browser.android && (pending = PendingKeys.find(key => key.inputType == event.inputType))) {
        view.observer.delayAndroidKey(pending.key, pending.keyCode);
        if (pending.key == "Backspace" || pending.key == "Delete") {
            let startViewHeight = ((_a = window.visualViewport) === null || _a === void 0 ? void 0 : _a.height) || 0;
            setTimeout(() => {
                var _a;
                // Backspacing near uneditable nodes on Chrome Android sometimes
                // closes the virtual keyboard. This tries to crudely detect
                // that and refocus to get it back.
                if ((((_a = window.visualViewport) === null || _a === void 0 ? void 0 : _a.height) || 0) > startViewHeight + 10 && view.hasFocus) {
                    view.contentDOM.blur();
                    view.focus();
                }
            }, 100);
        }
    }
};

const wrappingWhiteSpace = ["pre-wrap", "normal", "pre-line", "break-spaces"];
class HeightOracle {
    constructor() {
        this.doc = Text.empty;
        this.lineWrapping = false;
        this.direction = Direction.LTR;
        this.heightSamples = {};
        this.lineHeight = 14;
        this.charWidth = 7;
        this.lineLength = 30;
        // Used to track, during updateHeight, if any actual heights changed
        this.heightChanged = false;
    }
    heightForGap(from, to) {
        let lines = this.doc.lineAt(to).number - this.doc.lineAt(from).number + 1;
        if (this.lineWrapping)
            lines += Math.ceil(((to - from) - (lines * this.lineLength * 0.5)) / this.lineLength);
        return this.lineHeight * lines;
    }
    heightForLine(length) {
        if (!this.lineWrapping)
            return this.lineHeight;
        let lines = 1 + Math.max(0, Math.ceil((length - this.lineLength) / (this.lineLength - 5)));
        return lines * this.lineHeight;
    }
    setDoc(doc) { this.doc = doc; return this; }
    mustRefreshForStyle(whiteSpace, direction) {
        return (wrappingWhiteSpace.indexOf(whiteSpace) > -1) != this.lineWrapping || this.direction != direction;
    }
    mustRefreshForHeights(lineHeights) {
        let newHeight = false;
        for (let i = 0; i < lineHeights.length; i++) {
            let h = lineHeights[i];
            if (h < 0) {
                i++;
            }
            else if (!this.heightSamples[Math.floor(h * 10)]) { // Round to .1 pixels
                newHeight = true;
                this.heightSamples[Math.floor(h * 10)] = true;
            }
        }
        return newHeight;
    }
    refresh(whiteSpace, direction, lineHeight, charWidth, lineLength, knownHeights) {
        let lineWrapping = wrappingWhiteSpace.indexOf(whiteSpace) > -1;
        let changed = Math.round(lineHeight) != Math.round(this.lineHeight) ||
            this.lineWrapping != lineWrapping ||
            this.direction != direction;
        this.lineWrapping = lineWrapping;
        this.direction = direction;
        this.lineHeight = lineHeight;
        this.charWidth = charWidth;
        this.lineLength = lineLength;
        if (changed) {
            this.heightSamples = {};
            for (let i = 0; i < knownHeights.length; i++) {
                let h = knownHeights[i];
                if (h < 0)
                    i++;
                else
                    this.heightSamples[Math.floor(h * 10)] = true;
            }
        }
        return changed;
    }
}
// This object is used by `updateHeight` to make DOM measurements
// arrive at the right nides. The `heights` array is a sequence of
// block heights, starting from position `from`.
class MeasuredHeights {
    constructor(from, heights) {
        this.from = from;
        this.heights = heights;
        this.index = 0;
    }
    get more() { return this.index < this.heights.length; }
}
/**
Record used to represent information about a block-level element
in the editor view.
*/
class BlockInfo {
    /**
    @internal
    */
    constructor(
    /**
    The start of the element in the document.
    */
    from, 
    /**
    The length of the element.
    */
    length, 
    /**
    The top position of the element (relative to the top of the
    document).
    */
    top, 
    /**
    Its height.
    */
    height, 
    /**
    The type of element this is. When querying lines, this may be
    an array of all the blocks that make up the line.
    */
    type) {
        this.from = from;
        this.length = length;
        this.top = top;
        this.height = height;
        this.type = type;
    }
    /**
    The end of the element as a document position.
    */
    get to() { return this.from + this.length; }
    /**
    The bottom position of the element.
    */
    get bottom() { return this.top + this.height; }
    /**
    @internal
    */
    join(other) {
        let detail = (Array.isArray(this.type) ? this.type : [this])
            .concat(Array.isArray(other.type) ? other.type : [other]);
        return new BlockInfo(this.from, this.length + other.length, this.top, this.height + other.height, detail);
    }
    /**
    FIXME remove on next breaking release @internal
    */
    moveY(offset) {
        return !offset ? this : new BlockInfo(this.from, this.length, this.top + offset, this.height, Array.isArray(this.type) ? this.type.map(b => b.moveY(offset)) : this.type);
    }
}
var QueryType = /*@__PURE__*/(function (QueryType) {
    QueryType[QueryType["ByPos"] = 0] = "ByPos";
    QueryType[QueryType["ByHeight"] = 1] = "ByHeight";
    QueryType[QueryType["ByPosNoHeight"] = 2] = "ByPosNoHeight";
return QueryType})(QueryType || (QueryType = {}));
const Epsilon = 1e-3;
class HeightMap {
    constructor(length, // The number of characters covered
    height, // Height of this part of the document
    flags = 2 /* Outdated */) {
        this.length = length;
        this.height = height;
        this.flags = flags;
    }
    get outdated() { return (this.flags & 2 /* Outdated */) > 0; }
    set outdated(value) { this.flags = (value ? 2 /* Outdated */ : 0) | (this.flags & ~2 /* Outdated */); }
    setHeight(oracle, height) {
        if (this.height != height) {
            if (Math.abs(this.height - height) > Epsilon)
                oracle.heightChanged = true;
            this.height = height;
        }
    }
    // Base case is to replace a leaf node, which simply builds a tree
    // from the new nodes and returns that (HeightMapBranch and
    // HeightMapGap override this to actually use from/to)
    replace(_from, _to, nodes) {
        return HeightMap.of(nodes);
    }
    // Again, these are base cases, and are overridden for branch and gap nodes.
    decomposeLeft(_to, result) { result.push(this); }
    decomposeRight(_from, result) { result.push(this); }
    applyChanges(decorations, oldDoc, oracle, changes) {
        let me = this;
        for (let i = changes.length - 1; i >= 0; i--) {
            let { fromA, toA, fromB, toB } = changes[i];
            let start = me.lineAt(fromA, QueryType.ByPosNoHeight, oldDoc, 0, 0);
            let end = start.to >= toA ? start : me.lineAt(toA, QueryType.ByPosNoHeight, oldDoc, 0, 0);
            toB += end.to - toA;
            toA = end.to;
            while (i > 0 && start.from <= changes[i - 1].toA) {
                fromA = changes[i - 1].fromA;
                fromB = changes[i - 1].fromB;
                i--;
                if (fromA < start.from)
                    start = me.lineAt(fromA, QueryType.ByPosNoHeight, oldDoc, 0, 0);
            }
            fromB += start.from - fromA;
            fromA = start.from;
            let nodes = NodeBuilder.build(oracle, decorations, fromB, toB);
            me = me.replace(fromA, toA, nodes);
        }
        return me.updateHeight(oracle, 0);
    }
    static empty() { return new HeightMapText(0, 0); }
    // nodes uses null values to indicate the position of line breaks.
    // There are never line breaks at the start or end of the array, or
    // two line breaks next to each other, and the array isn't allowed
    // to be empty (same restrictions as return value from the builder).
    static of(nodes) {
        if (nodes.length == 1)
            return nodes[0];
        let i = 0, j = nodes.length, before = 0, after = 0;
        for (;;) {
            if (i == j) {
                if (before > after * 2) {
                    let split = nodes[i - 1];
                    if (split.break)
                        nodes.splice(--i, 1, split.left, null, split.right);
                    else
                        nodes.splice(--i, 1, split.left, split.right);
                    j += 1 + split.break;
                    before -= split.size;
                }
                else if (after > before * 2) {
                    let split = nodes[j];
                    if (split.break)
                        nodes.splice(j, 1, split.left, null, split.right);
                    else
                        nodes.splice(j, 1, split.left, split.right);
                    j += 2 + split.break;
                    after -= split.size;
                }
                else {
                    break;
                }
            }
            else if (before < after) {
                let next = nodes[i++];
                if (next)
                    before += next.size;
            }
            else {
                let next = nodes[--j];
                if (next)
                    after += next.size;
            }
        }
        let brk = 0;
        if (nodes[i - 1] == null) {
            brk = 1;
            i--;
        }
        else if (nodes[i] == null) {
            brk = 1;
            j++;
        }
        return new HeightMapBranch(HeightMap.of(nodes.slice(0, i)), brk, HeightMap.of(nodes.slice(j)));
    }
}
HeightMap.prototype.size = 1;
class HeightMapBlock extends HeightMap {
    constructor(length, height, type) {
        super(length, height);
        this.type = type;
    }
    blockAt(_height, _doc, top, offset) {
        return new BlockInfo(offset, this.length, top, this.height, this.type);
    }
    lineAt(_value, _type, doc, top, offset) {
        return this.blockAt(0, doc, top, offset);
    }
    forEachLine(_from, _to, doc, top, offset, f) {
        f(this.blockAt(0, doc, top, offset));
    }
    updateHeight(oracle, offset = 0, _force = false, measured) {
        if (measured && measured.from <= offset && measured.more)
            this.setHeight(oracle, measured.heights[measured.index++]);
        this.outdated = false;
        return this;
    }
    toString() { return `block(${this.length})`; }
}
class HeightMapText extends HeightMapBlock {
    constructor(length, height) {
        super(length, height, BlockType.Text);
        this.collapsed = 0; // Amount of collapsed content in the line
        this.widgetHeight = 0; // Maximum inline widget height
    }
    replace(_from, _to, nodes) {
        let node = nodes[0];
        if (nodes.length == 1 && (node instanceof HeightMapText || node instanceof HeightMapGap && (node.flags & 4 /* SingleLine */)) &&
            Math.abs(this.length - node.length) < 10) {
            if (node instanceof HeightMapGap)
                node = new HeightMapText(node.length, this.height);
            else
                node.height = this.height;
            if (!this.outdated)
                node.outdated = false;
            return node;
        }
        else {
            return HeightMap.of(nodes);
        }
    }
    updateHeight(oracle, offset = 0, force = false, measured) {
        if (measured && measured.from <= offset && measured.more)
            this.setHeight(oracle, measured.heights[measured.index++]);
        else if (force || this.outdated)
            this.setHeight(oracle, Math.max(this.widgetHeight, oracle.heightForLine(this.length - this.collapsed)));
        this.outdated = false;
        return this;
    }
    toString() {
        return `line(${this.length}${this.collapsed ? -this.collapsed : ""}${this.widgetHeight ? ":" + this.widgetHeight : ""})`;
    }
}
class HeightMapGap extends HeightMap {
    constructor(length) { super(length, 0); }
    lines(doc, offset) {
        let firstLine = doc.lineAt(offset).number, lastLine = doc.lineAt(offset + this.length).number;
        return { firstLine, lastLine, lineHeight: this.height / (lastLine - firstLine + 1) };
    }
    blockAt(height, doc, top, offset) {
        let { firstLine, lastLine, lineHeight } = this.lines(doc, offset);
        let line = Math.max(0, Math.min(lastLine - firstLine, Math.floor((height - top) / lineHeight)));
        let { from, length } = doc.line(firstLine + line);
        return new BlockInfo(from, length, top + lineHeight * line, lineHeight, BlockType.Text);
    }
    lineAt(value, type, doc, top, offset) {
        if (type == QueryType.ByHeight)
            return this.blockAt(value, doc, top, offset);
        if (type == QueryType.ByPosNoHeight) {
            let { from, to } = doc.lineAt(value);
            return new BlockInfo(from, to - from, 0, 0, BlockType.Text);
        }
        let { firstLine, lineHeight } = this.lines(doc, offset);
        let { from, length, number } = doc.lineAt(value);
        return new BlockInfo(from, length, top + lineHeight * (number - firstLine), lineHeight, BlockType.Text);
    }
    forEachLine(from, to, doc, top, offset, f) {
        let { firstLine, lineHeight } = this.lines(doc, offset);
        for (let pos = Math.max(from, offset), end = Math.min(offset + this.length, to); pos <= end;) {
            let line = doc.lineAt(pos);
            if (pos == from)
                top += lineHeight * (line.number - firstLine);
            f(new BlockInfo(line.from, line.length, top, lineHeight, BlockType.Text));
            top += lineHeight;
            pos = line.to + 1;
        }
    }
    replace(from, to, nodes) {
        let after = this.length - to;
        if (after > 0) {
            let last = nodes[nodes.length - 1];
            if (last instanceof HeightMapGap)
                nodes[nodes.length - 1] = new HeightMapGap(last.length + after);
            else
                nodes.push(null, new HeightMapGap(after - 1));
        }
        if (from > 0) {
            let first = nodes[0];
            if (first instanceof HeightMapGap)
                nodes[0] = new HeightMapGap(from + first.length);
            else
                nodes.unshift(new HeightMapGap(from - 1), null);
        }
        return HeightMap.of(nodes);
    }
    decomposeLeft(to, result) {
        result.push(new HeightMapGap(to - 1), null);
    }
    decomposeRight(from, result) {
        result.push(null, new HeightMapGap(this.length - from - 1));
    }
    updateHeight(oracle, offset = 0, force = false, measured) {
        let end = offset + this.length;
        if (measured && measured.from <= offset + this.length && measured.more) {
            // Fill in part of this gap with measured lines. We know there
            // can't be widgets or collapsed ranges in those lines, because
            // they would already have been added to the heightmap (gaps
            // only contain plain text).
            let nodes = [], pos = Math.max(offset, measured.from), singleHeight = -1;
            let wasChanged = oracle.heightChanged;
            if (measured.from > offset)
                nodes.push(new HeightMapGap(measured.from - offset - 1).updateHeight(oracle, offset));
            while (pos <= end && measured.more) {
                let len = oracle.doc.lineAt(pos).length;
                if (nodes.length)
                    nodes.push(null);
                let height = measured.heights[measured.index++];
                if (singleHeight == -1)
                    singleHeight = height;
                else if (Math.abs(height - singleHeight) >= Epsilon)
                    singleHeight = -2;
                let line = new HeightMapText(len, height);
                line.outdated = false;
                nodes.push(line);
                pos += len + 1;
            }
            if (pos <= end)
                nodes.push(null, new HeightMapGap(end - pos).updateHeight(oracle, pos));
            let result = HeightMap.of(nodes);
            oracle.heightChanged = wasChanged || singleHeight < 0 || Math.abs(result.height - this.height) >= Epsilon ||
                Math.abs(singleHeight - this.lines(oracle.doc, offset).lineHeight) >= Epsilon;
            return result;
        }
        else if (force || this.outdated) {
            this.setHeight(oracle, oracle.heightForGap(offset, offset + this.length));
            this.outdated = false;
        }
        return this;
    }
    toString() { return `gap(${this.length})`; }
}
class HeightMapBranch extends HeightMap {
    constructor(left, brk, right) {
        super(left.length + brk + right.length, left.height + right.height, brk | (left.outdated || right.outdated ? 2 /* Outdated */ : 0));
        this.left = left;
        this.right = right;
        this.size = left.size + right.size;
    }
    get break() { return this.flags & 1 /* Break */; }
    blockAt(height, doc, top, offset) {
        let mid = top + this.left.height;
        return height < mid ? this.left.blockAt(height, doc, top, offset)
            : this.right.blockAt(height, doc, mid, offset + this.left.length + this.break);
    }
    lineAt(value, type, doc, top, offset) {
        let rightTop = top + this.left.height, rightOffset = offset + this.left.length + this.break;
        let left = type == QueryType.ByHeight ? value < rightTop : value < rightOffset;
        let base = left ? this.left.lineAt(value, type, doc, top, offset)
            : this.right.lineAt(value, type, doc, rightTop, rightOffset);
        if (this.break || (left ? base.to < rightOffset : base.from > rightOffset))
            return base;
        let subQuery = type == QueryType.ByPosNoHeight ? QueryType.ByPosNoHeight : QueryType.ByPos;
        if (left)
            return base.join(this.right.lineAt(rightOffset, subQuery, doc, rightTop, rightOffset));
        else
            return this.left.lineAt(rightOffset, subQuery, doc, top, offset).join(base);
    }
    forEachLine(from, to, doc, top, offset, f) {
        let rightTop = top + this.left.height, rightOffset = offset + this.left.length + this.break;
        if (this.break) {
            if (from < rightOffset)
                this.left.forEachLine(from, to, doc, top, offset, f);
            if (to >= rightOffset)
                this.right.forEachLine(from, to, doc, rightTop, rightOffset, f);
        }
        else {
            let mid = this.lineAt(rightOffset, QueryType.ByPos, doc, top, offset);
            if (from < mid.from)
                this.left.forEachLine(from, mid.from - 1, doc, top, offset, f);
            if (mid.to >= from && mid.from <= to)
                f(mid);
            if (to > mid.to)
                this.right.forEachLine(mid.to + 1, to, doc, rightTop, rightOffset, f);
        }
    }
    replace(from, to, nodes) {
        let rightStart = this.left.length + this.break;
        if (to < rightStart)
            return this.balanced(this.left.replace(from, to, nodes), this.right);
        if (from > this.left.length)
            return this.balanced(this.left, this.right.replace(from - rightStart, to - rightStart, nodes));
        let result = [];
        if (from > 0)
            this.decomposeLeft(from, result);
        let left = result.length;
        for (let node of nodes)
            result.push(node);
        if (from > 0)
            mergeGaps(result, left - 1);
        if (to < this.length) {
            let right = result.length;
            this.decomposeRight(to, result);
            mergeGaps(result, right);
        }
        return HeightMap.of(result);
    }
    decomposeLeft(to, result) {
        let left = this.left.length;
        if (to <= left)
            return this.left.decomposeLeft(to, result);
        result.push(this.left);
        if (this.break) {
            left++;
            if (to >= left)
                result.push(null);
        }
        if (to > left)
            this.right.decomposeLeft(to - left, result);
    }
    decomposeRight(from, result) {
        let left = this.left.length, right = left + this.break;
        if (from >= right)
            return this.right.decomposeRight(from - right, result);
        if (from < left)
            this.left.decomposeRight(from, result);
        if (this.break && from < right)
            result.push(null);
        result.push(this.right);
    }
    balanced(left, right) {
        if (left.size > 2 * right.size || right.size > 2 * left.size)
            return HeightMap.of(this.break ? [left, null, right] : [left, right]);
        this.left = left;
        this.right = right;
        this.height = left.height + right.height;
        this.outdated = left.outdated || right.outdated;
        this.size = left.size + right.size;
        this.length = left.length + this.break + right.length;
        return this;
    }
    updateHeight(oracle, offset = 0, force = false, measured) {
        let { left, right } = this, rightStart = offset + left.length + this.break, rebalance = null;
        if (measured && measured.from <= offset + left.length && measured.more)
            rebalance = left = left.updateHeight(oracle, offset, force, measured);
        else
            left.updateHeight(oracle, offset, force);
        if (measured && measured.from <= rightStart + right.length && measured.more)
            rebalance = right = right.updateHeight(oracle, rightStart, force, measured);
        else
            right.updateHeight(oracle, rightStart, force);
        if (rebalance)
            return this.balanced(left, right);
        this.height = this.left.height + this.right.height;
        this.outdated = false;
        return this;
    }
    toString() { return this.left + (this.break ? " " : "-") + this.right; }
}
function mergeGaps(nodes, around) {
    let before, after;
    if (nodes[around] == null &&
        (before = nodes[around - 1]) instanceof HeightMapGap &&
        (after = nodes[around + 1]) instanceof HeightMapGap)
        nodes.splice(around - 1, 3, new HeightMapGap(before.length + 1 + after.length));
}
const relevantWidgetHeight = 5;
class NodeBuilder {
    constructor(pos, oracle) {
        this.pos = pos;
        this.oracle = oracle;
        this.nodes = [];
        this.lineStart = -1;
        this.lineEnd = -1;
        this.covering = null;
        this.writtenTo = pos;
    }
    get isCovered() {
        return this.covering && this.nodes[this.nodes.length - 1] == this.covering;
    }
    span(_from, to) {
        if (this.lineStart > -1) {
            let end = Math.min(to, this.lineEnd), last = this.nodes[this.nodes.length - 1];
            if (last instanceof HeightMapText)
                last.length += end - this.pos;
            else if (end > this.pos || !this.isCovered)
                this.nodes.push(new HeightMapText(end - this.pos, -1));
            this.writtenTo = end;
            if (to > end) {
                this.nodes.push(null);
                this.writtenTo++;
                this.lineStart = -1;
            }
        }
        this.pos = to;
    }
    point(from, to, deco) {
        if (from < to || deco.heightRelevant) {
            let height = deco.widget ? deco.widget.estimatedHeight : 0;
            if (height < 0)
                height = this.oracle.lineHeight;
            let len = to - from;
            if (deco.block) {
                this.addBlock(new HeightMapBlock(len, height, deco.type));
            }
            else if (len || height >= relevantWidgetHeight) {
                this.addLineDeco(height, len);
            }
        }
        else if (to > from) {
            this.span(from, to);
        }
        if (this.lineEnd > -1 && this.lineEnd < this.pos)
            this.lineEnd = this.oracle.doc.lineAt(this.pos).to;
    }
    enterLine() {
        if (this.lineStart > -1)
            return;
        let { from, to } = this.oracle.doc.lineAt(this.pos);
        this.lineStart = from;
        this.lineEnd = to;
        if (this.writtenTo < from) {
            if (this.writtenTo < from - 1 || this.nodes[this.nodes.length - 1] == null)
                this.nodes.push(this.blankContent(this.writtenTo, from - 1));
            this.nodes.push(null);
        }
        if (this.pos > from)
            this.nodes.push(new HeightMapText(this.pos - from, -1));
        this.writtenTo = this.pos;
    }
    blankContent(from, to) {
        let gap = new HeightMapGap(to - from);
        if (this.oracle.doc.lineAt(from).to == to)
            gap.flags |= 4 /* SingleLine */;
        return gap;
    }
    ensureLine() {
        this.enterLine();
        let last = this.nodes.length ? this.nodes[this.nodes.length - 1] : null;
        if (last instanceof HeightMapText)
            return last;
        let line = new HeightMapText(0, -1);
        this.nodes.push(line);
        return line;
    }
    addBlock(block) {
        this.enterLine();
        if (block.type == BlockType.WidgetAfter && !this.isCovered)
            this.ensureLine();
        this.nodes.push(block);
        this.writtenTo = this.pos = this.pos + block.length;
        if (block.type != BlockType.WidgetBefore)
            this.covering = block;
    }
    addLineDeco(height, length) {
        let line = this.ensureLine();
        line.length += length;
        line.collapsed += length;
        line.widgetHeight = Math.max(line.widgetHeight, height);
        this.writtenTo = this.pos = this.pos + length;
    }
    finish(from) {
        let last = this.nodes.length == 0 ? null : this.nodes[this.nodes.length - 1];
        if (this.lineStart > -1 && !(last instanceof HeightMapText) && !this.isCovered)
            this.nodes.push(new HeightMapText(0, -1));
        else if (this.writtenTo < this.pos || last == null)
            this.nodes.push(this.blankContent(this.writtenTo, this.pos));
        let pos = from;
        for (let node of this.nodes) {
            if (node instanceof HeightMapText)
                node.updateHeight(this.oracle, pos);
            pos += node ? node.length : 1;
        }
        return this.nodes;
    }
    // Always called with a region that on both sides either stretches
    // to a line break or the end of the document.
    // The returned array uses null to indicate line breaks, but never
    // starts or ends in a line break, or has multiple line breaks next
    // to each other.
    static build(oracle, decorations, from, to) {
        let builder = new NodeBuilder(from, oracle);
        RangeSet.spans(decorations, from, to, builder, 0);
        return builder.finish(from);
    }
}
function heightRelevantDecoChanges(a, b, diff) {
    let comp = new DecorationComparator;
    RangeSet.compare(a, b, diff, comp, 0);
    return comp.changes;
}
class DecorationComparator {
    constructor() {
        this.changes = [];
    }
    compareRange() { }
    comparePoint(from, to, a, b) {
        if (from < to || a && a.heightRelevant || b && b.heightRelevant)
            addRange(from, to, this.changes, 5);
    }
}

function visiblePixelRange(dom, paddingTop) {
    let rect = dom.getBoundingClientRect();
    let left = Math.max(0, rect.left), right = Math.min(innerWidth, rect.right);
    let top = Math.max(0, rect.top), bottom = Math.min(innerHeight, rect.bottom);
    let body = dom.ownerDocument.body;
    for (let parent = dom.parentNode; parent && parent != body;) {
        if (parent.nodeType == 1) {
            let elt = parent;
            let style = window.getComputedStyle(elt);
            if ((elt.scrollHeight > elt.clientHeight || elt.scrollWidth > elt.clientWidth) &&
                style.overflow != "visible") {
                let parentRect = elt.getBoundingClientRect();
                left = Math.max(left, parentRect.left);
                right = Math.min(right, parentRect.right);
                top = Math.max(top, parentRect.top);
                bottom = Math.min(bottom, parentRect.bottom);
            }
            parent = style.position == "absolute" || style.position == "fixed" ? elt.offsetParent : elt.parentNode;
        }
        else if (parent.nodeType == 11) { // Shadow root
            parent = parent.host;
        }
        else {
            break;
        }
    }
    return { left: left - rect.left, right: Math.max(left, right) - rect.left,
        top: top - (rect.top + paddingTop), bottom: Math.max(top, bottom) - (rect.top + paddingTop) };
}
// Line gaps are placeholder widgets used to hide pieces of overlong
// lines within the viewport, as a kludge to keep the editor
// responsive when a ridiculously long line is loaded into it.
class LineGap {
    constructor(from, to, size) {
        this.from = from;
        this.to = to;
        this.size = size;
    }
    static same(a, b) {
        if (a.length != b.length)
            return false;
        for (let i = 0; i < a.length; i++) {
            let gA = a[i], gB = b[i];
            if (gA.from != gB.from || gA.to != gB.to || gA.size != gB.size)
                return false;
        }
        return true;
    }
    draw(wrapping) {
        return Decoration.replace({ widget: new LineGapWidget(this.size, wrapping) }).range(this.from, this.to);
    }
}
class LineGapWidget extends WidgetType {
    constructor(size, vertical) {
        super();
        this.size = size;
        this.vertical = vertical;
    }
    eq(other) { return other.size == this.size && other.vertical == this.vertical; }
    toDOM() {
        let elt = document.createElement("div");
        if (this.vertical) {
            elt.style.height = this.size + "px";
        }
        else {
            elt.style.width = this.size + "px";
            elt.style.height = "2px";
            elt.style.display = "inline-block";
        }
        return elt;
    }
    get estimatedHeight() { return this.vertical ? this.size : -1; }
}
class ViewState {
    constructor(state) {
        this.state = state;
        // These are contentDOM-local coordinates
        this.pixelViewport = { left: 0, right: window.innerWidth, top: 0, bottom: 0 };
        this.inView = true;
        this.paddingTop = 0;
        this.paddingBottom = 0;
        this.contentDOMWidth = 0;
        this.contentDOMHeight = 0;
        this.editorHeight = 0;
        this.editorWidth = 0;
        this.heightOracle = new HeightOracle;
        // See VP.MaxDOMHeight
        this.scaler = IdScaler;
        this.scrollTarget = null;
        // Briefly set to true when printing, to disable viewport limiting
        this.printing = false;
        // Flag set when editor content was redrawn, so that the next
        // measure stage knows it must read DOM layout
        this.mustMeasureContent = true;
        this.visibleRanges = [];
        // Cursor 'assoc' is only significant when the cursor is on a line
        // wrap point, where it must stick to the character that it is
        // associated with. Since browsers don't provide a reasonable
        // interface to set or query this, when a selection is set that
        // might cause this to be significant, this flag is set. The next
        // measure phase will check whether the cursor is on a line-wrapping
        // boundary and, if so, reset it to make sure it is positioned in
        // the right place.
        this.mustEnforceCursorAssoc = false;
        this.heightMap = HeightMap.empty().applyChanges(state.facet(decorations), Text.empty, this.heightOracle.setDoc(state.doc), [new ChangedRange(0, 0, 0, state.doc.length)]);
        this.viewport = this.getViewport(0, null);
        this.updateViewportLines();
        this.updateForViewport();
        this.lineGaps = this.ensureLineGaps([]);
        this.lineGapDeco = Decoration.set(this.lineGaps.map(gap => gap.draw(false)));
        this.computeVisibleRanges();
    }
    updateForViewport() {
        let viewports = [this.viewport], { main } = this.state.selection;
        for (let i = 0; i <= 1; i++) {
            let pos = i ? main.head : main.anchor;
            if (!viewports.some(({ from, to }) => pos >= from && pos <= to)) {
                let { from, to } = this.lineBlockAt(pos);
                viewports.push(new Viewport(from, to));
            }
        }
        this.viewports = viewports.sort((a, b) => a.from - b.from);
        this.scaler = this.heightMap.height <= 7000000 /* MaxDOMHeight */ ? IdScaler :
            new BigScaler(this.heightOracle.doc, this.heightMap, this.viewports);
    }
    updateViewportLines() {
        this.viewportLines = [];
        this.heightMap.forEachLine(this.viewport.from, this.viewport.to, this.state.doc, 0, 0, block => {
            this.viewportLines.push(this.scaler.scale == 1 ? block : scaleBlock(block, this.scaler));
        });
    }
    update(update, scrollTarget = null) {
        let prev = this.state;
        this.state = update.state;
        let newDeco = this.state.facet(decorations);
        let contentChanges = update.changedRanges;
        let heightChanges = ChangedRange.extendWithRanges(contentChanges, heightRelevantDecoChanges(update.startState.facet(decorations), newDeco, update ? update.changes : ChangeSet.empty(this.state.doc.length)));
        let prevHeight = this.heightMap.height;
        this.heightMap = this.heightMap.applyChanges(newDeco, prev.doc, this.heightOracle.setDoc(this.state.doc), heightChanges);
        if (this.heightMap.height != prevHeight)
            update.flags |= 2 /* Height */;
        let viewport = heightChanges.length ? this.mapViewport(this.viewport, update.changes) : this.viewport;
        if (scrollTarget && (scrollTarget.range.head < viewport.from || scrollTarget.range.head > viewport.to) ||
            !this.viewportIsAppropriate(viewport))
            viewport = this.getViewport(0, scrollTarget);
        let updateLines = !update.changes.empty || (update.flags & 2 /* Height */) ||
            viewport.from != this.viewport.from || viewport.to != this.viewport.to;
        this.viewport = viewport;
        this.updateForViewport();
        if (updateLines)
            this.updateViewportLines();
        if (this.lineGaps.length || this.viewport.to - this.viewport.from > 4000 /* DoubleMargin */)
            this.updateLineGaps(this.ensureLineGaps(this.mapLineGaps(this.lineGaps, update.changes)));
        update.flags |= this.computeVisibleRanges();
        if (scrollTarget)
            this.scrollTarget = scrollTarget;
        if (!this.mustEnforceCursorAssoc && update.selectionSet && update.view.lineWrapping &&
            update.state.selection.main.empty && update.state.selection.main.assoc)
            this.mustEnforceCursorAssoc = true;
    }
    measure(view) {
        let dom = view.contentDOM, style = window.getComputedStyle(dom);
        let oracle = this.heightOracle;
        let whiteSpace = style.whiteSpace, direction = style.direction == "rtl" ? Direction.RTL : Direction.LTR;
        let refresh = this.heightOracle.mustRefreshForStyle(whiteSpace, direction);
        let measureContent = refresh || this.mustMeasureContent || this.contentDOMHeight != dom.clientHeight;
        let result = 0, bias = 0;
        if (this.editorWidth != view.scrollDOM.clientWidth) {
            if (oracle.lineWrapping)
                measureContent = true;
            this.editorWidth = view.scrollDOM.clientWidth;
            result |= 8 /* Geometry */;
        }
        if (measureContent) {
            this.mustMeasureContent = false;
            this.contentDOMHeight = dom.clientHeight;
            // Vertical padding
            let paddingTop = parseInt(style.paddingTop) || 0, paddingBottom = parseInt(style.paddingBottom) || 0;
            if (this.paddingTop != paddingTop || this.paddingBottom != paddingBottom) {
                result |= 8 /* Geometry */;
                this.paddingTop = paddingTop;
                this.paddingBottom = paddingBottom;
            }
        }
        // Pixel viewport
        let pixelViewport = this.printing ? { top: -1e8, bottom: 1e8, left: -1e8, right: 1e8 }
            : visiblePixelRange(dom, this.paddingTop);
        let dTop = pixelViewport.top - this.pixelViewport.top, dBottom = pixelViewport.bottom - this.pixelViewport.bottom;
        this.pixelViewport = pixelViewport;
        let inView = this.pixelViewport.bottom > this.pixelViewport.top && this.pixelViewport.right > this.pixelViewport.left;
        if (inView != this.inView) {
            this.inView = inView;
            if (inView)
                measureContent = true;
        }
        if (!this.inView)
            return 0;
        let contentWidth = dom.clientWidth;
        if (this.contentDOMWidth != contentWidth || this.editorHeight != view.scrollDOM.clientHeight) {
            this.contentDOMWidth = contentWidth;
            this.editorHeight = view.scrollDOM.clientHeight;
            result |= 8 /* Geometry */;
        }
        if (measureContent) {
            let lineHeights = view.docView.measureVisibleLineHeights();
            if (oracle.mustRefreshForHeights(lineHeights))
                refresh = true;
            if (refresh || oracle.lineWrapping && Math.abs(contentWidth - this.contentDOMWidth) > oracle.charWidth) {
                let { lineHeight, charWidth } = view.docView.measureTextSize();
                refresh = oracle.refresh(whiteSpace, direction, lineHeight, charWidth, contentWidth / charWidth, lineHeights);
                if (refresh) {
                    view.docView.minWidth = 0;
                    result |= 8 /* Geometry */;
                }
            }
            if (dTop > 0 && dBottom > 0)
                bias = Math.max(dTop, dBottom);
            else if (dTop < 0 && dBottom < 0)
                bias = Math.min(dTop, dBottom);
            oracle.heightChanged = false;
            this.heightMap = this.heightMap.updateHeight(oracle, 0, refresh, new MeasuredHeights(this.viewport.from, lineHeights));
            if (oracle.heightChanged)
                result |= 2 /* Height */;
        }
        let viewportChange = !this.viewportIsAppropriate(this.viewport, bias) ||
            this.scrollTarget && (this.scrollTarget.range.head < this.viewport.from || this.scrollTarget.range.head > this.viewport.to);
        if (viewportChange)
            this.viewport = this.getViewport(bias, this.scrollTarget);
        this.updateForViewport();
        if ((result & 2 /* Height */) || viewportChange)
            this.updateViewportLines();
        if (this.lineGaps.length || this.viewport.to - this.viewport.from > 4000 /* DoubleMargin */)
            this.updateLineGaps(this.ensureLineGaps(refresh ? [] : this.lineGaps));
        result |= this.computeVisibleRanges();
        if (this.mustEnforceCursorAssoc) {
            this.mustEnforceCursorAssoc = false;
            // This is done in the read stage, because moving the selection
            // to a line end is going to trigger a layout anyway, so it
            // can't be a pure write. It should be rare that it does any
            // writing.
            view.docView.enforceCursorAssoc();
        }
        return result;
    }
    get visibleTop() { return this.scaler.fromDOM(this.pixelViewport.top); }
    get visibleBottom() { return this.scaler.fromDOM(this.pixelViewport.bottom); }
    getViewport(bias, scrollTarget) {
        // This will divide VP.Margin between the top and the
        // bottom, depending on the bias (the change in viewport position
        // since the last update). It'll hold a number between 0 and 1
        let marginTop = 0.5 - Math.max(-0.5, Math.min(0.5, bias / 1000 /* Margin */ / 2));
        let map = this.heightMap, doc = this.state.doc, { visibleTop, visibleBottom } = this;
        let viewport = new Viewport(map.lineAt(visibleTop - marginTop * 1000 /* Margin */, QueryType.ByHeight, doc, 0, 0).from, map.lineAt(visibleBottom + (1 - marginTop) * 1000 /* Margin */, QueryType.ByHeight, doc, 0, 0).to);
        // If scrollTarget is given, make sure the viewport includes that position
        if (scrollTarget) {
            let { head } = scrollTarget.range;
            if (head < viewport.from || head > viewport.to) {
                let viewHeight = Math.min(this.editorHeight, this.pixelViewport.bottom - this.pixelViewport.top);
                let block = map.lineAt(head, QueryType.ByPos, doc, 0, 0), topPos;
                if (scrollTarget.y == "center")
                    topPos = (block.top + block.bottom) / 2 - viewHeight / 2;
                else if (scrollTarget.y == "start" || scrollTarget.y == "nearest" && head < viewport.from)
                    topPos = block.top;
                else
                    topPos = block.bottom - viewHeight;
                viewport = new Viewport(map.lineAt(topPos - 1000 /* Margin */ / 2, QueryType.ByHeight, doc, 0, 0).from, map.lineAt(topPos + viewHeight + 1000 /* Margin */ / 2, QueryType.ByHeight, doc, 0, 0).to);
            }
        }
        return viewport;
    }
    mapViewport(viewport, changes) {
        let from = changes.mapPos(viewport.from, -1), to = changes.mapPos(viewport.to, 1);
        return new Viewport(this.heightMap.lineAt(from, QueryType.ByPos, this.state.doc, 0, 0).from, this.heightMap.lineAt(to, QueryType.ByPos, this.state.doc, 0, 0).to);
    }
    // Checks if a given viewport covers the visible part of the
    // document and not too much beyond that.
    viewportIsAppropriate({ from, to }, bias = 0) {
        if (!this.inView)
            return true;
        let { top } = this.heightMap.lineAt(from, QueryType.ByPos, this.state.doc, 0, 0);
        let { bottom } = this.heightMap.lineAt(to, QueryType.ByPos, this.state.doc, 0, 0);
        let { visibleTop, visibleBottom } = this;
        return (from == 0 || top <= visibleTop - Math.max(10 /* MinCoverMargin */, Math.min(-bias, 250 /* MaxCoverMargin */))) &&
            (to == this.state.doc.length ||
                bottom >= visibleBottom + Math.max(10 /* MinCoverMargin */, Math.min(bias, 250 /* MaxCoverMargin */))) &&
            (top > visibleTop - 2 * 1000 /* Margin */ && bottom < visibleBottom + 2 * 1000 /* Margin */);
    }
    mapLineGaps(gaps, changes) {
        if (!gaps.length || changes.empty)
            return gaps;
        let mapped = [];
        for (let gap of gaps)
            if (!changes.touchesRange(gap.from, gap.to))
                mapped.push(new LineGap(changes.mapPos(gap.from), changes.mapPos(gap.to), gap.size));
        return mapped;
    }
    // Computes positions in the viewport where the start or end of a
    // line should be hidden, trying to reuse existing line gaps when
    // appropriate to avoid unneccesary redraws.
    // Uses crude character-counting for the positioning and sizing,
    // since actual DOM coordinates aren't always available and
    // predictable. Relies on generous margins (see LG.Margin) to hide
    // the artifacts this might produce from the user.
    ensureLineGaps(current) {
        let gaps = [];
        // This won't work at all in predominantly right-to-left text.
        if (this.heightOracle.direction != Direction.LTR)
            return gaps;
        for (let line of this.viewportLines) {
            if (line.length < 4000 /* DoubleMargin */)
                continue;
            let structure = lineStructure(line.from, line.to, this.state);
            if (structure.total < 4000 /* DoubleMargin */)
                continue;
            let viewFrom, viewTo;
            if (this.heightOracle.lineWrapping) {
                let marginHeight = (2000 /* Margin */ / this.heightOracle.lineLength) * this.heightOracle.lineHeight;
                viewFrom = findPosition(structure, (this.visibleTop - line.top - marginHeight) / line.height);
                viewTo = findPosition(structure, (this.visibleBottom - line.top + marginHeight) / line.height);
            }
            else {
                let totalWidth = structure.total * this.heightOracle.charWidth;
                let marginWidth = 2000 /* Margin */ * this.heightOracle.charWidth;
                viewFrom = findPosition(structure, (this.pixelViewport.left - marginWidth) / totalWidth);
                viewTo = findPosition(structure, (this.pixelViewport.right + marginWidth) / totalWidth);
            }
            let outside = [];
            if (viewFrom > line.from)
                outside.push({ from: line.from, to: viewFrom });
            if (viewTo < line.to)
                outside.push({ from: viewTo, to: line.to });
            let sel = this.state.selection.main;
            // Make sure the gaps don't cover a selection end
            if (sel.from >= line.from && sel.from <= line.to)
                cutRange(outside, sel.from - 10 /* SelectionMargin */, sel.from + 10 /* SelectionMargin */);
            if (!sel.empty && sel.to >= line.from && sel.to <= line.to)
                cutRange(outside, sel.to - 10 /* SelectionMargin */, sel.to + 10 /* SelectionMargin */);
            for (let { from, to } of outside)
                if (to - from > 1000 /* HalfMargin */) {
                    gaps.push(find(current, gap => gap.from >= line.from && gap.to <= line.to &&
                        Math.abs(gap.from - from) < 1000 /* HalfMargin */ && Math.abs(gap.to - to) < 1000 /* HalfMargin */) ||
                        new LineGap(from, to, this.gapSize(line, from, to, structure)));
                }
        }
        return gaps;
    }
    gapSize(line, from, to, structure) {
        let fraction = findFraction(structure, to) - findFraction(structure, from);
        if (this.heightOracle.lineWrapping) {
            return line.height * fraction;
        }
        else {
            return structure.total * this.heightOracle.charWidth * fraction;
        }
    }
    updateLineGaps(gaps) {
        if (!LineGap.same(gaps, this.lineGaps)) {
            this.lineGaps = gaps;
            this.lineGapDeco = Decoration.set(gaps.map(gap => gap.draw(this.heightOracle.lineWrapping)));
        }
    }
    computeVisibleRanges() {
        let deco = this.state.facet(decorations);
        if (this.lineGaps.length)
            deco = deco.concat(this.lineGapDeco);
        let ranges = [];
        RangeSet.spans(deco, this.viewport.from, this.viewport.to, {
            span(from, to) { ranges.push({ from, to }); },
            point() { }
        }, 20);
        let changed = ranges.length != this.visibleRanges.length ||
            this.visibleRanges.some((r, i) => r.from != ranges[i].from || r.to != ranges[i].to);
        this.visibleRanges = ranges;
        return changed ? 4 /* Viewport */ : 0;
    }
    lineBlockAt(pos) {
        return (pos >= this.viewport.from && pos <= this.viewport.to && this.viewportLines.find(b => b.from <= pos && b.to >= pos)) ||
            scaleBlock(this.heightMap.lineAt(pos, QueryType.ByPos, this.state.doc, 0, 0), this.scaler);
    }
    lineBlockAtHeight(height) {
        return scaleBlock(this.heightMap.lineAt(this.scaler.fromDOM(height), QueryType.ByHeight, this.state.doc, 0, 0), this.scaler);
    }
    elementAtHeight(height) {
        return scaleBlock(this.heightMap.blockAt(this.scaler.fromDOM(height), this.state.doc, 0, 0), this.scaler);
    }
    get docHeight() {
        return this.scaler.toDOM(this.heightMap.height);
    }
    get contentHeight() {
        return this.docHeight + this.paddingTop + this.paddingBottom;
    }
}
class Viewport {
    constructor(from, to) {
        this.from = from;
        this.to = to;
    }
}
function lineStructure(from, to, state) {
    let ranges = [], pos = from, total = 0;
    RangeSet.spans(state.facet(decorations), from, to, {
        span() { },
        point(from, to) {
            if (from > pos) {
                ranges.push({ from: pos, to: from });
                total += from - pos;
            }
            pos = to;
        }
    }, 20); // We're only interested in collapsed ranges of a significant size
    if (pos < to) {
        ranges.push({ from: pos, to });
        total += to - pos;
    }
    return { total, ranges };
}
function findPosition({ total, ranges }, ratio) {
    if (ratio <= 0)
        return ranges[0].from;
    if (ratio >= 1)
        return ranges[ranges.length - 1].to;
    let dist = Math.floor(total * ratio);
    for (let i = 0;; i++) {
        let { from, to } = ranges[i], size = to - from;
        if (dist <= size)
            return from + dist;
        dist -= size;
    }
}
function findFraction(structure, pos) {
    let counted = 0;
    for (let { from, to } of structure.ranges) {
        if (pos <= to) {
            counted += pos - from;
            break;
        }
        counted += to - from;
    }
    return counted / structure.total;
}
function cutRange(ranges, from, to) {
    for (let i = 0; i < ranges.length; i++) {
        let r = ranges[i];
        if (r.from < to && r.to > from) {
            let pieces = [];
            if (r.from < from)
                pieces.push({ from: r.from, to: from });
            if (r.to > to)
                pieces.push({ from: to, to: r.to });
            ranges.splice(i, 1, ...pieces);
            i += pieces.length - 1;
        }
    }
}
function find(array, f) {
    for (let val of array)
        if (f(val))
            return val;
    return undefined;
}
// Don't scale when the document height is within the range of what
// the DOM can handle.
const IdScaler = {
    toDOM(n) { return n; },
    fromDOM(n) { return n; },
    scale: 1
};
// When the height is too big (> VP.MaxDOMHeight), scale down the
// regions outside the viewports so that the total height is
// VP.MaxDOMHeight.
class BigScaler {
    constructor(doc, heightMap, viewports) {
        let vpHeight = 0, base = 0, domBase = 0;
        this.viewports = viewports.map(({ from, to }) => {
            let top = heightMap.lineAt(from, QueryType.ByPos, doc, 0, 0).top;
            let bottom = heightMap.lineAt(to, QueryType.ByPos, doc, 0, 0).bottom;
            vpHeight += bottom - top;
            return { from, to, top, bottom, domTop: 0, domBottom: 0 };
        });
        this.scale = (7000000 /* MaxDOMHeight */ - vpHeight) / (heightMap.height - vpHeight);
        for (let obj of this.viewports) {
            obj.domTop = domBase + (obj.top - base) * this.scale;
            domBase = obj.domBottom = obj.domTop + (obj.bottom - obj.top);
            base = obj.bottom;
        }
    }
    toDOM(n) {
        for (let i = 0, base = 0, domBase = 0;; i++) {
            let vp = i < this.viewports.length ? this.viewports[i] : null;
            if (!vp || n < vp.top)
                return domBase + (n - base) * this.scale;
            if (n <= vp.bottom)
                return vp.domTop + (n - vp.top);
            base = vp.bottom;
            domBase = vp.domBottom;
        }
    }
    fromDOM(n) {
        for (let i = 0, base = 0, domBase = 0;; i++) {
            let vp = i < this.viewports.length ? this.viewports[i] : null;
            if (!vp || n < vp.domTop)
                return base + (n - domBase) / this.scale;
            if (n <= vp.domBottom)
                return vp.top + (n - vp.domTop);
            base = vp.bottom;
            domBase = vp.domBottom;
        }
    }
}
function scaleBlock(block, scaler) {
    if (scaler.scale == 1)
        return block;
    let bTop = scaler.toDOM(block.top), bBottom = scaler.toDOM(block.bottom);
    return new BlockInfo(block.from, block.length, bTop, bBottom - bTop, Array.isArray(block.type) ? block.type.map(b => scaleBlock(b, scaler)) : block.type);
}

const theme = /*@__PURE__*/Facet.define({ combine: strs => strs.join(" ") });
const darkTheme = /*@__PURE__*/Facet.define({ combine: values => values.indexOf(true) > -1 });
const baseThemeID = /*@__PURE__*/StyleModule.newName(), baseLightID = /*@__PURE__*/StyleModule.newName(), baseDarkID = /*@__PURE__*/StyleModule.newName();
const lightDarkIDs = { "&light": "." + baseLightID, "&dark": "." + baseDarkID };
function buildTheme(main, spec, scopes) {
    return new StyleModule(spec, {
        finish(sel) {
            return /&/.test(sel) ? sel.replace(/&\w*/, m => {
                if (m == "&")
                    return main;
                if (!scopes || !scopes[m])
                    throw new RangeError(`Unsupported selector: ${m}`);
                return scopes[m];
            }) : main + " " + sel;
        }
    });
}
const baseTheme = /*@__PURE__*/buildTheme("." + baseThemeID, {
    "&.cm-editor": {
        position: "relative !important",
        boxSizing: "border-box",
        "&.cm-focused": {
            // Provide a simple default outline to make sure a focused
            // editor is visually distinct. Can't leave the default behavior
            // because that will apply to the content element, which is
            // inside the scrollable container and doesn't include the
            // gutters. We also can't use an 'auto' outline, since those
            // are, for some reason, drawn behind the element content, which
            // will cause things like the active line background to cover
            // the outline (#297).
            outline: "1px dotted #212121"
        },
        display: "flex !important",
        flexDirection: "column"
    },
    ".cm-scroller": {
        display: "flex !important",
        alignItems: "flex-start !important",
        fontFamily: "monospace",
        lineHeight: 1.4,
        height: "100%",
        overflowX: "auto",
        position: "relative",
        zIndex: 0
    },
    ".cm-content": {
        margin: 0,
        flexGrow: 2,
        minHeight: "100%",
        display: "block",
        whiteSpace: "pre",
        wordWrap: "normal",
        boxSizing: "border-box",
        padding: "4px 0",
        outline: "none",
        "&[contenteditable=true]": {
            WebkitUserModify: "read-write-plaintext-only",
        }
    },
    ".cm-lineWrapping": {
        whiteSpace_fallback: "pre-wrap",
        whiteSpace: "break-spaces",
        wordBreak: "break-word",
        overflowWrap: "anywhere"
    },
    "&light .cm-content": { caretColor: "black" },
    "&dark .cm-content": { caretColor: "white" },
    ".cm-line": {
        display: "block",
        padding: "0 2px 0 4px"
    },
    ".cm-selectionLayer": {
        zIndex: -1,
        contain: "size style"
    },
    ".cm-selectionBackground": {
        position: "absolute",
    },
    "&light .cm-selectionBackground": {
        background: "#d9d9d9"
    },
    "&dark .cm-selectionBackground": {
        background: "#222"
    },
    "&light.cm-focused .cm-selectionBackground": {
        background: "#d7d4f0"
    },
    "&dark.cm-focused .cm-selectionBackground": {
        background: "#233"
    },
    ".cm-cursorLayer": {
        zIndex: 100,
        contain: "size style",
        pointerEvents: "none"
    },
    "&.cm-focused .cm-cursorLayer": {
        animation: "steps(1) cm-blink 1.2s infinite"
    },
    // Two animations defined so that we can switch between them to
    // restart the animation without forcing another style
    // recomputation.
    "@keyframes cm-blink": { "0%": {}, "50%": { visibility: "hidden" }, "100%": {} },
    "@keyframes cm-blink2": { "0%": {}, "50%": { visibility: "hidden" }, "100%": {} },
    ".cm-cursor, .cm-dropCursor": {
        position: "absolute",
        borderLeft: "1.2px solid black",
        marginLeft: "-0.6px",
        pointerEvents: "none",
    },
    ".cm-cursor": {
        display: "none"
    },
    "&dark .cm-cursor": {
        borderLeftColor: "#444"
    },
    "&.cm-focused .cm-cursor": {
        display: "block"
    },
    "&light .cm-activeLine": { backgroundColor: "#f3f9ff" },
    "&dark .cm-activeLine": { backgroundColor: "#223039" },
    "&light .cm-specialChar": { color: "red" },
    "&dark .cm-specialChar": { color: "#f78" },
    ".cm-tab": {
        display: "inline-block",
        overflow: "hidden",
        verticalAlign: "bottom"
    },
    ".cm-widgetBuffer": {
        verticalAlign: "text-top",
        height: "1em",
        display: "inline"
    },
    ".cm-placeholder": {
        color: "#888",
        display: "inline-block",
        verticalAlign: "top",
    },
    ".cm-button": {
        verticalAlign: "middle",
        color: "inherit",
        fontSize: "70%",
        padding: ".2em 1em",
        borderRadius: "1px"
    },
    "&light .cm-button": {
        backgroundImage: "linear-gradient(#eff1f5, #d9d9df)",
        border: "1px solid #888",
        "&:active": {
            backgroundImage: "linear-gradient(#b4b4b4, #d0d3d6)"
        }
    },
    "&dark .cm-button": {
        backgroundImage: "linear-gradient(#393939, #111)",
        border: "1px solid #888",
        "&:active": {
            backgroundImage: "linear-gradient(#111, #333)"
        }
    },
    ".cm-textfield": {
        verticalAlign: "middle",
        color: "inherit",
        fontSize: "70%",
        border: "1px solid silver",
        padding: ".2em .5em"
    },
    "&light .cm-textfield": {
        backgroundColor: "white"
    },
    "&dark .cm-textfield": {
        border: "1px solid #555",
        backgroundColor: "inherit"
    }
}, lightDarkIDs);

const observeOptions = {
    childList: true,
    characterData: true,
    subtree: true,
    attributes: true,
    characterDataOldValue: true
};
// IE11 has very broken mutation observers, so we also listen to
// DOMCharacterDataModified there
const useCharData = browser.ie && browser.ie_version <= 11;
class DOMObserver {
    constructor(view, onChange, onScrollChanged) {
        this.view = view;
        this.onChange = onChange;
        this.onScrollChanged = onScrollChanged;
        this.active = false;
        // The known selection. Kept in our own object, as opposed to just
        // directly accessing the selection because:
        //  - Safari doesn't report the right selection in shadow DOM
        //  - Reading from the selection forces a DOM layout
        //  - This way, we can ignore selectionchange events if we have
        //    already seen the 'new' selection
        this.selectionRange = new DOMSelectionState;
        // Set when a selection change is detected, cleared on flush
        this.selectionChanged = false;
        this.delayedFlush = -1;
        this.resizeTimeout = -1;
        this.queue = [];
        this.delayedAndroidKey = null;
        this.scrollTargets = [];
        this.intersection = null;
        this.resize = null;
        this.intersecting = false;
        this.gapIntersection = null;
        this.gaps = [];
        // Timeout for scheduling check of the parents that need scroll handlers
        this.parentCheck = -1;
        this.dom = view.contentDOM;
        this.observer = new MutationObserver(mutations => {
            for (let mut of mutations)
                this.queue.push(mut);
            // IE11 will sometimes (on typing over a selection or
            // backspacing out a single character text node) call the
            // observer callback before actually updating the DOM.
            //
            // Unrelatedly, iOS Safari will, when ending a composition,
            // sometimes first clear it, deliver the mutations, and then
            // reinsert the finished text. CodeMirror's handling of the
            // deletion will prevent the reinsertion from happening,
            // breaking composition.
            if ((browser.ie && browser.ie_version <= 11 || browser.ios && view.composing) &&
                mutations.some(m => m.type == "childList" && m.removedNodes.length ||
                    m.type == "characterData" && m.oldValue.length > m.target.nodeValue.length))
                this.flushSoon();
            else
                this.flush();
        });
        if (useCharData)
            this.onCharData = (event) => {
                this.queue.push({ target: event.target,
                    type: "characterData",
                    oldValue: event.prevValue });
                this.flushSoon();
            };
        this.onSelectionChange = this.onSelectionChange.bind(this);
        window.addEventListener("resize", this.onResize = this.onResize.bind(this));
        if (typeof ResizeObserver == "function") {
            this.resize = new ResizeObserver(() => {
                if (this.view.docView.lastUpdate < Date.now() - 75)
                    this.onResize();
            });
            this.resize.observe(view.scrollDOM);
        }
        this.start();
        window.addEventListener("scroll", this.onScroll = this.onScroll.bind(this));
        if (typeof IntersectionObserver == "function") {
            this.intersection = new IntersectionObserver(entries => {
                if (this.parentCheck < 0)
                    this.parentCheck = setTimeout(this.listenForScroll.bind(this), 1000);
                if (entries.length > 0 && (entries[entries.length - 1].intersectionRatio > 0) != this.intersecting) {
                    this.intersecting = !this.intersecting;
                    if (this.intersecting != this.view.inView)
                        this.onScrollChanged(document.createEvent("Event"));
                }
            }, {});
            this.intersection.observe(this.dom);
            this.gapIntersection = new IntersectionObserver(entries => {
                if (entries.length > 0 && entries[entries.length - 1].intersectionRatio > 0)
                    this.onScrollChanged(document.createEvent("Event"));
            }, {});
        }
        this.listenForScroll();
        this.readSelectionRange();
        this.dom.ownerDocument.addEventListener("selectionchange", this.onSelectionChange);
    }
    onScroll(e) {
        if (this.intersecting)
            this.flush(false);
        this.onScrollChanged(e);
    }
    onResize() {
        if (this.resizeTimeout < 0)
            this.resizeTimeout = setTimeout(() => {
                this.resizeTimeout = -1;
                this.view.requestMeasure();
            }, 50);
    }
    updateGaps(gaps) {
        if (this.gapIntersection && (gaps.length != this.gaps.length || this.gaps.some((g, i) => g != gaps[i]))) {
            this.gapIntersection.disconnect();
            for (let gap of gaps)
                this.gapIntersection.observe(gap);
            this.gaps = gaps;
        }
    }
    onSelectionChange(event) {
        if (!this.readSelectionRange() || this.delayedAndroidKey)
            return;
        let { view } = this, sel = this.selectionRange;
        if (view.state.facet(editable) ? view.root.activeElement != this.dom : !hasSelection(view.dom, sel))
            return;
        let context = sel.anchorNode && view.docView.nearest(sel.anchorNode);
        if (context && context.ignoreEvent(event))
            return;
        // Deletions on IE11 fire their events in the wrong order, giving
        // us a selection change event before the DOM changes are
        // reported.
        // Chrome Android has a similar issue when backspacing out a
        // selection (#645).
        if ((browser.ie && browser.ie_version <= 11 || browser.android && browser.chrome) && !view.state.selection.main.empty &&
            // (Selection.isCollapsed isn't reliable on IE)
            sel.focusNode && isEquivalentPosition(sel.focusNode, sel.focusOffset, sel.anchorNode, sel.anchorOffset))
            this.flushSoon();
        else
            this.flush(false);
    }
    readSelectionRange() {
        let { root } = this.view, domSel = getSelection(root);
        // The Selection object is broken in shadow roots in Safari. See
        // https://github.com/codemirror/codemirror.next/issues/414
        let range = browser.safari && root.nodeType == 11 && deepActiveElement() == this.view.contentDOM &&
            safariSelectionRangeHack(this.view) || domSel;
        if (this.selectionRange.eq(range))
            return false;
        this.selectionRange.setRange(range);
        return this.selectionChanged = true;
    }
    setSelectionRange(anchor, head) {
        this.selectionRange.set(anchor.node, anchor.offset, head.node, head.offset);
        this.selectionChanged = false;
    }
    listenForScroll() {
        this.parentCheck = -1;
        let i = 0, changed = null;
        for (let dom = this.dom; dom;) {
            if (dom.nodeType == 1) {
                if (!changed && i < this.scrollTargets.length && this.scrollTargets[i] == dom)
                    i++;
                else if (!changed)
                    changed = this.scrollTargets.slice(0, i);
                if (changed)
                    changed.push(dom);
                dom = dom.assignedSlot || dom.parentNode;
            }
            else if (dom.nodeType == 11) { // Shadow root
                dom = dom.host;
            }
            else {
                break;
            }
        }
        if (i < this.scrollTargets.length && !changed)
            changed = this.scrollTargets.slice(0, i);
        if (changed) {
            for (let dom of this.scrollTargets)
                dom.removeEventListener("scroll", this.onScroll);
            for (let dom of this.scrollTargets = changed)
                dom.addEventListener("scroll", this.onScroll);
        }
    }
    ignore(f) {
        if (!this.active)
            return f();
        try {
            this.stop();
            return f();
        }
        finally {
            this.start();
            this.clear();
        }
    }
    start() {
        if (this.active)
            return;
        this.observer.observe(this.dom, observeOptions);
        if (useCharData)
            this.dom.addEventListener("DOMCharacterDataModified", this.onCharData);
        this.active = true;
    }
    stop() {
        if (!this.active)
            return;
        this.active = false;
        this.observer.disconnect();
        if (useCharData)
            this.dom.removeEventListener("DOMCharacterDataModified", this.onCharData);
    }
    // Throw away any pending changes
    clear() {
        this.processRecords();
        this.queue.length = 0;
        this.selectionChanged = false;
    }
    // Chrome Android, especially in combination with GBoard, not only
    // doesn't reliably fire regular key events, but also often
    // surrounds the effect of enter or backspace with a bunch of
    // composition events that, when interrupted, cause text duplication
    // or other kinds of corruption. This hack makes the editor back off
    // from handling DOM changes for a moment when such a key is
    // detected (via beforeinput or keydown), and then dispatches the
    // key event, throwing away the DOM changes if it gets handled.
    delayAndroidKey(key, keyCode) {
        if (!this.delayedAndroidKey)
            requestAnimationFrame(() => {
                let key = this.delayedAndroidKey;
                this.delayedAndroidKey = null;
                let startState = this.view.state;
                if (dispatchKey(this.view.contentDOM, key.key, key.keyCode))
                    this.processRecords();
                else
                    this.flush();
                if (this.view.state == startState)
                    this.view.update([]);
            });
        // Since backspace beforeinput is sometimes signalled spuriously,
        // Enter always takes precedence.
        if (!this.delayedAndroidKey || key == "Enter")
            this.delayedAndroidKey = { key, keyCode };
    }
    flushSoon() {
        if (this.delayedFlush < 0)
            this.delayedFlush = window.setTimeout(() => { this.delayedFlush = -1; this.flush(); }, 20);
    }
    forceFlush() {
        if (this.delayedFlush >= 0) {
            window.clearTimeout(this.delayedFlush);
            this.delayedFlush = -1;
            this.flush();
        }
    }
    processRecords() {
        let records = this.queue;
        for (let mut of this.observer.takeRecords())
            records.push(mut);
        if (records.length)
            this.queue = [];
        let from = -1, to = -1, typeOver = false;
        for (let record of records) {
            let range = this.readMutation(record);
            if (!range)
                continue;
            if (range.typeOver)
                typeOver = true;
            if (from == -1) {
                ({ from, to } = range);
            }
            else {
                from = Math.min(range.from, from);
                to = Math.max(range.to, to);
            }
        }
        return { from, to, typeOver };
    }
    // Apply pending changes, if any
    flush(readSelection = true) {
        // Completely hold off flushing when pending keys are set—the code
        // managing those will make sure processRecords is called and the
        // view is resynchronized after
        if (this.delayedFlush >= 0 || this.delayedAndroidKey)
            return;
        if (readSelection)
            this.readSelectionRange();
        let { from, to, typeOver } = this.processRecords();
        let newSel = this.selectionChanged && hasSelection(this.dom, this.selectionRange);
        if (from < 0 && !newSel)
            return;
        this.selectionChanged = false;
        let startState = this.view.state;
        this.onChange(from, to, typeOver);
        // The view wasn't updated
        if (this.view.state == startState)
            this.view.update([]);
    }
    readMutation(rec) {
        let cView = this.view.docView.nearest(rec.target);
        if (!cView || cView.ignoreMutation(rec))
            return null;
        cView.markDirty(rec.type == "attributes");
        if (rec.type == "attributes")
            cView.dirty |= 4 /* Attrs */;
        if (rec.type == "childList") {
            let childBefore = findChild(cView, rec.previousSibling || rec.target.previousSibling, -1);
            let childAfter = findChild(cView, rec.nextSibling || rec.target.nextSibling, 1);
            return { from: childBefore ? cView.posAfter(childBefore) : cView.posAtStart,
                to: childAfter ? cView.posBefore(childAfter) : cView.posAtEnd, typeOver: false };
        }
        else if (rec.type == "characterData") {
            return { from: cView.posAtStart, to: cView.posAtEnd, typeOver: rec.target.nodeValue == rec.oldValue };
        }
        else {
            return null;
        }
    }
    destroy() {
        var _a, _b, _c;
        this.stop();
        (_a = this.intersection) === null || _a === void 0 ? void 0 : _a.disconnect();
        (_b = this.gapIntersection) === null || _b === void 0 ? void 0 : _b.disconnect();
        (_c = this.resize) === null || _c === void 0 ? void 0 : _c.disconnect();
        for (let dom of this.scrollTargets)
            dom.removeEventListener("scroll", this.onScroll);
        window.removeEventListener("scroll", this.onScroll);
        window.removeEventListener("resize", this.onResize);
        this.dom.ownerDocument.removeEventListener("selectionchange", this.onSelectionChange);
        clearTimeout(this.parentCheck);
        clearTimeout(this.resizeTimeout);
    }
}
function findChild(cView, dom, dir) {
    while (dom) {
        let curView = ContentView.get(dom);
        if (curView && curView.parent == cView)
            return curView;
        let parent = dom.parentNode;
        dom = parent != cView.dom ? parent : dir > 0 ? dom.nextSibling : dom.previousSibling;
    }
    return null;
}
// Used to work around a Safari Selection/shadow DOM bug (#414)
function safariSelectionRangeHack(view) {
    let found = null;
    // Because Safari (at least in 2018-2021) doesn't provide regular
    // access to the selection inside a shadowroot, we have to perform a
    // ridiculous hack to get at it—using `execCommand` to trigger a
    // `beforeInput` event so that we can read the target range from the
    // event.
    function read(event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        found = event.getTargetRanges()[0];
    }
    view.contentDOM.addEventListener("beforeinput", read, true);
    document.execCommand("indent");
    view.contentDOM.removeEventListener("beforeinput", read, true);
    if (!found)
        return null;
    let anchorNode = found.startContainer, anchorOffset = found.startOffset;
    let focusNode = found.endContainer, focusOffset = found.endOffset;
    let curAnchor = view.docView.domAtPos(view.state.selection.main.anchor);
    // Since such a range doesn't distinguish between anchor and head,
    // use a heuristic that flips it around if its end matches the
    // current anchor.
    if (isEquivalentPosition(curAnchor.node, curAnchor.offset, focusNode, focusOffset))
        [anchorNode, anchorOffset, focusNode, focusOffset] = [focusNode, focusOffset, anchorNode, anchorOffset];
    return { anchorNode, anchorOffset, focusNode, focusOffset };
}

function applyDOMChange(view, start, end, typeOver) {
    let change, newSel;
    let sel = view.state.selection.main;
    if (start > -1) {
        let bounds = view.docView.domBoundsAround(start, end, 0);
        if (!bounds || view.state.readOnly)
            return;
        let { from, to } = bounds;
        let selPoints = view.docView.impreciseHead || view.docView.impreciseAnchor ? [] : selectionPoints(view);
        let reader = new DOMReader(selPoints, view.state);
        reader.readRange(bounds.startDOM, bounds.endDOM);
        let preferredPos = sel.from, preferredSide = null;
        // Prefer anchoring to end when Backspace is pressed (or, on
        // Android, when something was deleted)
        if (view.inputState.lastKeyCode === 8 && view.inputState.lastKeyTime > Date.now() - 100 ||
            browser.android && reader.text.length < to - from) {
            preferredPos = sel.to;
            preferredSide = "end";
        }
        let diff = findDiff(view.state.doc.sliceString(from, to, LineBreakPlaceholder), reader.text, preferredPos - from, preferredSide);
        if (diff) {
            // Chrome inserts two newlines when pressing shift-enter at the
            // end of a line. This drops one of those.
            if (browser.chrome && view.inputState.lastKeyCode == 13 &&
                diff.toB == diff.from + 2 && reader.text.slice(diff.from, diff.toB) == LineBreakPlaceholder + LineBreakPlaceholder)
                diff.toB--;
            change = { from: from + diff.from, to: from + diff.toA,
                insert: Text.of(reader.text.slice(diff.from, diff.toB).split(LineBreakPlaceholder)) };
        }
        newSel = selectionFromPoints(selPoints, from);
    }
    else if (view.hasFocus || !view.state.facet(editable)) {
        let domSel = view.observer.selectionRange;
        let { impreciseHead: iHead, impreciseAnchor: iAnchor } = view.docView;
        let head = iHead && iHead.node == domSel.focusNode && iHead.offset == domSel.focusOffset ||
            !contains(view.contentDOM, domSel.focusNode)
            ? view.state.selection.main.head
            : view.docView.posFromDOM(domSel.focusNode, domSel.focusOffset);
        let anchor = iAnchor && iAnchor.node == domSel.anchorNode && iAnchor.offset == domSel.anchorOffset ||
            !contains(view.contentDOM, domSel.anchorNode)
            ? view.state.selection.main.anchor
            : view.docView.posFromDOM(domSel.anchorNode, domSel.anchorOffset);
        if (head != sel.head || anchor != sel.anchor)
            newSel = EditorSelection.single(anchor, head);
    }
    if (!change && !newSel)
        return;
    // Heuristic to notice typing over a selected character
    if (!change && typeOver && !sel.empty && newSel && newSel.main.empty)
        change = { from: sel.from, to: sel.to, insert: view.state.doc.slice(sel.from, sel.to) };
    // If the change is inside the selection and covers most of it,
    // assume it is a selection replace (with identical characters at
    // the start/end not included in the diff)
    else if (change && change.from >= sel.from && change.to <= sel.to &&
        (change.from != sel.from || change.to != sel.to) &&
        (sel.to - sel.from) - (change.to - change.from) <= 4)
        change = {
            from: sel.from, to: sel.to,
            insert: view.state.doc.slice(sel.from, change.from).append(change.insert).append(view.state.doc.slice(change.to, sel.to))
        };
    if (change) {
        let startState = view.state;
        if (browser.ios && view.inputState.flushIOSKey(view))
            return;
        // Android browsers don't fire reasonable key events for enter,
        // backspace, or delete. So this detects changes that look like
        // they're caused by those keys, and reinterprets them as key
        // events. (Some of these keys are also handled by beforeinput
        // events and the pendingAndroidKey mechanism, but that's not
        // reliable in all situations.)
        if (browser.android &&
            ((change.from == sel.from && change.to == sel.to &&
                change.insert.length == 1 && change.insert.lines == 2 &&
                dispatchKey(view.contentDOM, "Enter", 13)) ||
                (change.from == sel.from - 1 && change.to == sel.to && change.insert.length == 0 &&
                    dispatchKey(view.contentDOM, "Backspace", 8)) ||
                (change.from == sel.from && change.to == sel.to + 1 && change.insert.length == 0 &&
                    dispatchKey(view.contentDOM, "Delete", 46))))
            return;
        let text = change.insert.toString();
        if (view.state.facet(inputHandler).some(h => h(view, change.from, change.to, text)))
            return;
        if (view.inputState.composing >= 0)
            view.inputState.composing++;
        let tr;
        if (change.from >= sel.from && change.to <= sel.to && change.to - change.from >= (sel.to - sel.from) / 3 &&
            (!newSel || newSel.main.empty && newSel.main.from == change.from + change.insert.length) &&
            view.inputState.composing < 0) {
            let before = sel.from < change.from ? startState.sliceDoc(sel.from, change.from) : "";
            let after = sel.to > change.to ? startState.sliceDoc(change.to, sel.to) : "";
            tr = startState.replaceSelection(view.state.toText(before + change.insert.sliceString(0, undefined, view.state.lineBreak) + after));
        }
        else {
            let changes = startState.changes(change);
            let mainSel = newSel && !startState.selection.main.eq(newSel.main) && newSel.main.to <= changes.newLength
                ? newSel.main : undefined;
            // Try to apply a composition change to all cursors
            if (startState.selection.ranges.length > 1 && view.inputState.composing >= 0 &&
                change.to <= sel.to && change.to >= sel.to - 10) {
                let replaced = view.state.sliceDoc(change.from, change.to);
                let compositionRange = compositionSurroundingNode(view) || view.state.doc.lineAt(sel.head);
                let offset = sel.to - change.to, size = sel.to - sel.from;
                tr = startState.changeByRange(range => {
                    if (range.from == sel.from && range.to == sel.to)
                        return { changes, range: mainSel || range.map(changes) };
                    let to = range.to - offset, from = to - replaced.length;
                    if (range.to - range.from != size || view.state.sliceDoc(from, to) != replaced ||
                        // Unfortunately, there's no way to make multiple
                        // changes in the same node work without aborting
                        // composition, so cursors in the composition range are
                        // ignored.
                        compositionRange && range.to >= compositionRange.from && range.from <= compositionRange.to)
                        return { range };
                    let rangeChanges = startState.changes({ from, to, insert: change.insert }), selOff = range.to - sel.to;
                    return {
                        changes: rangeChanges,
                        range: !mainSel ? range.map(rangeChanges) :
                            EditorSelection.range(Math.max(0, mainSel.anchor + selOff), Math.max(0, mainSel.head + selOff))
                    };
                });
            }
            else {
                tr = {
                    changes,
                    selection: mainSel && startState.selection.replaceRange(mainSel)
                };
            }
        }
        let userEvent = "input.type";
        if (view.composing) {
            userEvent += ".compose";
            if (view.inputState.compositionFirstChange) {
                userEvent += ".start";
                view.inputState.compositionFirstChange = false;
            }
        }
        view.dispatch(tr, { scrollIntoView: true, userEvent });
    }
    else if (newSel && !newSel.main.eq(sel)) {
        let scrollIntoView = false, userEvent = "select";
        if (view.inputState.lastSelectionTime > Date.now() - 50) {
            if (view.inputState.lastSelectionOrigin == "select")
                scrollIntoView = true;
            userEvent = view.inputState.lastSelectionOrigin;
        }
        view.dispatch({ selection: newSel, scrollIntoView, userEvent });
    }
}
function findDiff(a, b, preferredPos, preferredSide) {
    let minLen = Math.min(a.length, b.length);
    let from = 0;
    while (from < minLen && a.charCodeAt(from) == b.charCodeAt(from))
        from++;
    if (from == minLen && a.length == b.length)
        return null;
    let toA = a.length, toB = b.length;
    while (toA > 0 && toB > 0 && a.charCodeAt(toA - 1) == b.charCodeAt(toB - 1)) {
        toA--;
        toB--;
    }
    if (preferredSide == "end") {
        let adjust = Math.max(0, from - Math.min(toA, toB));
        preferredPos -= toA + adjust - from;
    }
    if (toA < from && a.length < b.length) {
        let move = preferredPos <= from && preferredPos >= toA ? from - preferredPos : 0;
        from -= move;
        toB = from + (toB - toA);
        toA = from;
    }
    else if (toB < from) {
        let move = preferredPos <= from && preferredPos >= toB ? from - preferredPos : 0;
        from -= move;
        toA = from + (toA - toB);
        toB = from;
    }
    return { from, toA, toB };
}
function selectionPoints(view) {
    let result = [];
    if (view.root.activeElement != view.contentDOM)
        return result;
    let { anchorNode, anchorOffset, focusNode, focusOffset } = view.observer.selectionRange;
    if (anchorNode) {
        result.push(new DOMPoint(anchorNode, anchorOffset));
        if (focusNode != anchorNode || focusOffset != anchorOffset)
            result.push(new DOMPoint(focusNode, focusOffset));
    }
    return result;
}
function selectionFromPoints(points, base) {
    if (points.length == 0)
        return null;
    let anchor = points[0].pos, head = points.length == 2 ? points[1].pos : anchor;
    return anchor > -1 && head > -1 ? EditorSelection.single(anchor + base, head + base) : null;
}

// The editor's update state machine looks something like this:
//
//     Idle → Updating ⇆ Idle (unchecked) → Measuring → Idle
//                                         ↑      ↓
//                                         Updating (measure)
//
// The difference between 'Idle' and 'Idle (unchecked)' lies in
// whether a layout check has been scheduled. A regular update through
// the `update` method updates the DOM in a write-only fashion, and
// relies on a check (scheduled with `requestAnimationFrame`) to make
// sure everything is where it should be and the viewport covers the
// visible code. That check continues to measure and then optionally
// update until it reaches a coherent state.
/**
An editor view represents the editor's user interface. It holds
the editable DOM surface, and possibly other elements such as the
line number gutter. It handles events and dispatches state
transactions for editing actions.
*/
class EditorView {
    /**
    Construct a new view. You'll usually want to put `view.dom` into
    your document after creating a view, so that the user can see
    it.
    */
    constructor(
    /**
    Initialization options.
    */
    config = {}) {
        this.plugins = [];
        this.pluginMap = new Map;
        this.editorAttrs = {};
        this.contentAttrs = {};
        this.bidiCache = [];
        this.destroyed = false;
        /**
        @internal
        */
        this.updateState = 2 /* Updating */;
        /**
        @internal
        */
        this.measureScheduled = -1;
        /**
        @internal
        */
        this.measureRequests = [];
        this.contentDOM = document.createElement("div");
        this.scrollDOM = document.createElement("div");
        this.scrollDOM.tabIndex = -1;
        this.scrollDOM.className = "cm-scroller";
        this.scrollDOM.appendChild(this.contentDOM);
        this.announceDOM = document.createElement("div");
        this.announceDOM.style.cssText = "position: absolute; top: -10000px";
        this.announceDOM.setAttribute("aria-live", "polite");
        this.dom = document.createElement("div");
        this.dom.appendChild(this.announceDOM);
        this.dom.appendChild(this.scrollDOM);
        this._dispatch = config.dispatch || ((tr) => this.update([tr]));
        this.dispatch = this.dispatch.bind(this);
        this.root = (config.root || getRoot(config.parent) || document);
        this.viewState = new ViewState(config.state || EditorState.create());
        this.plugins = this.state.facet(viewPlugin).map(spec => new PluginInstance(spec));
        for (let plugin of this.plugins)
            plugin.update(this);
        this.observer = new DOMObserver(this, (from, to, typeOver) => {
            applyDOMChange(this, from, to, typeOver);
        }, event => {
            this.inputState.runScrollHandlers(this, event);
            if (this.observer.intersecting)
                this.measure();
        });
        this.inputState = new InputState(this);
        this.docView = new DocView(this);
        this.mountStyles();
        this.updateAttrs();
        this.updateState = 0 /* Idle */;
        this.requestMeasure();
        if (config.parent)
            config.parent.appendChild(this.dom);
    }
    /**
    The current editor state.
    */
    get state() { return this.viewState.state; }
    /**
    To be able to display large documents without consuming too much
    memory or overloading the browser, CodeMirror only draws the
    code that is visible (plus a margin around it) to the DOM. This
    property tells you the extent of the current drawn viewport, in
    document positions.
    */
    get viewport() { return this.viewState.viewport; }
    /**
    When there are, for example, large collapsed ranges in the
    viewport, its size can be a lot bigger than the actual visible
    content. Thus, if you are doing something like styling the
    content in the viewport, it is preferable to only do so for
    these ranges, which are the subset of the viewport that is
    actually drawn.
    */
    get visibleRanges() { return this.viewState.visibleRanges; }
    /**
    Returns false when the editor is entirely scrolled out of view
    or otherwise hidden.
    */
    get inView() { return this.viewState.inView; }
    /**
    Indicates whether the user is currently composing text via
    [IME](https://en.wikipedia.org/wiki/Input_method), and at least
    one change has been made in the current composition.
    */
    get composing() { return this.inputState.composing > 0; }
    /**
    Indicates whether the user is currently in composing state. Note
    that on some platforms, like Android, this will be the case a
    lot, since just putting the cursor on a word starts a
    composition there.
    */
    get compositionStarted() { return this.inputState.composing >= 0; }
    dispatch(...input) {
        this._dispatch(input.length == 1 && input[0] instanceof Transaction ? input[0]
            : this.state.update(...input));
    }
    /**
    Update the view for the given array of transactions. This will
    update the visible document and selection to match the state
    produced by the transactions, and notify view plugins of the
    change. You should usually call
    [`dispatch`](https://codemirror.net/6/docs/ref/#view.EditorView.dispatch) instead, which uses this
    as a primitive.
    */
    update(transactions) {
        if (this.updateState != 0 /* Idle */)
            throw new Error("Calls to EditorView.update are not allowed while an update is in progress");
        let redrawn = false, update;
        let state = this.state;
        for (let tr of transactions) {
            if (tr.startState != state)
                throw new RangeError("Trying to update state with a transaction that doesn't start from the previous state.");
            state = tr.state;
        }
        if (this.destroyed) {
            this.viewState.state = state;
            return;
        }
        // When the phrases change, redraw the editor
        if (state.facet(EditorState.phrases) != this.state.facet(EditorState.phrases))
            return this.setState(state);
        update = new ViewUpdate(this, state, transactions);
        let scrollTarget = this.viewState.scrollTarget;
        try {
            this.updateState = 2 /* Updating */;
            for (let tr of transactions) {
                if (scrollTarget)
                    scrollTarget = scrollTarget.map(tr.changes);
                if (tr.scrollIntoView) {
                    let { main } = tr.state.selection;
                    scrollTarget = new ScrollTarget(main.empty ? main : EditorSelection.cursor(main.head, main.head > main.anchor ? -1 : 1));
                }
                for (let e of tr.effects) {
                    if (e.is(scrollTo))
                        scrollTarget = new ScrollTarget(e.value);
                    else if (e.is(centerOn))
                        scrollTarget = new ScrollTarget(e.value, "center");
                    else if (e.is(scrollIntoView))
                        scrollTarget = e.value;
                }
            }
            this.viewState.update(update, scrollTarget);
            this.bidiCache = CachedOrder.update(this.bidiCache, update.changes);
            if (!update.empty) {
                this.updatePlugins(update);
                this.inputState.update(update);
            }
            redrawn = this.docView.update(update);
            if (this.state.facet(styleModule) != this.styleModules)
                this.mountStyles();
            this.updateAttrs();
            this.showAnnouncements(transactions);
            this.docView.updateSelection(redrawn, transactions.some(tr => tr.isUserEvent("select.pointer")));
        }
        finally {
            this.updateState = 0 /* Idle */;
        }
        if (update.startState.facet(theme) != update.state.facet(theme))
            this.viewState.mustMeasureContent = true;
        if (redrawn || scrollTarget || this.viewState.mustEnforceCursorAssoc || this.viewState.mustMeasureContent)
            this.requestMeasure();
        if (!update.empty)
            for (let listener of this.state.facet(updateListener))
                listener(update);
    }
    /**
    Reset the view to the given state. (This will cause the entire
    document to be redrawn and all view plugins to be reinitialized,
    so you should probably only use it when the new state isn't
    derived from the old state. Otherwise, use
    [`dispatch`](https://codemirror.net/6/docs/ref/#view.EditorView.dispatch) instead.)
    */
    setState(newState) {
        if (this.updateState != 0 /* Idle */)
            throw new Error("Calls to EditorView.setState are not allowed while an update is in progress");
        if (this.destroyed) {
            this.viewState.state = newState;
            return;
        }
        this.updateState = 2 /* Updating */;
        let hadFocus = this.hasFocus;
        try {
            for (let plugin of this.plugins)
                plugin.destroy(this);
            this.viewState = new ViewState(newState);
            this.plugins = newState.facet(viewPlugin).map(spec => new PluginInstance(spec));
            this.pluginMap.clear();
            for (let plugin of this.plugins)
                plugin.update(this);
            this.docView = new DocView(this);
            this.inputState.ensureHandlers(this);
            this.mountStyles();
            this.updateAttrs();
            this.bidiCache = [];
        }
        finally {
            this.updateState = 0 /* Idle */;
        }
        if (hadFocus)
            this.focus();
        this.requestMeasure();
    }
    updatePlugins(update) {
        let prevSpecs = update.startState.facet(viewPlugin), specs = update.state.facet(viewPlugin);
        if (prevSpecs != specs) {
            let newPlugins = [];
            for (let spec of specs) {
                let found = prevSpecs.indexOf(spec);
                if (found < 0) {
                    newPlugins.push(new PluginInstance(spec));
                }
                else {
                    let plugin = this.plugins[found];
                    plugin.mustUpdate = update;
                    newPlugins.push(plugin);
                }
            }
            for (let plugin of this.plugins)
                if (plugin.mustUpdate != update)
                    plugin.destroy(this);
            this.plugins = newPlugins;
            this.pluginMap.clear();
            this.inputState.ensureHandlers(this);
        }
        else {
            for (let p of this.plugins)
                p.mustUpdate = update;
        }
        for (let i = 0; i < this.plugins.length; i++)
            this.plugins[i].update(this);
    }
    /**
    @internal
    */
    measure(flush = true) {
        if (this.destroyed)
            return;
        if (this.measureScheduled > -1)
            cancelAnimationFrame(this.measureScheduled);
        this.measureScheduled = 0; // Prevent requestMeasure calls from scheduling another animation frame
        if (flush)
            this.observer.flush();
        let updated = null;
        try {
            for (let i = 0;; i++) {
                this.updateState = 1 /* Measuring */;
                let oldViewport = this.viewport;
                let changed = this.viewState.measure(this);
                if (!changed && !this.measureRequests.length && this.viewState.scrollTarget == null)
                    break;
                if (i > 5) {
                    console.warn(this.measureRequests.length
                        ? "Measure loop restarted more than 5 times"
                        : "Viewport failed to stabilize");
                    break;
                }
                let measuring = [];
                // Only run measure requests in this cycle when the viewport didn't change
                if (!(changed & 4 /* Viewport */))
                    [this.measureRequests, measuring] = [measuring, this.measureRequests];
                let measured = measuring.map(m => {
                    try {
                        return m.read(this);
                    }
                    catch (e) {
                        logException(this.state, e);
                        return BadMeasure;
                    }
                });
                let update = new ViewUpdate(this, this.state), redrawn = false, scrolled = false;
                update.flags |= changed;
                if (!updated)
                    updated = update;
                else
                    updated.flags |= changed;
                this.updateState = 2 /* Updating */;
                if (!update.empty) {
                    this.updatePlugins(update);
                    this.inputState.update(update);
                    this.updateAttrs();
                    redrawn = this.docView.update(update);
                }
                for (let i = 0; i < measuring.length; i++)
                    if (measured[i] != BadMeasure) {
                        try {
                            let m = measuring[i];
                            if (m.write)
                                m.write(measured[i], this);
                        }
                        catch (e) {
                            logException(this.state, e);
                        }
                    }
                if (this.viewState.scrollTarget) {
                    this.docView.scrollIntoView(this.viewState.scrollTarget);
                    this.viewState.scrollTarget = null;
                    scrolled = true;
                }
                if (redrawn)
                    this.docView.updateSelection(true);
                if (this.viewport.from == oldViewport.from && this.viewport.to == oldViewport.to &&
                    !scrolled && this.measureRequests.length == 0)
                    break;
            }
        }
        finally {
            this.updateState = 0 /* Idle */;
            this.measureScheduled = -1;
        }
        if (updated && !updated.empty)
            for (let listener of this.state.facet(updateListener))
                listener(updated);
    }
    /**
    Get the CSS classes for the currently active editor themes.
    */
    get themeClasses() {
        return baseThemeID + " " +
            (this.state.facet(darkTheme) ? baseDarkID : baseLightID) + " " +
            this.state.facet(theme);
    }
    updateAttrs() {
        let editorAttrs = attrsFromFacet(this, editorAttributes, {
            class: "cm-editor" + (this.hasFocus ? " cm-focused " : " ") + this.themeClasses
        });
        let contentAttrs = {
            spellcheck: "false",
            autocorrect: "off",
            autocapitalize: "off",
            translate: "no",
            contenteditable: !this.state.facet(editable) ? "false" : "true",
            class: "cm-content",
            style: `${browser.tabSize}: ${this.state.tabSize}`,
            role: "textbox",
            "aria-multiline": "true"
        };
        if (this.state.readOnly)
            contentAttrs["aria-readonly"] = "true";
        attrsFromFacet(this, contentAttributes, contentAttrs);
        this.observer.ignore(() => {
            updateAttrs(this.contentDOM, this.contentAttrs, contentAttrs);
            updateAttrs(this.dom, this.editorAttrs, editorAttrs);
        });
        this.editorAttrs = editorAttrs;
        this.contentAttrs = contentAttrs;
    }
    showAnnouncements(trs) {
        let first = true;
        for (let tr of trs)
            for (let effect of tr.effects)
                if (effect.is(EditorView.announce)) {
                    if (first)
                        this.announceDOM.textContent = "";
                    first = false;
                    let div = this.announceDOM.appendChild(document.createElement("div"));
                    div.textContent = effect.value;
                }
    }
    mountStyles() {
        this.styleModules = this.state.facet(styleModule);
        StyleModule.mount(this.root, this.styleModules.concat(baseTheme).reverse());
    }
    readMeasured() {
        if (this.updateState == 2 /* Updating */)
            throw new Error("Reading the editor layout isn't allowed during an update");
        if (this.updateState == 0 /* Idle */ && this.measureScheduled > -1)
            this.measure(false);
    }
    /**
    Schedule a layout measurement, optionally providing callbacks to
    do custom DOM measuring followed by a DOM write phase. Using
    this is preferable reading DOM layout directly from, for
    example, an event handler, because it'll make sure measuring and
    drawing done by other components is synchronized, avoiding
    unnecessary DOM layout computations.
    */
    requestMeasure(request) {
        if (this.measureScheduled < 0)
            this.measureScheduled = requestAnimationFrame(() => this.measure());
        if (request) {
            if (request.key != null)
                for (let i = 0; i < this.measureRequests.length; i++) {
                    if (this.measureRequests[i].key === request.key) {
                        this.measureRequests[i] = request;
                        return;
                    }
                }
            this.measureRequests.push(request);
        }
    }
    /**
    Collect all values provided by the active plugins for a given
    field.
    */
    pluginField(field) {
        let result = [];
        for (let plugin of this.plugins)
            plugin.update(this).takeField(field, result);
        return result;
    }
    /**
    Get the value of a specific plugin, if present. Note that
    plugins that crash can be dropped from a view, so even when you
    know you registered a given plugin, it is recommended to check
    the return value of this method.
    */
    plugin(plugin) {
        let known = this.pluginMap.get(plugin);
        if (known === undefined || known && known.spec != plugin)
            this.pluginMap.set(plugin, known = this.plugins.find(p => p.spec == plugin) || null);
        return known && known.update(this).value;
    }
    /**
    The top position of the document, in screen coordinates. This
    may be negative when the editor is scrolled down. Points
    directly to the top of the first line, not above the padding.
    */
    get documentTop() {
        return this.contentDOM.getBoundingClientRect().top + this.viewState.paddingTop;
    }
    /**
    Reports the padding above and below the document.
    */
    get documentPadding() {
        return { top: this.viewState.paddingTop, bottom: this.viewState.paddingBottom };
    }
    /**
    Find the line or block widget at the given vertical position.
    
    By default, this position is interpreted as a screen position,
    meaning `docTop` is set to the DOM top position of the editor
    content (forcing a layout). You can pass a different `docTop`
    value—for example 0 to interpret `height` as a document-relative
    position, or a precomputed document top
    (`view.contentDOM.getBoundingClientRect().top`) to limit layout
    queries.
    
    *Deprecated: use `elementAtHeight` instead.*
    */
    blockAtHeight(height, docTop) {
        let top = ensureTop(docTop, this);
        return this.elementAtHeight(height - top).moveY(top);
    }
    /**
    Find the text line or block widget at the given vertical
    position (which is interpreted as relative to the [top of the
    document](https://codemirror.net/6/docs/ref/#view.EditorView.documentTop)
    */
    elementAtHeight(height) {
        this.readMeasured();
        return this.viewState.elementAtHeight(height);
    }
    /**
    Find information for the visual line (see
    [`visualLineAt`](https://codemirror.net/6/docs/ref/#view.EditorView.visualLineAt)) at the given
    vertical position. The resulting block info might hold another
    array of block info structs in its `type` field if this line
    consists of more than one block.
    
    Defaults to treating `height` as a screen position. See
    [`blockAtHeight`](https://codemirror.net/6/docs/ref/#view.EditorView.blockAtHeight) for the
    interpretation of the `docTop` parameter.
    
    *Deprecated: use `lineBlockAtHeight` instead.*
    */
    visualLineAtHeight(height, docTop) {
        let top = ensureTop(docTop, this);
        return this.lineBlockAtHeight(height - top).moveY(top);
    }
    /**
    Find the line block (see
    [`lineBlockAt`](https://codemirror.net/6/docs/ref/#view.EditorView.lineBlockAt) at the given
    height.
    */
    lineBlockAtHeight(height) {
        this.readMeasured();
        return this.viewState.lineBlockAtHeight(height);
    }
    /**
    Iterate over the height information of the visual lines in the
    viewport. The heights of lines are reported relative to the
    given document top, which defaults to the screen position of the
    document (forcing a layout).
    
    *Deprecated: use `viewportLineBlocks` instead.*
    */
    viewportLines(f, docTop) {
        let top = ensureTop(docTop, this);
        for (let line of this.viewportLineBlocks)
            f(line.moveY(top));
    }
    /**
    Get the extent and vertical position of all [line
    blocks](https://codemirror.net/6/docs/ref/#view.EditorView.lineBlockAt) in the viewport. Positions
    are relative to the [top of the
    document](https://codemirror.net/6/docs/ref/#view.EditorView.documentTop);
    */
    get viewportLineBlocks() {
        return this.viewState.viewportLines;
    }
    /**
    Find the extent and height of the visual line (a range delimited
    on both sides by either non-[hidden](https://codemirror.net/6/docs/ref/#view.Decoration^range)
    line breaks, or the start/end of the document) at the given position.
    
    Vertical positions are computed relative to the `docTop`
    argument, which defaults to 0 for this method. You can pass
    `view.contentDOM.getBoundingClientRect().top` here to get screen
    coordinates.
    
    *Deprecated: use `lineBlockAt` instead.*
    */
    visualLineAt(pos, docTop = 0) {
        return this.lineBlockAt(pos).moveY(docTop + this.viewState.paddingTop);
    }
    /**
    Find the line block around the given document position. A line
    block is a range delimited on both sides by either a
    non-[hidden](https://codemirror.net/6/docs/ref/#view.Decoration^range) line breaks, or the
    start/end of the document. It will usually just hold a line of
    text, but may be broken into multiple textblocks by block
    widgets.
    */
    lineBlockAt(pos) {
        return this.viewState.lineBlockAt(pos);
    }
    /**
    The editor's total content height.
    */
    get contentHeight() {
        return this.viewState.contentHeight;
    }
    /**
    Move a cursor position by [grapheme
    cluster](https://codemirror.net/6/docs/ref/#text.findClusterBreak). `forward` determines whether
    the motion is away from the line start, or towards it. Motion in
    bidirectional text is in visual order, in the editor's [text
    direction](https://codemirror.net/6/docs/ref/#view.EditorView.textDirection). When the start
    position was the last one on the line, the returned position
    will be across the line break. If there is no further line, the
    original position is returned.
    
    By default, this method moves over a single cluster. The
    optional `by` argument can be used to move across more. It will
    be called with the first cluster as argument, and should return
    a predicate that determines, for each subsequent cluster,
    whether it should also be moved over.
    */
    moveByChar(start, forward, by) {
        return skipAtoms(this, start, moveByChar(this, start, forward, by));
    }
    /**
    Move a cursor position across the next group of either
    [letters](https://codemirror.net/6/docs/ref/#state.EditorState.charCategorizer) or non-letter
    non-whitespace characters.
    */
    moveByGroup(start, forward) {
        return skipAtoms(this, start, moveByChar(this, start, forward, initial => byGroup(this, start.head, initial)));
    }
    /**
    Move to the next line boundary in the given direction. If
    `includeWrap` is true, line wrapping is on, and there is a
    further wrap point on the current line, the wrap point will be
    returned. Otherwise this function will return the start or end
    of the line.
    */
    moveToLineBoundary(start, forward, includeWrap = true) {
        return moveToLineBoundary(this, start, forward, includeWrap);
    }
    /**
    Move a cursor position vertically. When `distance` isn't given,
    it defaults to moving to the next line (including wrapped
    lines). Otherwise, `distance` should provide a positive distance
    in pixels.
    
    When `start` has a
    [`goalColumn`](https://codemirror.net/6/docs/ref/#state.SelectionRange.goalColumn), the vertical
    motion will use that as a target horizontal position. Otherwise,
    the cursor's own horizontal position is used. The returned
    cursor will have its goal column set to whichever column was
    used.
    */
    moveVertically(start, forward, distance) {
        return skipAtoms(this, start, moveVertically(this, start, forward, distance));
    }
    // FIXME remove on next major version
    scrollPosIntoView(pos) {
        this.dispatch({ effects: scrollTo.of(EditorSelection.cursor(pos)) });
    }
    /**
    Find the DOM parent node and offset (child offset if `node` is
    an element, character offset when it is a text node) at the
    given document position.
    
    Note that for positions that aren't currently in
    `visibleRanges`, the resulting DOM position isn't necessarily
    meaningful (it may just point before or after a placeholder
    element).
    */
    domAtPos(pos) {
        return this.docView.domAtPos(pos);
    }
    /**
    Find the document position at the given DOM node. Can be useful
    for associating positions with DOM events. Will raise an error
    when `node` isn't part of the editor content.
    */
    posAtDOM(node, offset = 0) {
        return this.docView.posFromDOM(node, offset);
    }
    posAtCoords(coords, precise = true) {
        this.readMeasured();
        return posAtCoords(this, coords, precise);
    }
    /**
    Get the screen coordinates at the given document position.
    `side` determines whether the coordinates are based on the
    element before (-1) or after (1) the position (if no element is
    available on the given side, the method will transparently use
    another strategy to get reasonable coordinates).
    */
    coordsAtPos(pos, side = 1) {
        this.readMeasured();
        let rect = this.docView.coordsAt(pos, side);
        if (!rect || rect.left == rect.right)
            return rect;
        let line = this.state.doc.lineAt(pos), order = this.bidiSpans(line);
        let span = order[BidiSpan.find(order, pos - line.from, -1, side)];
        return flattenRect(rect, (span.dir == Direction.LTR) == (side > 0));
    }
    /**
    The default width of a character in the editor. May not
    accurately reflect the width of all characters (given variable
    width fonts or styling of invididual ranges).
    */
    get defaultCharacterWidth() { return this.viewState.heightOracle.charWidth; }
    /**
    The default height of a line in the editor. May not be accurate
    for all lines.
    */
    get defaultLineHeight() { return this.viewState.heightOracle.lineHeight; }
    /**
    The text direction
    ([`direction`](https://developer.mozilla.org/en-US/docs/Web/CSS/direction)
    CSS property) of the editor.
    */
    get textDirection() { return this.viewState.heightOracle.direction; }
    /**
    Whether this editor [wraps lines](https://codemirror.net/6/docs/ref/#view.EditorView.lineWrapping)
    (as determined by the
    [`white-space`](https://developer.mozilla.org/en-US/docs/Web/CSS/white-space)
    CSS property of its content element).
    */
    get lineWrapping() { return this.viewState.heightOracle.lineWrapping; }
    /**
    Returns the bidirectional text structure of the given line
    (which should be in the current document) as an array of span
    objects. The order of these spans matches the [text
    direction](https://codemirror.net/6/docs/ref/#view.EditorView.textDirection)—if that is
    left-to-right, the leftmost spans come first, otherwise the
    rightmost spans come first.
    */
    bidiSpans(line) {
        if (line.length > MaxBidiLine)
            return trivialOrder(line.length);
        let dir = this.textDirection;
        for (let entry of this.bidiCache)
            if (entry.from == line.from && entry.dir == dir)
                return entry.order;
        let order = computeOrder(line.text, this.textDirection);
        this.bidiCache.push(new CachedOrder(line.from, line.to, dir, order));
        return order;
    }
    /**
    Check whether the editor has focus.
    */
    get hasFocus() {
        var _a;
        // Safari return false for hasFocus when the context menu is open
        // or closing, which leads us to ignore selection changes from the
        // context menu because it looks like the editor isn't focused.
        // This kludges around that.
        return (document.hasFocus() || browser.safari && ((_a = this.inputState) === null || _a === void 0 ? void 0 : _a.lastContextMenu) > Date.now() - 3e4) &&
            this.root.activeElement == this.contentDOM;
    }
    /**
    Put focus on the editor.
    */
    focus() {
        this.observer.ignore(() => {
            focusPreventScroll(this.contentDOM);
            this.docView.updateSelection();
        });
    }
    /**
    Clean up this editor view, removing its element from the
    document, unregistering event handlers, and notifying
    plugins. The view instance can no longer be used after
    calling this.
    */
    destroy() {
        for (let plugin of this.plugins)
            plugin.destroy(this);
        this.plugins = [];
        this.inputState.destroy();
        this.dom.remove();
        this.observer.destroy();
        if (this.measureScheduled > -1)
            cancelAnimationFrame(this.measureScheduled);
        this.destroyed = true;
    }
    /**
    Returns an effect that can be
    [added](https://codemirror.net/6/docs/ref/#state.TransactionSpec.effects) to a transaction to
    cause it to scroll the given position or range into view.
    */
    static scrollIntoView(pos, options = {}) {
        return scrollIntoView.of(new ScrollTarget(typeof pos == "number" ? EditorSelection.cursor(pos) : pos, options.y, options.x, options.yMargin, options.xMargin));
    }
    /**
    Facet that can be used to add DOM event handlers. The value
    should be an object mapping event names to handler functions. The
    first such function to return true will be assumed to have handled
    that event, and no other handlers or built-in behavior will be
    activated for it.
    These are registered on the [content
    element](https://codemirror.net/6/docs/ref/#view.EditorView.contentDOM), except for `scroll`
    handlers, which will be called any time the editor's [scroll
    element](https://codemirror.net/6/docs/ref/#view.EditorView.scrollDOM) or one of its parent nodes
    is scrolled.
    */
    static domEventHandlers(handlers) {
        return ViewPlugin.define(() => ({}), { eventHandlers: handlers });
    }
    /**
    Create a theme extension. The first argument can be a
    [`style-mod`](https://github.com/marijnh/style-mod#documentation)
    style spec providing the styles for the theme. These will be
    prefixed with a generated class for the style.
    
    Because the selectors will be prefixed with a scope class, rule
    that directly match the editor's [wrapper
    element](https://codemirror.net/6/docs/ref/#view.EditorView.dom)—to which the scope class will be
    added—need to be explicitly differentiated by adding an `&` to
    the selector for that element—for example
    `&.cm-focused`.
    
    When `dark` is set to true, the theme will be marked as dark,
    which will cause the `&dark` rules from [base
    themes](https://codemirror.net/6/docs/ref/#view.EditorView^baseTheme) to be used (as opposed to
    `&light` when a light theme is active).
    */
    static theme(spec, options) {
        let prefix = StyleModule.newName();
        let result = [theme.of(prefix), styleModule.of(buildTheme(`.${prefix}`, spec))];
        if (options && options.dark)
            result.push(darkTheme.of(true));
        return result;
    }
    /**
    Create an extension that adds styles to the base theme. Like
    with [`theme`](https://codemirror.net/6/docs/ref/#view.EditorView^theme), use `&` to indicate the
    place of the editor wrapper element when directly targeting
    that. You can also use `&dark` or `&light` instead to only
    target editors with a dark or light theme.
    */
    static baseTheme(spec) {
        return Prec.lowest(styleModule.of(buildTheme("." + baseThemeID, spec, lightDarkIDs)));
    }
}
/**
Effect that can be [added](https://codemirror.net/6/docs/ref/#state.TransactionSpec.effects) to a
transaction to make it scroll the given range into view.

*Deprecated*. Use [`scrollIntoView`](https://codemirror.net/6/docs/ref/#view.EditorView^scrollIntoView) instead.
*/
EditorView.scrollTo = scrollTo;
/**
Effect that makes the editor scroll the given range to the
center of the visible view.

*Deprecated*. Use [`scrollIntoView`](https://codemirror.net/6/docs/ref/#view.EditorView^scrollIntoView) instead.
*/
EditorView.centerOn = centerOn;
/**
Facet to add a [style
module](https://github.com/marijnh/style-mod#documentation) to
an editor view. The view will ensure that the module is
mounted in its [document
root](https://codemirror.net/6/docs/ref/#view.EditorView.constructor^config.root).
*/
EditorView.styleModule = styleModule;
/**
An input handler can override the way changes to the editable
DOM content are handled. Handlers are passed the document
positions between which the change was found, and the new
content. When one returns true, no further input handlers are
called and the default behavior is prevented.
*/
EditorView.inputHandler = inputHandler;
/**
Allows you to provide a function that should be called when the
library catches an exception from an extension (mostly from view
plugins, but may be used by other extensions to route exceptions
from user-code-provided callbacks). This is mostly useful for
debugging and logging. See [`logException`](https://codemirror.net/6/docs/ref/#view.logException).
*/
EditorView.exceptionSink = exceptionSink;
/**
A facet that can be used to register a function to be called
every time the view updates.
*/
EditorView.updateListener = updateListener;
/**
Facet that controls whether the editor content DOM is editable.
When its highest-precedence value is `false`, the element will
not longer have its `contenteditable` attribute set. (Note that
this doesn't affect API calls that change the editor content,
even when those are bound to keys or buttons. See the
[`readOnly`](https://codemirror.net/6/docs/ref/#state.EditorState.readOnly) facet for that.)
*/
EditorView.editable = editable;
/**
Allows you to influence the way mouse selection happens. The
functions in this facet will be called for a `mousedown` event
on the editor, and can return an object that overrides the way a
selection is computed from that mouse click or drag.
*/
EditorView.mouseSelectionStyle = mouseSelectionStyle;
/**
Facet used to configure whether a given selection drag event
should move or copy the selection. The given predicate will be
called with the `mousedown` event, and can return `true` when
the drag should move the content.
*/
EditorView.dragMovesSelection = dragMovesSelection$1;
/**
Facet used to configure whether a given selecting click adds
a new range to the existing selection or replaces it entirely.
*/
EditorView.clickAddsSelectionRange = clickAddsSelectionRange;
/**
A facet that determines which [decorations](https://codemirror.net/6/docs/ref/#view.Decoration)
are shown in the view. See also [view
plugins](https://codemirror.net/6/docs/ref/#view.EditorView^decorations), which have a separate
mechanism for providing decorations.
*/
EditorView.decorations = decorations;
/**
This facet records whether a dark theme is active. The extension
returned by [`theme`](https://codemirror.net/6/docs/ref/#view.EditorView^theme) automatically
includes an instance of this when the `dark` option is set to
true.
*/
EditorView.darkTheme = darkTheme;
/**
Facet that provides additional DOM attributes for the editor's
editable DOM element.
*/
EditorView.contentAttributes = contentAttributes;
/**
Facet that provides DOM attributes for the editor's outer
element.
*/
EditorView.editorAttributes = editorAttributes;
/**
An extension that enables line wrapping in the editor (by
setting CSS `white-space` to `pre-wrap` in the content).
*/
EditorView.lineWrapping = /*@__PURE__*/EditorView.contentAttributes.of({ "class": "cm-lineWrapping" });
/**
State effect used to include screen reader announcements in a
transaction. These will be added to the DOM in a visually hidden
element with `aria-live="polite"` set, and should be used to
describe effects that are visually obvious but may not be
noticed by screen reader users (such as moving to the next
search match).
*/
EditorView.announce = /*@__PURE__*/StateEffect.define();
// Maximum line length for which we compute accurate bidi info
const MaxBidiLine = 4096;
// FIXME remove this and its callers on next breaking release
function ensureTop(given, view) {
    return (given == null ? view.contentDOM.getBoundingClientRect().top : given) + view.viewState.paddingTop;
}
const BadMeasure = {};
class CachedOrder {
    constructor(from, to, dir, order) {
        this.from = from;
        this.to = to;
        this.dir = dir;
        this.order = order;
    }
    static update(cache, changes) {
        if (changes.empty)
            return cache;
        let result = [], lastDir = cache.length ? cache[cache.length - 1].dir : Direction.LTR;
        for (let i = Math.max(0, cache.length - 10); i < cache.length; i++) {
            let entry = cache[i];
            if (entry.dir == lastDir && !changes.touchesRange(entry.from, entry.to))
                result.push(new CachedOrder(changes.mapPos(entry.from, 1), changes.mapPos(entry.to, -1), entry.dir, entry.order));
        }
        return result;
    }
}
function attrsFromFacet(view, facet, base) {
    for (let sources = view.state.facet(facet), i = sources.length - 1; i >= 0; i--) {
        let source = sources[i], value = typeof source == "function" ? source(view) : source;
        if (value)
            combineAttrs(value, base);
    }
    return base;
}

const currentPlatform = browser.mac ? "mac" : browser.windows ? "win" : browser.linux ? "linux" : "key";
function normalizeKeyName(name, platform) {
    const parts = name.split(/-(?!$)/);
    let result = parts[parts.length - 1];
    if (result == "Space")
        result = " ";
    let alt, ctrl, shift, meta;
    for (let i = 0; i < parts.length - 1; ++i) {
        const mod = parts[i];
        if (/^(cmd|meta|m)$/i.test(mod))
            meta = true;
        else if (/^a(lt)?$/i.test(mod))
            alt = true;
        else if (/^(c|ctrl|control)$/i.test(mod))
            ctrl = true;
        else if (/^s(hift)?$/i.test(mod))
            shift = true;
        else if (/^mod$/i.test(mod)) {
            if (platform == "mac")
                meta = true;
            else
                ctrl = true;
        }
        else
            throw new Error("Unrecognized modifier name: " + mod);
    }
    if (alt)
        result = "Alt-" + result;
    if (ctrl)
        result = "Ctrl-" + result;
    if (meta)
        result = "Meta-" + result;
    if (shift)
        result = "Shift-" + result;
    return result;
}
function modifiers(name, event, shift) {
    if (event.altKey)
        name = "Alt-" + name;
    if (event.ctrlKey)
        name = "Ctrl-" + name;
    if (event.metaKey)
        name = "Meta-" + name;
    if (shift !== false && event.shiftKey)
        name = "Shift-" + name;
    return name;
}
const handleKeyEvents = /*@__PURE__*/EditorView.domEventHandlers({
    keydown(event, view) {
        return runHandlers(getKeymap(view.state), event, view, "editor");
    }
});
/**
Facet used for registering keymaps.

You can add multiple keymaps to an editor. Their priorities
determine their precedence (the ones specified early or with high
priority get checked first). When a handler has returned `true`
for a given key, no further handlers are called.
*/
const keymap = /*@__PURE__*/Facet.define({ enables: handleKeyEvents });
const Keymaps = /*@__PURE__*/new WeakMap();
// This is hidden behind an indirection, rather than directly computed
// by the facet, to keep internal types out of the facet's type.
function getKeymap(state) {
    let bindings = state.facet(keymap);
    let map = Keymaps.get(bindings);
    if (!map)
        Keymaps.set(bindings, map = buildKeymap(bindings.reduce((a, b) => a.concat(b), [])));
    return map;
}
/**
Run the key handlers registered for a given scope. The event
object should be `"keydown"` event. Returns true if any of the
handlers handled it.
*/
function runScopeHandlers(view, event, scope) {
    return runHandlers(getKeymap(view.state), event, view, scope);
}
let storedPrefix = null;
const PrefixTimeout = 4000;
function buildKeymap(bindings, platform = currentPlatform) {
    let bound = Object.create(null);
    let isPrefix = Object.create(null);
    let checkPrefix = (name, is) => {
        let current = isPrefix[name];
        if (current == null)
            isPrefix[name] = is;
        else if (current != is)
            throw new Error("Key binding " + name + " is used both as a regular binding and as a multi-stroke prefix");
    };
    let add = (scope, key, command, preventDefault) => {
        let scopeObj = bound[scope] || (bound[scope] = Object.create(null));
        let parts = key.split(/ (?!$)/).map(k => normalizeKeyName(k, platform));
        for (let i = 1; i < parts.length; i++) {
            let prefix = parts.slice(0, i).join(" ");
            checkPrefix(prefix, true);
            if (!scopeObj[prefix])
                scopeObj[prefix] = {
                    preventDefault: true,
                    commands: [(view) => {
                            let ourObj = storedPrefix = { view, prefix, scope };
                            setTimeout(() => { if (storedPrefix == ourObj)
                                storedPrefix = null; }, PrefixTimeout);
                            return true;
                        }]
                };
        }
        let full = parts.join(" ");
        checkPrefix(full, false);
        let binding = scopeObj[full] || (scopeObj[full] = { preventDefault: false, commands: [] });
        binding.commands.push(command);
        if (preventDefault)
            binding.preventDefault = true;
    };
    for (let b of bindings) {
        let name = b[platform] || b.key;
        if (!name)
            continue;
        for (let scope of b.scope ? b.scope.split(" ") : ["editor"]) {
            add(scope, name, b.run, b.preventDefault);
            if (b.shift)
                add(scope, "Shift-" + name, b.shift, b.preventDefault);
        }
    }
    return bound;
}
function runHandlers(map, event, view, scope) {
    let name = keyName(event), isChar = name.length == 1 && name != " ";
    let prefix = "", fallthrough = false;
    if (storedPrefix && storedPrefix.view == view && storedPrefix.scope == scope) {
        prefix = storedPrefix.prefix + " ";
        if (fallthrough = modifierCodes.indexOf(event.keyCode) < 0)
            storedPrefix = null;
    }
    let runFor = (binding) => {
        if (binding) {
            for (let cmd of binding.commands)
                if (cmd(view))
                    return true;
            if (binding.preventDefault)
                fallthrough = true;
        }
        return false;
    };
    let scopeObj = map[scope], baseName;
    if (scopeObj) {
        if (runFor(scopeObj[prefix + modifiers(name, event, !isChar)]))
            return true;
        if (isChar && (event.shiftKey || event.altKey || event.metaKey) &&
            (baseName = base[event.keyCode]) && baseName != name) {
            if (runFor(scopeObj[prefix + modifiers(baseName, event, true)]))
                return true;
        }
        else if (isChar && event.shiftKey) {
            if (runFor(scopeObj[prefix + modifiers(name, event, true)]))
                return true;
        }
    }
    return fallthrough;
}

const CanHidePrimary = !browser.ios; // FIXME test IE
const selectionConfig = /*@__PURE__*/Facet.define({
    combine(configs) {
        return combineConfig(configs, {
            cursorBlinkRate: 1200,
            drawRangeCursor: true
        }, {
            cursorBlinkRate: (a, b) => Math.min(a, b),
            drawRangeCursor: (a, b) => a || b
        });
    }
});
/**
Returns an extension that hides the browser's native selection and
cursor, replacing the selection with a background behind the text
(with the `cm-selectionBackground` class), and the
cursors with elements overlaid over the code (using
`cm-cursor-primary` and `cm-cursor-secondary`).

This allows the editor to display secondary selection ranges, and
tends to produce a type of selection more in line with that users
expect in a text editor (the native selection styling will often
leave gaps between lines and won't fill the horizontal space after
a line when the selection continues past it).

It does have a performance cost, in that it requires an extra DOM
layout cycle for many updates (the selection is drawn based on DOM
layout information that's only available after laying out the
content).
*/
function drawSelection(config = {}) {
    return [
        selectionConfig.of(config),
        drawSelectionPlugin,
        hideNativeSelection
    ];
}
class Piece {
    constructor(left, top, width, height, className) {
        this.left = left;
        this.top = top;
        this.width = width;
        this.height = height;
        this.className = className;
    }
    draw() {
        let elt = document.createElement("div");
        elt.className = this.className;
        this.adjust(elt);
        return elt;
    }
    adjust(elt) {
        elt.style.left = this.left + "px";
        elt.style.top = this.top + "px";
        if (this.width >= 0)
            elt.style.width = this.width + "px";
        elt.style.height = this.height + "px";
    }
    eq(p) {
        return this.left == p.left && this.top == p.top && this.width == p.width && this.height == p.height &&
            this.className == p.className;
    }
}
const drawSelectionPlugin = /*@__PURE__*/ViewPlugin.fromClass(class {
    constructor(view) {
        this.view = view;
        this.rangePieces = [];
        this.cursors = [];
        this.measureReq = { read: this.readPos.bind(this), write: this.drawSel.bind(this) };
        this.selectionLayer = view.scrollDOM.appendChild(document.createElement("div"));
        this.selectionLayer.className = "cm-selectionLayer";
        this.selectionLayer.setAttribute("aria-hidden", "true");
        this.cursorLayer = view.scrollDOM.appendChild(document.createElement("div"));
        this.cursorLayer.className = "cm-cursorLayer";
        this.cursorLayer.setAttribute("aria-hidden", "true");
        view.requestMeasure(this.measureReq);
        this.setBlinkRate();
    }
    setBlinkRate() {
        this.cursorLayer.style.animationDuration = this.view.state.facet(selectionConfig).cursorBlinkRate + "ms";
    }
    update(update) {
        let confChanged = update.startState.facet(selectionConfig) != update.state.facet(selectionConfig);
        if (confChanged || update.selectionSet || update.geometryChanged || update.viewportChanged)
            this.view.requestMeasure(this.measureReq);
        if (update.transactions.some(tr => tr.scrollIntoView))
            this.cursorLayer.style.animationName = this.cursorLayer.style.animationName == "cm-blink" ? "cm-blink2" : "cm-blink";
        if (confChanged)
            this.setBlinkRate();
    }
    readPos() {
        let { state } = this.view, conf = state.facet(selectionConfig);
        let rangePieces = state.selection.ranges.map(r => r.empty ? [] : measureRange(this.view, r)).reduce((a, b) => a.concat(b));
        let cursors = [];
        for (let r of state.selection.ranges) {
            let prim = r == state.selection.main;
            if (r.empty ? !prim || CanHidePrimary : conf.drawRangeCursor) {
                let piece = measureCursor(this.view, r, prim);
                if (piece)
                    cursors.push(piece);
            }
        }
        return { rangePieces, cursors };
    }
    drawSel({ rangePieces, cursors }) {
        if (rangePieces.length != this.rangePieces.length || rangePieces.some((p, i) => !p.eq(this.rangePieces[i]))) {
            this.selectionLayer.textContent = "";
            for (let p of rangePieces)
                this.selectionLayer.appendChild(p.draw());
            this.rangePieces = rangePieces;
        }
        if (cursors.length != this.cursors.length || cursors.some((c, i) => !c.eq(this.cursors[i]))) {
            let oldCursors = this.cursorLayer.children;
            if (oldCursors.length !== cursors.length) {
                this.cursorLayer.textContent = "";
                for (const c of cursors)
                    this.cursorLayer.appendChild(c.draw());
            }
            else {
                cursors.forEach((c, idx) => c.adjust(oldCursors[idx]));
            }
            this.cursors = cursors;
        }
    }
    destroy() {
        this.selectionLayer.remove();
        this.cursorLayer.remove();
    }
});
const themeSpec = {
    ".cm-line": {
        "& ::selection": { backgroundColor: "transparent !important" },
        "&::selection": { backgroundColor: "transparent !important" }
    }
};
if (CanHidePrimary)
    themeSpec[".cm-line"].caretColor = "transparent !important";
const hideNativeSelection = /*@__PURE__*/Prec.highest(/*@__PURE__*/EditorView.theme(themeSpec));
function getBase(view) {
    let rect = view.scrollDOM.getBoundingClientRect();
    let left = view.textDirection == Direction.LTR ? rect.left : rect.right - view.scrollDOM.clientWidth;
    return { left: left - view.scrollDOM.scrollLeft, top: rect.top - view.scrollDOM.scrollTop };
}
function wrappedLine(view, pos, inside) {
    let range = EditorSelection.cursor(pos);
    return { from: Math.max(inside.from, view.moveToLineBoundary(range, false, true).from),
        to: Math.min(inside.to, view.moveToLineBoundary(range, true, true).from),
        type: BlockType.Text };
}
function blockAt(view, pos) {
    let line = view.lineBlockAt(pos);
    if (Array.isArray(line.type))
        for (let l of line.type) {
            if (l.to > pos || l.to == pos && (l.to == line.to || l.type == BlockType.Text))
                return l;
        }
    return line;
}
function measureRange(view, range) {
    if (range.to <= view.viewport.from || range.from >= view.viewport.to)
        return [];
    let from = Math.max(range.from, view.viewport.from), to = Math.min(range.to, view.viewport.to);
    let ltr = view.textDirection == Direction.LTR;
    let content = view.contentDOM, contentRect = content.getBoundingClientRect(), base = getBase(view);
    let lineStyle = window.getComputedStyle(content.firstChild);
    let leftSide = contentRect.left + parseInt(lineStyle.paddingLeft) + Math.min(0, parseInt(lineStyle.textIndent));
    let rightSide = contentRect.right - parseInt(lineStyle.paddingRight);
    let startBlock = blockAt(view, from), endBlock = blockAt(view, to);
    let visualStart = startBlock.type == BlockType.Text ? startBlock : null;
    let visualEnd = endBlock.type == BlockType.Text ? endBlock : null;
    if (view.lineWrapping) {
        if (visualStart)
            visualStart = wrappedLine(view, from, visualStart);
        if (visualEnd)
            visualEnd = wrappedLine(view, to, visualEnd);
    }
    if (visualStart && visualEnd && visualStart.from == visualEnd.from) {
        return pieces(drawForLine(range.from, range.to, visualStart));
    }
    else {
        let top = visualStart ? drawForLine(range.from, null, visualStart) : drawForWidget(startBlock, false);
        let bottom = visualEnd ? drawForLine(null, range.to, visualEnd) : drawForWidget(endBlock, true);
        let between = [];
        if ((visualStart || startBlock).to < (visualEnd || endBlock).from - 1)
            between.push(piece(leftSide, top.bottom, rightSide, bottom.top));
        else if (top.bottom < bottom.top && view.elementAtHeight((top.bottom + bottom.top) / 2).type == BlockType.Text)
            top.bottom = bottom.top = (top.bottom + bottom.top) / 2;
        return pieces(top).concat(between).concat(pieces(bottom));
    }
    function piece(left, top, right, bottom) {
        return new Piece(left - base.left, top - base.top - 0.01 /* Epsilon */, right - left, bottom - top + 0.01 /* Epsilon */, "cm-selectionBackground");
    }
    function pieces({ top, bottom, horizontal }) {
        let pieces = [];
        for (let i = 0; i < horizontal.length; i += 2)
            pieces.push(piece(horizontal[i], top, horizontal[i + 1], bottom));
        return pieces;
    }
    // Gets passed from/to in line-local positions
    function drawForLine(from, to, line) {
        let top = 1e9, bottom = -1e9, horizontal = [];
        function addSpan(from, fromOpen, to, toOpen, dir) {
            // Passing 2/-2 is a kludge to force the view to return
            // coordinates on the proper side of block widgets, since
            // normalizing the side there, though appropriate for most
            // coordsAtPos queries, would break selection drawing.
            let fromCoords = view.coordsAtPos(from, (from == line.to ? -2 : 2));
            let toCoords = view.coordsAtPos(to, (to == line.from ? 2 : -2));
            top = Math.min(fromCoords.top, toCoords.top, top);
            bottom = Math.max(fromCoords.bottom, toCoords.bottom, bottom);
            if (dir == Direction.LTR)
                horizontal.push(ltr && fromOpen ? leftSide : fromCoords.left, ltr && toOpen ? rightSide : toCoords.right);
            else
                horizontal.push(!ltr && toOpen ? leftSide : toCoords.left, !ltr && fromOpen ? rightSide : fromCoords.right);
        }
        let start = from !== null && from !== void 0 ? from : line.from, end = to !== null && to !== void 0 ? to : line.to;
        // Split the range by visible range and document line
        for (let r of view.visibleRanges)
            if (r.to > start && r.from < end) {
                for (let pos = Math.max(r.from, start), endPos = Math.min(r.to, end);;) {
                    let docLine = view.state.doc.lineAt(pos);
                    for (let span of view.bidiSpans(docLine)) {
                        let spanFrom = span.from + docLine.from, spanTo = span.to + docLine.from;
                        if (spanFrom >= endPos)
                            break;
                        if (spanTo > pos)
                            addSpan(Math.max(spanFrom, pos), from == null && spanFrom <= start, Math.min(spanTo, endPos), to == null && spanTo >= end, span.dir);
                    }
                    pos = docLine.to + 1;
                    if (pos >= endPos)
                        break;
                }
            }
        if (horizontal.length == 0)
            addSpan(start, from == null, end, to == null, view.textDirection);
        return { top, bottom, horizontal };
    }
    function drawForWidget(block, top) {
        let y = contentRect.top + (top ? block.top : block.bottom);
        return { top: y, bottom: y, horizontal: [] };
    }
}
function measureCursor(view, cursor, primary) {
    let pos = view.coordsAtPos(cursor.head, cursor.assoc || 1);
    if (!pos)
        return null;
    let base = getBase(view);
    return new Piece(pos.left - base.left, pos.top - base.top, -1, pos.bottom - pos.top, primary ? "cm-cursor cm-cursor-primary" : "cm-cursor cm-cursor-secondary");
}

const setDropCursorPos = /*@__PURE__*/StateEffect.define({
    map(pos, mapping) { return pos == null ? null : mapping.mapPos(pos); }
});
const dropCursorPos = /*@__PURE__*/StateField.define({
    create() { return null; },
    update(pos, tr) {
        if (pos != null)
            pos = tr.changes.mapPos(pos);
        return tr.effects.reduce((pos, e) => e.is(setDropCursorPos) ? e.value : pos, pos);
    }
});
const drawDropCursor = /*@__PURE__*/ViewPlugin.fromClass(class {
    constructor(view) {
        this.view = view;
        this.cursor = null;
        this.measureReq = { read: this.readPos.bind(this), write: this.drawCursor.bind(this) };
    }
    update(update) {
        var _a;
        let cursorPos = update.state.field(dropCursorPos);
        if (cursorPos == null) {
            if (this.cursor != null) {
                (_a = this.cursor) === null || _a === void 0 ? void 0 : _a.remove();
                this.cursor = null;
            }
        }
        else {
            if (!this.cursor) {
                this.cursor = this.view.scrollDOM.appendChild(document.createElement("div"));
                this.cursor.className = "cm-dropCursor";
            }
            if (update.startState.field(dropCursorPos) != cursorPos || update.docChanged || update.geometryChanged)
                this.view.requestMeasure(this.measureReq);
        }
    }
    readPos() {
        let pos = this.view.state.field(dropCursorPos);
        let rect = pos != null && this.view.coordsAtPos(pos);
        if (!rect)
            return null;
        let outer = this.view.scrollDOM.getBoundingClientRect();
        return {
            left: rect.left - outer.left + this.view.scrollDOM.scrollLeft,
            top: rect.top - outer.top + this.view.scrollDOM.scrollTop,
            height: rect.bottom - rect.top
        };
    }
    drawCursor(pos) {
        if (this.cursor) {
            if (pos) {
                this.cursor.style.left = pos.left + "px";
                this.cursor.style.top = pos.top + "px";
                this.cursor.style.height = pos.height + "px";
            }
            else {
                this.cursor.style.left = "-100000px";
            }
        }
    }
    destroy() {
        if (this.cursor)
            this.cursor.remove();
    }
    setDropPos(pos) {
        if (this.view.state.field(dropCursorPos) != pos)
            this.view.dispatch({ effects: setDropCursorPos.of(pos) });
    }
}, {
    eventHandlers: {
        dragover(event) {
            this.setDropPos(this.view.posAtCoords({ x: event.clientX, y: event.clientY }));
        },
        dragleave(event) {
            if (event.target == this.view.contentDOM || !this.view.contentDOM.contains(event.relatedTarget))
                this.setDropPos(null);
        },
        dragend() {
            this.setDropPos(null);
        },
        drop() {
            this.setDropPos(null);
        }
    }
});
/**
Draws a cursor at the current drop position when something is
dragged over the editor.
*/
function dropCursor() {
    return [dropCursorPos, drawDropCursor];
}

function iterMatches(doc, re, from, to, f) {
    re.lastIndex = 0;
    for (let cursor = doc.iterRange(from, to), pos = from, m; !cursor.next().done; pos += cursor.value.length) {
        if (!cursor.lineBreak)
            while (m = re.exec(cursor.value))
                f(pos + m.index, pos + m.index + m[0].length, m);
    }
}
function matchRanges(view, maxLength) {
    let visible = view.visibleRanges;
    if (visible.length == 1 && visible[0].from == view.viewport.from &&
        visible[0].to == view.viewport.to)
        return visible;
    let result = [];
    for (let { from, to } of visible) {
        from = Math.max(view.state.doc.lineAt(from).from, from - maxLength);
        to = Math.min(view.state.doc.lineAt(to).to, to + maxLength);
        if (result.length && result[result.length - 1].to >= from)
            result[result.length - 1].to = to;
        else
            result.push({ from, to });
    }
    return result;
}
/**
Helper class used to make it easier to maintain decorations on
visible code that matches a given regular expression. To be used
in a [view plugin](https://codemirror.net/6/docs/ref/#view.ViewPlugin). Instances of this object
represent a matching configuration.
*/
class MatchDecorator {
    /**
    Create a decorator.
    */
    constructor(config) {
        let { regexp, decoration, boundary, maxLength = 1000 } = config;
        if (!regexp.global)
            throw new RangeError("The regular expression given to MatchDecorator should have its 'g' flag set");
        this.regexp = regexp;
        this.getDeco = typeof decoration == "function" ? decoration : () => decoration;
        this.boundary = boundary;
        this.maxLength = maxLength;
    }
    /**
    Compute the full set of decorations for matches in the given
    view's viewport. You'll want to call this when initializing your
    plugin.
    */
    createDeco(view) {
        let build = new RangeSetBuilder();
        for (let { from, to } of matchRanges(view, this.maxLength))
            iterMatches(view.state.doc, this.regexp, from, to, (a, b, m) => build.add(a, b, this.getDeco(m, view, a)));
        return build.finish();
    }
    /**
    Update a set of decorations for a view update. `deco` _must_ be
    the set of decorations produced by _this_ `MatchDecorator` for
    the view state before the update.
    */
    updateDeco(update, deco) {
        let changeFrom = 1e9, changeTo = -1;
        if (update.docChanged)
            update.changes.iterChanges((_f, _t, from, to) => {
                if (to > update.view.viewport.from && from < update.view.viewport.to) {
                    changeFrom = Math.min(from, changeFrom);
                    changeTo = Math.max(to, changeTo);
                }
            });
        if (update.viewportChanged || changeTo - changeFrom > 1000)
            return this.createDeco(update.view);
        if (changeTo > -1)
            return this.updateRange(update.view, deco.map(update.changes), changeFrom, changeTo);
        return deco;
    }
    updateRange(view, deco, updateFrom, updateTo) {
        for (let r of view.visibleRanges) {
            let from = Math.max(r.from, updateFrom), to = Math.min(r.to, updateTo);
            if (to > from) {
                let fromLine = view.state.doc.lineAt(from), toLine = fromLine.to < to ? view.state.doc.lineAt(to) : fromLine;
                let start = Math.max(r.from, fromLine.from), end = Math.min(r.to, toLine.to);
                if (this.boundary) {
                    for (; from > fromLine.from; from--)
                        if (this.boundary.test(fromLine.text[from - 1 - fromLine.from])) {
                            start = from;
                            break;
                        }
                    for (; to < toLine.to; to++)
                        if (this.boundary.test(toLine.text[to - toLine.from])) {
                            end = to;
                            break;
                        }
                }
                let ranges = [], m;
                if (fromLine == toLine) {
                    this.regexp.lastIndex = start - fromLine.from;
                    while ((m = this.regexp.exec(fromLine.text)) && m.index < end - fromLine.from) {
                        let pos = m.index + fromLine.from;
                        ranges.push(this.getDeco(m, view, pos).range(pos, pos + m[0].length));
                    }
                }
                else {
                    iterMatches(view.state.doc, this.regexp, start, end, (from, to, m) => ranges.push(this.getDeco(m, view, from).range(from, to)));
                }
                deco = deco.update({ filterFrom: start, filterTo: end, filter: (from, to) => from < start || to > end, add: ranges });
            }
        }
        return deco;
    }
}

const UnicodeRegexpSupport = /x/.unicode != null ? "gu" : "g";
const Specials = /*@__PURE__*/new RegExp("[\u0000-\u0008\u000a-\u001f\u007f-\u009f\u00ad\u061c\u200b\u200e\u200f\u2028\u2029\u202d\u202e\ufeff\ufff9-\ufffc]", UnicodeRegexpSupport);
const Names = {
    0: "null",
    7: "bell",
    8: "backspace",
    10: "newline",
    11: "vertical tab",
    13: "carriage return",
    27: "escape",
    8203: "zero width space",
    8204: "zero width non-joiner",
    8205: "zero width joiner",
    8206: "left-to-right mark",
    8207: "right-to-left mark",
    8232: "line separator",
    8237: "left-to-right override",
    8238: "right-to-left override",
    8233: "paragraph separator",
    65279: "zero width no-break space",
    65532: "object replacement"
};
let _supportsTabSize = null;
function supportsTabSize() {
    var _a;
    if (_supportsTabSize == null && typeof document != "undefined" && document.body) {
        let styles = document.body.style;
        _supportsTabSize = ((_a = styles.tabSize) !== null && _a !== void 0 ? _a : styles.MozTabSize) != null;
    }
    return _supportsTabSize || false;
}
const specialCharConfig = /*@__PURE__*/Facet.define({
    combine(configs) {
        let config = combineConfig(configs, {
            render: null,
            specialChars: Specials,
            addSpecialChars: null
        });
        if (config.replaceTabs = !supportsTabSize())
            config.specialChars = new RegExp("\t|" + config.specialChars.source, UnicodeRegexpSupport);
        if (config.addSpecialChars)
            config.specialChars = new RegExp(config.specialChars.source + "|" + config.addSpecialChars.source, UnicodeRegexpSupport);
        return config;
    }
});
/**
Returns an extension that installs highlighting of special
characters.
*/
function highlightSpecialChars(
/**
Configuration options.
*/
config = {}) {
    return [specialCharConfig.of(config), specialCharPlugin()];
}
let _plugin = null;
function specialCharPlugin() {
    return _plugin || (_plugin = ViewPlugin.fromClass(class {
        constructor(view) {
            this.view = view;
            this.decorations = Decoration.none;
            this.decorationCache = Object.create(null);
            this.decorator = this.makeDecorator(view.state.facet(specialCharConfig));
            this.decorations = this.decorator.createDeco(view);
        }
        makeDecorator(conf) {
            return new MatchDecorator({
                regexp: conf.specialChars,
                decoration: (m, view, pos) => {
                    let { doc } = view.state;
                    let code = codePointAt(m[0], 0);
                    if (code == 9) {
                        let line = doc.lineAt(pos);
                        let size = view.state.tabSize, col = countColumn(line.text, size, pos - line.from);
                        return Decoration.replace({ widget: new TabWidget((size - (col % size)) * this.view.defaultCharacterWidth) });
                    }
                    return this.decorationCache[code] ||
                        (this.decorationCache[code] = Decoration.replace({ widget: new SpecialCharWidget(conf, code) }));
                },
                boundary: conf.replaceTabs ? undefined : /[^]/
            });
        }
        update(update) {
            let conf = update.state.facet(specialCharConfig);
            if (update.startState.facet(specialCharConfig) != conf) {
                this.decorator = this.makeDecorator(conf);
                this.decorations = this.decorator.createDeco(update.view);
            }
            else {
                this.decorations = this.decorator.updateDeco(update, this.decorations);
            }
        }
    }, {
        decorations: v => v.decorations
    }));
}
const DefaultPlaceholder = "\u2022";
// Assigns placeholder characters from the Control Pictures block to
// ASCII control characters
function placeholder$1(code) {
    if (code >= 32)
        return DefaultPlaceholder;
    if (code == 10)
        return "\u2424";
    return String.fromCharCode(9216 + code);
}
class SpecialCharWidget extends WidgetType {
    constructor(options, code) {
        super();
        this.options = options;
        this.code = code;
    }
    eq(other) { return other.code == this.code; }
    toDOM(view) {
        let ph = placeholder$1(this.code);
        let desc = view.state.phrase("Control character") + " " + (Names[this.code] || "0x" + this.code.toString(16));
        let custom = this.options.render && this.options.render(this.code, desc, ph);
        if (custom)
            return custom;
        let span = document.createElement("span");
        span.textContent = ph;
        span.title = desc;
        span.setAttribute("aria-label", desc);
        span.className = "cm-specialChar";
        return span;
    }
    ignoreEvent() { return false; }
}
class TabWidget extends WidgetType {
    constructor(width) {
        super();
        this.width = width;
    }
    eq(other) { return other.width == this.width; }
    toDOM() {
        let span = document.createElement("span");
        span.textContent = "\t";
        span.className = "cm-tab";
        span.style.width = this.width + "px";
        return span;
    }
    ignoreEvent() { return false; }
}

/**
Mark lines that have a cursor on them with the `"cm-activeLine"`
DOM class.
*/
function highlightActiveLine() {
    return activeLineHighlighter;
}
const lineDeco = /*@__PURE__*/Decoration.line({ class: "cm-activeLine" });
const activeLineHighlighter = /*@__PURE__*/ViewPlugin.fromClass(class {
    constructor(view) {
        this.decorations = this.getDeco(view);
    }
    update(update) {
        if (update.docChanged || update.selectionSet)
            this.decorations = this.getDeco(update.view);
    }
    getDeco(view) {
        let lastLineStart = -1, deco = [];
        for (let r of view.state.selection.ranges) {
            if (!r.empty)
                return Decoration.none;
            let line = view.lineBlockAt(r.head);
            if (line.from > lastLineStart) {
                deco.push(lineDeco.range(line.from));
                lastLineStart = line.from;
            }
        }
        return Decoration.set(deco);
    }
}, {
    decorations: v => v.decorations
});

export { BlockType as B, Decoration as D, EditorView as E, PluginField as P, RangeSet as R, StyleModule as S, ViewPlugin as V, WidgetType as W, RangeSetBuilder as a, RangeValue as b, Direction as c, drawSelection as d, dropCursor as e, highlightActiveLine as f, highlightSpecialChars as h, keymap as k, logException as l, runScopeHandlers as r };
