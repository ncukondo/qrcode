
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
function noop() { }
function add_location(element, file, line, column, char) {
    element.__svelte_meta = {
        loc: { file, line, column, char }
    };
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function validate_store(store, name) {
    if (store != null && typeof store.subscribe !== 'function') {
        throw new Error(`'${name}' is not a store with a 'subscribe' method`);
    }
}
function subscribe(store, ...callbacks) {
    if (store == null) {
        return noop;
    }
    const unsub = store.subscribe(...callbacks);
    return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function get_store_value(store) {
    let value;
    subscribe(store, _ => value = _)();
    return value;
}
function component_subscribe(component, store, callback) {
    component.$$.on_destroy.push(subscribe(store, callback));
}
function action_destroyer(action_result) {
    return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
}

function append(target, node) {
    target.appendChild(node);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function element(name) {
    return document.createElement(name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function empty() {
    return text('');
}
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_input_value(input, value) {
    if (value != null || input.value) {
        input.value = value;
    }
}
function custom_event(type, detail) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, false, false, detail);
    return e;
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error(`Function called outside component initialization`);
    return current_component;
}
function createEventDispatcher() {
    const component = get_current_component();
    return (type, detail) => {
        const callbacks = component.$$.callbacks[type];
        if (callbacks) {
            // TODO are there situations where events could be dispatched
            // in a server (non-DOM) environment?
            const event = custom_event(type, detail);
            callbacks.slice().forEach(fn => {
                fn.call(component, event);
            });
        }
    };
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
const seen_callbacks = new Set();
function flush() {
    do {
        // first, call beforeUpdate functions
        // and update components
        while (dirty_components.length) {
            const component = dirty_components.shift();
            set_current_component(component);
            update(component.$$);
        }
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    seen_callbacks.clear();
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
let outros;
function group_outros() {
    outros = {
        r: 0,
        c: [],
        p: outros // parent group
    };
}
function check_outros() {
    if (!outros.r) {
        run_all(outros.c);
    }
    outros = outros.p;
}
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
}

const globals = (typeof window !== 'undefined' ? window : global);
function create_component(block) {
    block && block.c();
}
function mount_component(component, target, anchor) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    // onMount happens before the initial afterUpdate
    add_render_callback(() => {
        const new_on_destroy = on_mount.map(run).filter(is_function);
        if (on_destroy) {
            on_destroy.push(...new_on_destroy);
        }
        else {
            // Edge case - component was destroyed immediately,
            // most likely as a result of a binding initialising
            run_all(new_on_destroy);
        }
        component.$$.on_mount = [];
    });
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const prop_values = options.props || {};
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : []),
        // everything else
        callbacks: blank_object(),
        dirty
    };
    let ready = false;
    $$.ctx = instance
        ? instance(component, prop_values, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if ($$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(children(options.target));
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor);
        flush();
    }
    set_current_component(parent_component);
}
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set() {
        // overridden by instance, if it has props
    }
}

function dispatch_dev(type, detail) {
    document.dispatchEvent(custom_event(type, Object.assign({ version: '3.18.1' }, detail)));
}
function append_dev(target, node) {
    dispatch_dev("SvelteDOMInsert", { target, node });
    append(target, node);
}
function insert_dev(target, node, anchor) {
    dispatch_dev("SvelteDOMInsert", { target, node, anchor });
    insert(target, node, anchor);
}
function detach_dev(node) {
    dispatch_dev("SvelteDOMRemove", { node });
    detach(node);
}
function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
    const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
    if (has_prevent_default)
        modifiers.push('preventDefault');
    if (has_stop_propagation)
        modifiers.push('stopPropagation');
    dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
    const dispose = listen(node, event, handler, options);
    return () => {
        dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
        dispose();
    };
}
function attr_dev(node, attribute, value) {
    attr(node, attribute, value);
    if (value == null)
        dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
    else
        dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
}
function set_data_dev(text, data) {
    data = '' + data;
    if (text.data === data)
        return;
    dispatch_dev("SvelteDOMSetData", { node: text, data });
    text.data = data;
}
class SvelteComponentDev extends SvelteComponent {
    constructor(options) {
        if (!options || (!options.target && !options.$$inline)) {
            throw new Error(`'target' is a required option`);
        }
        super();
    }
    $destroy() {
        super.$destroy();
        this.$destroy = () => {
            console.warn(`Component was already destroyed`); // eslint-disable-line no-console
        };
    }
}

const subscriber_queue = [];
/**
 * Creates a `Readable` store that allows reading by subscription.
 * @param value initial value
 * @param {StartStopNotifier}start start and stop notifications for subscriptions
 */
function readable(value, start) {
    return {
        subscribe: writable(value, start).subscribe,
    };
}
/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * @param {*=}value initial value
 * @param {StartStopNotifier=}start start and stop notifications for subscriptions
 */
function writable(value, start = noop) {
    let stop;
    const subscribers = [];
    function set(new_value) {
        if (safe_not_equal(value, new_value)) {
            value = new_value;
            if (stop) { // store is ready
                const run_queue = !subscriber_queue.length;
                for (let i = 0; i < subscribers.length; i += 1) {
                    const s = subscribers[i];
                    s[1]();
                    subscriber_queue.push(s, value);
                }
                if (run_queue) {
                    for (let i = 0; i < subscriber_queue.length; i += 2) {
                        subscriber_queue[i][0](subscriber_queue[i + 1]);
                    }
                    subscriber_queue.length = 0;
                }
            }
        }
    }
    function update(fn) {
        set(fn(value));
    }
    function subscribe(run, invalidate = noop) {
        const subscriber = [run, invalidate];
        subscribers.push(subscriber);
        if (subscribers.length === 1) {
            stop = start(set) || noop;
        }
        run(value);
        return () => {
            const index = subscribers.indexOf(subscriber);
            if (index !== -1) {
                subscribers.splice(index, 1);
            }
            if (subscribers.length === 0) {
                stop();
                stop = null;
            }
        };
    }
    return { set, update, subscribe };
}
function derived(stores, fn, initial_value) {
    const single = !Array.isArray(stores);
    const stores_array = single
        ? [stores]
        : stores;
    const auto = fn.length < 2;
    return readable(initial_value, (set) => {
        let inited = false;
        const values = [];
        let pending = 0;
        let cleanup = noop;
        const sync = () => {
            if (pending) {
                return;
            }
            cleanup();
            const result = fn(single ? values[0] : values, set);
            if (auto) {
                set(result);
            }
            else {
                cleanup = is_function(result) ? result : noop;
            }
        };
        const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
            values[i] = value;
            pending &= ~(1 << i);
            if (inited) {
                sync();
            }
        }, () => {
            pending |= (1 << i);
        }));
        inited = true;
        sync();
        return function stop() {
            run_all(unsubscribers);
            cleanup();
        };
    });
}

function regexparam (str, loose) {
	if (str instanceof RegExp) return { keys:false, pattern:str };
	var c, o, tmp, ext, keys=[], pattern='', arr = str.split('/');
	arr[0] || arr.shift();

	while (tmp = arr.shift()) {
		c = tmp[0];
		if (c === '*') {
			keys.push('wild');
			pattern += '/(.*)';
		} else if (c === ':') {
			o = tmp.indexOf('?', 1);
			ext = tmp.indexOf('.', 1);
			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
		} else {
			pattern += '/' + tmp;
		}
	}

	return {
		keys: keys,
		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
	};
}

/* node_modules/svelte-spa-router/Router.svelte generated by Svelte v3.18.1 */

const { Error: Error_1, Object: Object_1 } = globals;

// (185:0) {:else}
function create_else_block(ctx) {
	let switch_instance_anchor;
	let current;
	var switch_value = /*component*/ ctx[0];

	function switch_props(ctx) {
		return { $$inline: true };
	}

	if (switch_value) {
		var switch_instance = new switch_value(switch_props());
	}

	const block = {
		c: function create() {
			if (switch_instance) create_component(switch_instance.$$.fragment);
			switch_instance_anchor = empty();
		},
		m: function mount(target, anchor) {
			if (switch_instance) {
				mount_component(switch_instance, target, anchor);
			}

			insert_dev(target, switch_instance_anchor, anchor);
			current = true;
		},
		p: function update(ctx, dirty) {
			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = new switch_value(switch_props());
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
				} else {
					switch_instance = null;
				}
			}
		},
		i: function intro(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(switch_instance_anchor);
			if (switch_instance) destroy_component(switch_instance, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_else_block.name,
		type: "else",
		source: "(185:0) {:else}",
		ctx
	});

	return block;
}

// (183:0) {#if componentParams}
function create_if_block(ctx) {
	let switch_instance_anchor;
	let current;
	var switch_value = /*component*/ ctx[0];

	function switch_props(ctx) {
		return {
			props: { params: /*componentParams*/ ctx[1] },
			$$inline: true
		};
	}

	if (switch_value) {
		var switch_instance = new switch_value(switch_props(ctx));
	}

	const block = {
		c: function create() {
			if (switch_instance) create_component(switch_instance.$$.fragment);
			switch_instance_anchor = empty();
		},
		m: function mount(target, anchor) {
			if (switch_instance) {
				mount_component(switch_instance, target, anchor);
			}

			insert_dev(target, switch_instance_anchor, anchor);
			current = true;
		},
		p: function update(ctx, dirty) {
			const switch_instance_changes = {};
			if (dirty & /*componentParams*/ 2) switch_instance_changes.params = /*componentParams*/ ctx[1];

			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = new switch_value(switch_props(ctx));
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
				} else {
					switch_instance = null;
				}
			} else if (switch_value) {
				switch_instance.$set(switch_instance_changes);
			}
		},
		i: function intro(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(switch_instance_anchor);
			if (switch_instance) destroy_component(switch_instance, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block.name,
		type: "if",
		source: "(183:0) {#if componentParams}",
		ctx
	});

	return block;
}

function create_fragment(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block, create_else_block];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*componentParams*/ ctx[1]) return 0;
		return 1;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	const block = {
		c: function create() {
			if_block.c();
			if_block_anchor = empty();
		},
		l: function claim(nodes) {
			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			if_blocks[current_block_type_index].m(target, anchor);
			insert_dev(target, if_block_anchor, anchor);
			current = true;
		},
		p: function update(ctx, [dirty]) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				}

				transition_in(if_block, 1);
				if_block.m(if_block_anchor.parentNode, if_block_anchor);
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o: function outro(local) {
			transition_out(if_block);
			current = false;
		},
		d: function destroy(detaching) {
			if_blocks[current_block_type_index].d(detaching);
			if (detaching) detach_dev(if_block_anchor);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

/**
 * @typedef {Object} Location
 * @property {string} location - Location (page/view), for example `/book`
 * @property {string} [querystring] - Querystring from the hash, as a string not parsed
 */
/**
 * Returns the current location from the hash.
 *
 * @returns {Location} Location object
 * @private
 */
function getLocation() {
	const hashPosition = window.location.href.indexOf("#/");

	let location = hashPosition > -1
	? window.location.href.substr(hashPosition + 1)
	: "/";

	// Check if there's a querystring
	const qsPosition = location.indexOf("?");

	let querystring = "";

	if (qsPosition > -1) {
		querystring = location.substr(qsPosition + 1);
		location = location.substr(0, qsPosition);
	}

	return { location, querystring };
}

const loc = readable(getLocation(), // eslint-disable-next-line prefer-arrow-callback
function start(set) {
	const update = () => {
		set(getLocation());
	};

	window.addEventListener("hashchange", update, false);

	return function stop() {
		window.removeEventListener("hashchange", update, false);
	};
});

const location = derived(loc, $loc => $loc.location);
const querystring = derived(loc, $loc => $loc.querystring);

function link(node) {
	// Only apply to <a> tags
	if (!node || !node.tagName || node.tagName.toLowerCase() != "a") {
		throw Error("Action \"link\" can only be used with <a> tags");
	}

	// Destination must start with '/'
	const href = node.getAttribute("href");

	if (!href || href.length < 1 || href.charAt(0) != "/") {
		throw Error("Invalid value for \"href\" attribute");
	}

	// Add # to every href attribute
	node.setAttribute("href", "#" + href);
}

function instance($$self, $$props, $$invalidate) {
	let $loc,
		$$unsubscribe_loc = noop;

	validate_store(loc, "loc");
	component_subscribe($$self, loc, $$value => $$invalidate(4, $loc = $$value));
	$$self.$$.on_destroy.push(() => $$unsubscribe_loc());
	let { routes = {} } = $$props;
	let { prefix = "" } = $$props;

	/**
 * Container for a route: path, component
 */
	class RouteItem {
		/**
 * Initializes the object and creates a regular expression from the path, using regexparam.
 *
 * @param {string} path - Path to the route (must start with '/' or '*')
 * @param {SvelteComponent} component - Svelte component for the route
 */
		constructor(path, component) {
			if (!component || typeof component != "function" && (typeof component != "object" || component._sveltesparouter !== true)) {
				throw Error("Invalid component object");
			}

			// Path must be a regular or expression, or a string starting with '/' or '*'
			if (!path || typeof path == "string" && (path.length < 1 || path.charAt(0) != "/" && path.charAt(0) != "*") || typeof path == "object" && !(path instanceof RegExp)) {
				throw Error("Invalid value for \"path\" argument");
			}

			const { pattern, keys } = regexparam(path);
			this.path = path;

			// Check if the component is wrapped and we have conditions
			if (typeof component == "object" && component._sveltesparouter === true) {
				this.component = component.route;
				this.conditions = component.conditions || [];
				this.userData = component.userData;
			} else {
				this.component = component;
				this.conditions = [];
				this.userData = undefined;
			}

			this._pattern = pattern;
			this._keys = keys;
		}

		/**
 * Checks if `path` matches the current route.
 * If there's a match, will return the list of parameters from the URL (if any).
 * In case of no match, the method will return `null`.
 *
 * @param {string} path - Path to test
 * @returns {null|Object.<string, string>} List of paramters from the URL if there's a match, or `null` otherwise.
 */
		match(path) {
			// If there's a prefix, remove it before we run the matching
			if (prefix && path.startsWith(prefix)) {
				path = path.substr(prefix.length) || "/";
			}

			// Check if the pattern matches
			const matches = this._pattern.exec(path);

			if (matches === null) {
				return null;
			}

			// If the input was a regular expression, this._keys would be false, so return matches as is
			if (this._keys === false) {
				return matches;
			}

			const out = {};
			let i = 0;

			while (i < this._keys.length) {
				out[this._keys[i]] = matches[++i] || null;
			}

			return out;
		}

		/**
 * Dictionary with route details passed to the pre-conditions functions, as well as the `routeLoaded` and `conditionsFailed` events
 * @typedef {Object} RouteDetail
 * @property {SvelteComponent} component - Svelte component
 * @property {string} name - Name of the Svelte component
 * @property {string} location - Location path
 * @property {string} querystring - Querystring from the hash
 * @property {Object} [userData] - Custom data passed by the user
 */
		/**
 * Executes all conditions (if any) to control whether the route can be shown. Conditions are executed in the order they are defined, and if a condition fails, the following ones aren't executed.
 * 
 * @param {RouteDetail} detail - Route detail
 * @returns {bool} Returns true if all the conditions succeeded
 */
		checkConditions(detail) {
			for (let i = 0; i < this.conditions.length; i++) {
				if (!this.conditions[i](detail)) {
					return false;
				}
			}

			return true;
		}
	}

	// Set up all routes
	const routesList = [];

	if (routes instanceof Map) {
		// If it's a map, iterate on it right away
		routes.forEach((route, path) => {
			routesList.push(new RouteItem(path, route));
		});
	} else {
		// We have an object, so iterate on its own properties
		Object.keys(routes).forEach(path => {
			routesList.push(new RouteItem(path, routes[path]));
		});
	}

	// Props for the component to render
	let component = null;

	let componentParams = null;

	// Event dispatcher from Svelte
	const dispatch = createEventDispatcher();

	// Just like dispatch, but executes on the next iteration of the event loop
	const dispatchNextTick = (name, detail) => {
		// Execute this code when the current call stack is complete
		setTimeout(
			() => {
				dispatch(name, detail);
			},
			0
		);
	};

	const writable_props = ["routes", "prefix"];

	Object_1.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Router> was created with unknown prop '${key}'`);
	});

	$$self.$set = $$props => {
		if ("routes" in $$props) $$invalidate(2, routes = $$props.routes);
		if ("prefix" in $$props) $$invalidate(3, prefix = $$props.prefix);
	};

	$$self.$capture_state = () => {
		return {
			routes,
			prefix,
			component,
			componentParams,
			$loc
		};
	};

	$$self.$inject_state = $$props => {
		if ("routes" in $$props) $$invalidate(2, routes = $$props.routes);
		if ("prefix" in $$props) $$invalidate(3, prefix = $$props.prefix);
		if ("component" in $$props) $$invalidate(0, component = $$props.component);
		if ("componentParams" in $$props) $$invalidate(1, componentParams = $$props.componentParams);
		if ("$loc" in $$props) loc.set($loc = $$props.$loc);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*component, $loc*/ 17) {
			// Handle hash change events
			// Listen to changes in the $loc store and update the page
			 {
				// Find a route matching the location
				$$invalidate(0, component = null);

				let i = 0;

				while (!component && i < routesList.length) {
					const match = routesList[i].match($loc.location);

					if (match) {
						const detail = {
							component: routesList[i].component,
							name: routesList[i].component.name,
							location: $loc.location,
							querystring: $loc.querystring,
							userData: routesList[i].userData
						};

						// Check if the route can be loaded - if all conditions succeed
						if (!routesList[i].checkConditions(detail)) {
							// Trigger an event to notify the user
							dispatchNextTick("conditionsFailed", detail);

							break;
						}

						$$invalidate(0, component = routesList[i].component);

						// Set componentParams onloy if we have a match, to avoid a warning similar to `<Component> was created with unknown prop 'params'`
						// Of course, this assumes that developers always add a "params" prop when they are expecting parameters
						if (match && typeof match == "object" && Object.keys(match).length) {
							$$invalidate(1, componentParams = match);
						} else {
							$$invalidate(1, componentParams = null);
						}

						dispatchNextTick("routeLoaded", detail);
					}

					i++;
				}
			}
		}
	};

	return [component, componentParams, routes, prefix];
}

class Router extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance, create_fragment, safe_not_equal, { routes: 2, prefix: 3 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Router",
			options,
			id: create_fragment.name
		});
	}

	get routes() {
		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set routes(value) {
		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get prefix() {
		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set prefix(value) {
		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

// List of nodes to update
const nodes = [];

// Current location
let location$1;

// Function that updates all nodes marking the active ones
function checkActive(el) {
    // Remove the active class from all elements
    el.node.classList.remove(el.className);

    // If the pattern matches, then set the active class
    if (el.pattern.test(location$1)) {
        el.node.classList.add(el.className);
    }
}

// Listen to changes in the location
loc.subscribe((value) => {
    // Update the location
    location$1 = value.location + (value.querystring ? '?' + value.querystring : '');

    // Update all nodes
    nodes.map(checkActive);
});

/**
 * @typedef {Object} ActiveOptions
 * @property {string|RegExp} [path] - Path expression that makes the link active when matched (must start with '/' or '*'); default is the link's href
 * @property {string} [className] - CSS class to apply to the element when active; default value is "active"
 */

/**
 * Svelte Action for automatically adding the "active" class to elements (links, or any other DOM element) when the current location matches a certain path.
 * 
 * @param {HTMLElement} node - The target node (automatically set by Svelte)
 * @param {ActiveOptions|string|RegExp} [opts] - Can be an object of type ActiveOptions, or a string (or regular expressions) representing ActiveOptions.path.
 */
function active(node, opts) {
    // Check options
    if (opts && (typeof opts == 'string' || (typeof opts == 'object' && opts instanceof RegExp))) {
        // Interpret strings and regular expressions as opts.path
        opts = {
            path: opts
        };
    }
    else {
        // Ensure opts is a dictionary
        opts = opts || {};
    }

    // Path defaults to link target
    if (!opts.path && node.hasAttribute('href')) {
        opts.path = node.getAttribute('href');
        if (opts.path && opts.path.length > 1 && opts.path.charAt(0) == '#') {
            opts.path = opts.path.substring(1);
        }
    }

    // Default class name
    if (!opts.className) {
        opts.className = 'active';
    }

    // If path is a string, it must start with '/' or '*'
    if (!opts.path || 
        typeof opts.path == 'string' && (opts.path.length < 1 || (opts.path.charAt(0) != '/' && opts.path.charAt(0) != '*'))
    ) {
        throw Error('Invalid value for "path" argument')
    }

    // If path is not a regular expression already, make it
    const {pattern} = typeof opts.path == 'string' ?
        regexparam(opts.path) :
        {pattern: opts.path};

    // Add the node to the list
    const el = {
        node,
        className: opts.className,
        pattern
    };
    nodes.push(el);

    // Trigger the action right away
    checkActive(el);

    return {
        // When the element is destroyed, remove it from the list
        destroy() {
            nodes.splice(nodes.indexOf(el), 1);
        }
    }
}

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var require$$0 = {};

var qrcode = createCommonjsModule(function (module) {
/**
 * @fileoverview
 * - modified davidshimjs/qrcodejs library for use in node.js
 * - Using the 'QRCode for Javascript library'
 * - Fixed dataset of 'QRCode for Javascript library' for support full-spec.
 * - this library has no dependencies.
 *
 * @version 0.9.1 (2016-02-12)
 * @author davidshimjs, papnkukn
 * @see <a href="http://www.d-project.com/" target="_blank">http://www.d-project.com/</a>
 * @see <a href="http://jeromeetienne.github.com/jquery-qrcode/" target="_blank">http://jeromeetienne.github.com/jquery-qrcode/</a>
 * @see <a href="https://github.com/davidshimjs/qrcodejs" target="_blank">https://github.com/davidshimjs/qrcodejs</a>
 */

//---------------------------------------------------------------------
// QRCode for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//   http://www.opensource.org/licenses/mit-license.php
//
// The word "QR Code" is registered trademark of 
// DENSO WAVE INCORPORATED
//   http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------
function QR8bitByte(data) {
  this.mode = QRMode.MODE_8BIT_BYTE;
  this.data = data;
  this.parsedData = [];

  // Added to support UTF-8 Characters
  for (var i = 0, l = this.data.length; i < l; i++) {
    var byteArray = [];
    var code = this.data.charCodeAt(i);

    if (code > 0x10000) {
      byteArray[0] = 0xF0 | ((code & 0x1C0000) >>> 18);
      byteArray[1] = 0x80 | ((code & 0x3F000) >>> 12);
      byteArray[2] = 0x80 | ((code & 0xFC0) >>> 6);
      byteArray[3] = 0x80 | (code & 0x3F);
    } else if (code > 0x800) {
      byteArray[0] = 0xE0 | ((code & 0xF000) >>> 12);
      byteArray[1] = 0x80 | ((code & 0xFC0) >>> 6);
      byteArray[2] = 0x80 | (code & 0x3F);
    } else if (code > 0x80) {
      byteArray[0] = 0xC0 | ((code & 0x7C0) >>> 6);
      byteArray[1] = 0x80 | (code & 0x3F);
    } else {
      byteArray[0] = code;
    }

    this.parsedData.push(byteArray);
  }

  this.parsedData = Array.prototype.concat.apply([], this.parsedData);

  if (this.parsedData.length != this.data.length) {
    this.parsedData.unshift(191);
    this.parsedData.unshift(187);
    this.parsedData.unshift(239);
  }
}

QR8bitByte.prototype = {
  getLength: function (buffer) {
    return this.parsedData.length;
  },
  write: function (buffer) {
    for (var i = 0, l = this.parsedData.length; i < l; i++) {
      buffer.put(this.parsedData[i], 8);
    }
  }
};

function QRCodeModel(typeNumber, errorCorrectLevel) {
  this.typeNumber = typeNumber;
  this.errorCorrectLevel = errorCorrectLevel;
  this.modules = null;
  this.moduleCount = 0;
  this.dataCache = null;
  this.dataList = [];
}

QRCodeModel.prototype={addData:function(data){var newData=new QR8bitByte(data);this.dataList.push(newData);this.dataCache=null;},isDark:function(row,col){if(row<0||this.moduleCount<=row||col<0||this.moduleCount<=col){throw new Error(row+","+col);}
return this.modules[row][col];},getModuleCount:function(){return this.moduleCount;},make:function(){this.makeImpl(false,this.getBestMaskPattern());},makeImpl:function(test,maskPattern){this.moduleCount=this.typeNumber*4+17;this.modules=new Array(this.moduleCount);for(var row=0;row<this.moduleCount;row++){this.modules[row]=new Array(this.moduleCount);for(var col=0;col<this.moduleCount;col++){this.modules[row][col]=null;}}
this.setupPositionProbePattern(0,0);this.setupPositionProbePattern(this.moduleCount-7,0);this.setupPositionProbePattern(0,this.moduleCount-7);this.setupPositionAdjustPattern();this.setupTimingPattern();this.setupTypeInfo(test,maskPattern);if(this.typeNumber>=7){this.setupTypeNumber(test);}
if(this.dataCache==null){this.dataCache=QRCodeModel.createData(this.typeNumber,this.errorCorrectLevel,this.dataList);}
this.mapData(this.dataCache,maskPattern);},setupPositionProbePattern:function(row,col){for(var r=-1;r<=7;r++){if(row+r<=-1||this.moduleCount<=row+r)continue;for(var c=-1;c<=7;c++){if(col+c<=-1||this.moduleCount<=col+c)continue;if((0<=r&&r<=6&&(c==0||c==6))||(0<=c&&c<=6&&(r==0||r==6))||(2<=r&&r<=4&&2<=c&&c<=4)){this.modules[row+r][col+c]=true;}else{this.modules[row+r][col+c]=false;}}}},getBestMaskPattern:function(){var minLostPoint=0;var pattern=0;for(var i=0;i<8;i++){this.makeImpl(true,i);var lostPoint=QRUtil.getLostPoint(this);if(i==0||minLostPoint>lostPoint){minLostPoint=lostPoint;pattern=i;}}
return pattern;},createMovieClip:function(target_mc,instance_name,depth){var qr_mc=target_mc.createEmptyMovieClip(instance_name,depth);var cs=1;this.make();for(var row=0;row<this.modules.length;row++){var y=row*cs;for(var col=0;col<this.modules[row].length;col++){var x=col*cs;var dark=this.modules[row][col];if(dark){qr_mc.beginFill(0,100);qr_mc.moveTo(x,y);qr_mc.lineTo(x+cs,y);qr_mc.lineTo(x+cs,y+cs);qr_mc.lineTo(x,y+cs);qr_mc.endFill();}}}
return qr_mc;},setupTimingPattern:function(){for(var r=8;r<this.moduleCount-8;r++){if(this.modules[r][6]!=null){continue;}
this.modules[r][6]=(r%2==0);}
for(var c=8;c<this.moduleCount-8;c++){if(this.modules[6][c]!=null){continue;}
this.modules[6][c]=(c%2==0);}},setupPositionAdjustPattern:function(){var pos=QRUtil.getPatternPosition(this.typeNumber);for(var i=0;i<pos.length;i++){for(var j=0;j<pos.length;j++){var row=pos[i];var col=pos[j];if(this.modules[row][col]!=null){continue;}
for(var r=-2;r<=2;r++){for(var c=-2;c<=2;c++){if(r==-2||r==2||c==-2||c==2||(r==0&&c==0)){this.modules[row+r][col+c]=true;}else{this.modules[row+r][col+c]=false;}}}}}},setupTypeNumber:function(test){var bits=QRUtil.getBCHTypeNumber(this.typeNumber);for(var i=0;i<18;i++){var mod=(!test&&((bits>>i)&1)==1);this.modules[Math.floor(i/3)][i%3+this.moduleCount-8-3]=mod;}
for(var i=0;i<18;i++){var mod=(!test&&((bits>>i)&1)==1);this.modules[i%3+this.moduleCount-8-3][Math.floor(i/3)]=mod;}},setupTypeInfo:function(test,maskPattern){var data=(this.errorCorrectLevel<<3)|maskPattern;var bits=QRUtil.getBCHTypeInfo(data);for(var i=0;i<15;i++){var mod=(!test&&((bits>>i)&1)==1);if(i<6){this.modules[i][8]=mod;}else if(i<8){this.modules[i+1][8]=mod;}else{this.modules[this.moduleCount-15+i][8]=mod;}}
for(var i=0;i<15;i++){var mod=(!test&&((bits>>i)&1)==1);if(i<8){this.modules[8][this.moduleCount-i-1]=mod;}else if(i<9){this.modules[8][15-i-1+1]=mod;}else{this.modules[8][15-i-1]=mod;}}
this.modules[this.moduleCount-8][8]=(!test);},mapData:function(data,maskPattern){var inc=-1;var row=this.moduleCount-1;var bitIndex=7;var byteIndex=0;for(var col=this.moduleCount-1;col>0;col-=2){if(col==6)col--;while(true){for(var c=0;c<2;c++){if(this.modules[row][col-c]==null){var dark=false;if(byteIndex<data.length){dark=(((data[byteIndex]>>>bitIndex)&1)==1);}
var mask=QRUtil.getMask(maskPattern,row,col-c);if(mask){dark=!dark;}
this.modules[row][col-c]=dark;bitIndex--;if(bitIndex==-1){byteIndex++;bitIndex=7;}}}
row+=inc;if(row<0||this.moduleCount<=row){row-=inc;inc=-inc;break;}}}}};QRCodeModel.PAD0=0xEC;QRCodeModel.PAD1=0x11;QRCodeModel.createData=function(typeNumber,errorCorrectLevel,dataList){var rsBlocks=QRRSBlock.getRSBlocks(typeNumber,errorCorrectLevel);var buffer=new QRBitBuffer();for(var i=0;i<dataList.length;i++){var data=dataList[i];buffer.put(data.mode,4);buffer.put(data.getLength(),QRUtil.getLengthInBits(data.mode,typeNumber));data.write(buffer);}
var totalDataCount=0;for(var i=0;i<rsBlocks.length;i++){totalDataCount+=rsBlocks[i].dataCount;}
if(buffer.getLengthInBits()>totalDataCount*8){throw new Error("code length overflow. ("
+buffer.getLengthInBits()
+">"
+totalDataCount*8
+")");}
if(buffer.getLengthInBits()+4<=totalDataCount*8){buffer.put(0,4);}
while(buffer.getLengthInBits()%8!=0){buffer.putBit(false);}
while(true){if(buffer.getLengthInBits()>=totalDataCount*8){break;}
buffer.put(QRCodeModel.PAD0,8);if(buffer.getLengthInBits()>=totalDataCount*8){break;}
buffer.put(QRCodeModel.PAD1,8);}
return QRCodeModel.createBytes(buffer,rsBlocks);};QRCodeModel.createBytes=function(buffer,rsBlocks){var offset=0;var maxDcCount=0;var maxEcCount=0;var dcdata=new Array(rsBlocks.length);var ecdata=new Array(rsBlocks.length);for(var r=0;r<rsBlocks.length;r++){var dcCount=rsBlocks[r].dataCount;var ecCount=rsBlocks[r].totalCount-dcCount;maxDcCount=Math.max(maxDcCount,dcCount);maxEcCount=Math.max(maxEcCount,ecCount);dcdata[r]=new Array(dcCount);for(var i=0;i<dcdata[r].length;i++){dcdata[r][i]=0xff&buffer.buffer[i+offset];}
offset+=dcCount;var rsPoly=QRUtil.getErrorCorrectPolynomial(ecCount);var rawPoly=new QRPolynomial(dcdata[r],rsPoly.getLength()-1);var modPoly=rawPoly.mod(rsPoly);ecdata[r]=new Array(rsPoly.getLength()-1);for(var i=0;i<ecdata[r].length;i++){var modIndex=i+modPoly.getLength()-ecdata[r].length;ecdata[r][i]=(modIndex>=0)?modPoly.get(modIndex):0;}}
var totalCodeCount=0;for(var i=0;i<rsBlocks.length;i++){totalCodeCount+=rsBlocks[i].totalCount;}
var data=new Array(totalCodeCount);var index=0;for(var i=0;i<maxDcCount;i++){for(var r=0;r<rsBlocks.length;r++){if(i<dcdata[r].length){data[index++]=dcdata[r][i];}}}
for(var i=0;i<maxEcCount;i++){for(var r=0;r<rsBlocks.length;r++){if(i<ecdata[r].length){data[index++]=ecdata[r][i];}}}
return data;};var QRMode={MODE_NUMBER:1<<0,MODE_ALPHA_NUM:1<<1,MODE_8BIT_BYTE:1<<2,MODE_KANJI:1<<3};var QRErrorCorrectLevel={L:1,M:0,Q:3,H:2};var QRMaskPattern={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};var QRUtil={PATTERN_POSITION_TABLE:[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],G15:(1<<10)|(1<<8)|(1<<5)|(1<<4)|(1<<2)|(1<<1)|(1<<0),G18:(1<<12)|(1<<11)|(1<<10)|(1<<9)|(1<<8)|(1<<5)|(1<<2)|(1<<0),G15_MASK:(1<<14)|(1<<12)|(1<<10)|(1<<4)|(1<<1),getBCHTypeInfo:function(data){var d=data<<10;while(QRUtil.getBCHDigit(d)-QRUtil.getBCHDigit(QRUtil.G15)>=0){d^=(QRUtil.G15<<(QRUtil.getBCHDigit(d)-QRUtil.getBCHDigit(QRUtil.G15)));}
return ((data<<10)|d)^QRUtil.G15_MASK;},getBCHTypeNumber:function(data){var d=data<<12;while(QRUtil.getBCHDigit(d)-QRUtil.getBCHDigit(QRUtil.G18)>=0){d^=(QRUtil.G18<<(QRUtil.getBCHDigit(d)-QRUtil.getBCHDigit(QRUtil.G18)));}
return (data<<12)|d;},getBCHDigit:function(data){var digit=0;while(data!=0){digit++;data>>>=1;}
return digit;},getPatternPosition:function(typeNumber){return QRUtil.PATTERN_POSITION_TABLE[typeNumber-1];},getMask:function(maskPattern,i,j){switch(maskPattern){case QRMaskPattern.PATTERN000:return (i+j)%2==0;case QRMaskPattern.PATTERN001:return i%2==0;case QRMaskPattern.PATTERN010:return j%3==0;case QRMaskPattern.PATTERN011:return (i+j)%3==0;case QRMaskPattern.PATTERN100:return (Math.floor(i/2)+Math.floor(j/3))%2==0;case QRMaskPattern.PATTERN101:return (i*j)%2+(i*j)%3==0;case QRMaskPattern.PATTERN110:return ((i*j)%2+(i*j)%3)%2==0;case QRMaskPattern.PATTERN111:return ((i*j)%3+(i+j)%2)%2==0;default:throw new Error("bad maskPattern:"+maskPattern);}},getErrorCorrectPolynomial:function(errorCorrectLength){var a=new QRPolynomial([1],0);for(var i=0;i<errorCorrectLength;i++){a=a.multiply(new QRPolynomial([1,QRMath.gexp(i)],0));}
return a;},getLengthInBits:function(mode,type){if(1<=type&&type<10){switch(mode){case QRMode.MODE_NUMBER:return 10;case QRMode.MODE_ALPHA_NUM:return 9;case QRMode.MODE_8BIT_BYTE:return 8;case QRMode.MODE_KANJI:return 8;default:throw new Error("mode:"+mode);}}else if(type<27){switch(mode){case QRMode.MODE_NUMBER:return 12;case QRMode.MODE_ALPHA_NUM:return 11;case QRMode.MODE_8BIT_BYTE:return 16;case QRMode.MODE_KANJI:return 10;default:throw new Error("mode:"+mode);}}else if(type<41){switch(mode){case QRMode.MODE_NUMBER:return 14;case QRMode.MODE_ALPHA_NUM:return 13;case QRMode.MODE_8BIT_BYTE:return 16;case QRMode.MODE_KANJI:return 12;default:throw new Error("mode:"+mode);}}else{throw new Error("type:"+type);}},getLostPoint:function(qrCode){var moduleCount=qrCode.getModuleCount();var lostPoint=0;for(var row=0;row<moduleCount;row++){for(var col=0;col<moduleCount;col++){var sameCount=0;var dark=qrCode.isDark(row,col);for(var r=-1;r<=1;r++){if(row+r<0||moduleCount<=row+r){continue;}
for(var c=-1;c<=1;c++){if(col+c<0||moduleCount<=col+c){continue;}
if(r==0&&c==0){continue;}
if(dark==qrCode.isDark(row+r,col+c)){sameCount++;}}}
if(sameCount>5){lostPoint+=(3+sameCount-5);}}}
for(var row=0;row<moduleCount-1;row++){for(var col=0;col<moduleCount-1;col++){var count=0;if(qrCode.isDark(row,col))count++;if(qrCode.isDark(row+1,col))count++;if(qrCode.isDark(row,col+1))count++;if(qrCode.isDark(row+1,col+1))count++;if(count==0||count==4){lostPoint+=3;}}}
for(var row=0;row<moduleCount;row++){for(var col=0;col<moduleCount-6;col++){if(qrCode.isDark(row,col)&&!qrCode.isDark(row,col+1)&&qrCode.isDark(row,col+2)&&qrCode.isDark(row,col+3)&&qrCode.isDark(row,col+4)&&!qrCode.isDark(row,col+5)&&qrCode.isDark(row,col+6)){lostPoint+=40;}}}
for(var col=0;col<moduleCount;col++){for(var row=0;row<moduleCount-6;row++){if(qrCode.isDark(row,col)&&!qrCode.isDark(row+1,col)&&qrCode.isDark(row+2,col)&&qrCode.isDark(row+3,col)&&qrCode.isDark(row+4,col)&&!qrCode.isDark(row+5,col)&&qrCode.isDark(row+6,col)){lostPoint+=40;}}}
var darkCount=0;for(var col=0;col<moduleCount;col++){for(var row=0;row<moduleCount;row++){if(qrCode.isDark(row,col)){darkCount++;}}}
var ratio=Math.abs(100*darkCount/moduleCount/moduleCount-50)/5;lostPoint+=ratio*10;return lostPoint;}};var QRMath={glog:function(n){if(n<1){throw new Error("glog("+n+")");}
return QRMath.LOG_TABLE[n];},gexp:function(n){while(n<0){n+=255;}
while(n>=256){n-=255;}
return QRMath.EXP_TABLE[n];},EXP_TABLE:new Array(256),LOG_TABLE:new Array(256)};for(var i=0;i<8;i++){QRMath.EXP_TABLE[i]=1<<i;}
for(var i=8;i<256;i++){QRMath.EXP_TABLE[i]=QRMath.EXP_TABLE[i-4]^QRMath.EXP_TABLE[i-5]^QRMath.EXP_TABLE[i-6]^QRMath.EXP_TABLE[i-8];}
for(var i=0;i<255;i++){QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]]=i;}
function QRPolynomial(num,shift){if(num.length==undefined){throw new Error(num.length+"/"+shift);}
var offset=0;while(offset<num.length&&num[offset]==0){offset++;}
this.num=new Array(num.length-offset+shift);for(var i=0;i<num.length-offset;i++){this.num[i]=num[i+offset];}}
QRPolynomial.prototype={get:function(index){return this.num[index];},getLength:function(){return this.num.length;},multiply:function(e){var num=new Array(this.getLength()+e.getLength()-1);for(var i=0;i<this.getLength();i++){for(var j=0;j<e.getLength();j++){num[i+j]^=QRMath.gexp(QRMath.glog(this.get(i))+QRMath.glog(e.get(j)));}}
return new QRPolynomial(num,0);},mod:function(e){if(this.getLength()-e.getLength()<0){return this;}
var ratio=QRMath.glog(this.get(0))-QRMath.glog(e.get(0));var num=new Array(this.getLength());for(var i=0;i<this.getLength();i++){num[i]=this.get(i);}
for(var i=0;i<e.getLength();i++){num[i]^=QRMath.gexp(QRMath.glog(e.get(i))+ratio);}
return new QRPolynomial(num,0).mod(e);}};function QRRSBlock(totalCount,dataCount){this.totalCount=totalCount;this.dataCount=dataCount;}
QRRSBlock.RS_BLOCK_TABLE=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]];QRRSBlock.getRSBlocks=function(typeNumber,errorCorrectLevel){var rsBlock=QRRSBlock.getRsBlockTable(typeNumber,errorCorrectLevel);if(rsBlock==undefined){throw new Error("bad rs block @ typeNumber:"+typeNumber+"/errorCorrectLevel:"+errorCorrectLevel);}
var length=rsBlock.length/3;var list=[];for(var i=0;i<length;i++){var count=rsBlock[i*3+0];var totalCount=rsBlock[i*3+1];var dataCount=rsBlock[i*3+2];for(var j=0;j<count;j++){list.push(new QRRSBlock(totalCount,dataCount));}}
return list;};QRRSBlock.getRsBlockTable=function(typeNumber,errorCorrectLevel){switch(errorCorrectLevel){case QRErrorCorrectLevel.L:return QRRSBlock.RS_BLOCK_TABLE[(typeNumber-1)*4+0];case QRErrorCorrectLevel.M:return QRRSBlock.RS_BLOCK_TABLE[(typeNumber-1)*4+1];case QRErrorCorrectLevel.Q:return QRRSBlock.RS_BLOCK_TABLE[(typeNumber-1)*4+2];case QRErrorCorrectLevel.H:return QRRSBlock.RS_BLOCK_TABLE[(typeNumber-1)*4+3];default:return undefined;}};function QRBitBuffer(){this.buffer=[];this.length=0;}
QRBitBuffer.prototype={get:function(index){var bufIndex=Math.floor(index/8);return ((this.buffer[bufIndex]>>>(7-index%8))&1)==1;},put:function(num,length){for(var i=0;i<length;i++){this.putBit(((num>>>(length-i-1))&1)==1);}},getLengthInBits:function(){return this.length;},putBit:function(bit){var bufIndex=Math.floor(this.length/8);if(this.buffer.length<=bufIndex){this.buffer.push(0);}
if(bit){this.buffer[bufIndex]|=(0x80>>>(this.length%8));}
this.length++;}};var QRCodeLimitLength=[[17,14,11,7],[32,26,20,14],[53,42,32,24],[78,62,46,34],[106,84,60,44],[134,106,74,58],[154,122,86,64],[192,152,108,84],[230,180,130,98],[271,213,151,119],[321,251,177,137],[367,287,203,155],[425,331,241,177],[458,362,258,194],[520,412,292,220],[586,450,322,250],[644,504,364,280],[718,560,394,310],[792,624,442,338],[858,666,482,382],[929,711,509,403],[1003,779,565,439],[1091,857,611,461],[1171,911,661,511],[1273,997,715,535],[1367,1059,751,593],[1465,1125,805,625],[1528,1190,868,658],[1628,1264,908,698],[1732,1370,982,742],[1840,1452,1030,790],[1952,1538,1112,842],[2068,1628,1168,898],[2188,1722,1228,958],[2303,1809,1283,983],[2431,1911,1351,1051],[2563,1989,1423,1093],[2699,2099,1499,1139],[2809,2213,1579,1219],[2953,2331,1663,1273]];


/** Constructor */
function QRCode(options) {
  
  //Default options
  this.options = {
    padding: 4,
    width: 256, 
    height: 256,
    typeNumber: 4,
    color: "#000000",
    background: "#ffffff",
    ecl: "M"
  };
  
  //In case the options is string
  if (typeof options === 'string') {
    options = {
      content: options
    };
  }
  
  //Merge options
  if (options) {
    for (var i in options) {
      this.options[i] = options[i];
    }
  }
  
  if (typeof this.options.content !== 'string') {
    throw new Error("Expected 'content' as string!");
  }
  
  if (this.options.content.length === 0 /* || this.options.content.length > 7089 */) {
    throw new Error("Expected 'content' to be non-empty!");
  }
  
  if (!(this.options.padding >= 0)) {
    throw new Error("Expected 'padding' value to be non-negative!");
  }
  
  if (!(this.options.width > 0) || !(this.options.height > 0)) {
    throw new Error("Expected 'width' or 'height' value to be higher than zero!");
  }
  
  //Gets the error correction level
  function _getErrorCorrectLevel(ecl) {
    switch (ecl) {
        case "L":
          return QRErrorCorrectLevel.L;
          
        case "M":
          return QRErrorCorrectLevel.M;
          
        case "Q":
          return QRErrorCorrectLevel.Q;
          
        case "H":
          return QRErrorCorrectLevel.H;
          
        default:
          throw new Error("Unknwon error correction level: " + ecl);
      }
  }
  
  //Get type number
  function _getTypeNumber(content, ecl) {      
    var length = _getUTF8Length(content);
    
    var type = 1;
    var limit = 0;
    for (var i = 0, len = QRCodeLimitLength.length; i <= len; i++) {
      var table = QRCodeLimitLength[i];
      if (!table) {
        throw new Error("Content too long: expected " + limit + " but got " + length);
      }
      
      switch (ecl) {
        case "L":
          limit = table[0];
          break;
          
        case "M":
          limit = table[1];
          break;
          
        case "Q":
          limit = table[2];
          break;
          
        case "H":
          limit = table[3];
          break;
          
        default:
          throw new Error("Unknwon error correction level: " + ecl);
      }
      
      if (length <= limit) {
        break;
      }
      
      type++;
    }
    
    if (type > QRCodeLimitLength.length) {
      throw new Error("Content too long");
    }
    
    return type;
  }

  //Gets text length
  function _getUTF8Length(content) {
    var result = encodeURI(content).toString().replace(/\%[0-9a-fA-F]{2}/g, 'a');
    return result.length + (result.length != content ? 3 : 0);
  }
  
  //Generate QR Code matrix
  var content = this.options.content;
  var type = _getTypeNumber(content, this.options.ecl);
  var ecl = _getErrorCorrectLevel(this.options.ecl);
  this.qrcode = new QRCodeModel(type, ecl);
  this.qrcode.addData(content);
  this.qrcode.make();
}

/** Generates QR Code as SVG image */
QRCode.prototype.svg = function(opt) {
  var options = this.options || { };
  var modules = this.qrcode.modules;
  
  if (typeof opt == "undefined") {
    opt = { container: options.container || "svg" };
  }
  
  //Apply new lines and indents in SVG?
  var pretty = typeof options.pretty != "undefined" ? !!options.pretty : true;
  
  var indent = pretty ? '  ' : '';
  var EOL = pretty ? '\r\n' : '';
  var width = options.width;
  var height = options.height;
  var length = modules.length;
  var xsize = width / (length + 2 * options.padding);
  var ysize = height / (length + 2 * options.padding);
  
  //Join (union, merge) rectangles into one shape?
  var join = typeof options.join != "undefined" ? !!options.join : false;
  
  //Swap the X and Y modules, pull request #2
  var swap = typeof options.swap != "undefined" ? !!options.swap : false;
  
  //Apply <?xml...?> declaration in SVG?
  var xmlDeclaration = typeof options.xmlDeclaration != "undefined" ? !!options.xmlDeclaration : true;
  
  //Populate with predefined shape instead of "rect" elements, thanks to @kkocdko
  var predefined = typeof options.predefined != "undefined" ? !!options.predefined : false;
  var defs = predefined ? indent + '<defs><path id="qrmodule" d="M0 0 h' + ysize + ' v' + xsize + ' H0 z" style="fill:' + options.color + ';shape-rendering:crispEdges;" /></defs>' + EOL : '';
  
  //Background rectangle
  var bgrect = indent + '<rect x="0" y="0" width="' + width + '" height="' + height + '" style="fill:' + options.background + ';shape-rendering:crispEdges;"/>' + EOL;
  
  //Rectangles representing modules
  var modrect = '';
  var pathdata = '';

  for (var y = 0; y < length; y++) {
    for (var x = 0; x < length; x++) {
      var module = modules[x][y];
      if (module) {
        
        var px = (x * xsize + options.padding * xsize);
        var py = (y * ysize + options.padding * ysize);
        
        //Some users have had issues with the QR Code, thanks to @danioso for the solution
        if (swap) {
          var t = px;
          px = py;
          py = t;
        }
        
        if (join) {
          //Module as a part of svg path data, thanks to @danioso
          var w = xsize + px;
          var h = ysize + py;

          px = (Number.isInteger(px))? Number(px): px.toFixed(2);
          py = (Number.isInteger(py))? Number(py): py.toFixed(2);
          w = (Number.isInteger(w))? Number(w): w.toFixed(2);
          h = (Number.isInteger(h))? Number(h): h.toFixed(2);

          pathdata += ('M' + px + ',' + py + ' V' + h + ' H' + w + ' V' + py + ' H' + px + ' Z ');
        }
        else if (predefined) {
          //Module as a predefined shape, thanks to @kkocdko
          modrect += indent + '<use x="' + px.toString() + '" y="' + py.toString() + '" href="#qrmodule" />' + EOL;
        }
        else {
          //Module as rectangle element
          modrect += indent + '<rect x="' + px.toString() + '" y="' + py.toString() + '" width="' + xsize + '" height="' + ysize + '" style="fill:' + options.color + ';shape-rendering:crispEdges;"/>' + EOL;
        }
      }
    }
  }
  
  if (join) {
    modrect = indent + '<path x="0" y="0" style="fill:' + options.color + ';shape-rendering:crispEdges;" d="' + pathdata + '" />';
  }

  var svg = "";
  switch (opt.container) {
    //Wrapped in SVG document
    case "svg":
      if (xmlDeclaration) {
        svg += '<?xml version="1.0" standalone="yes"?>' + EOL;
      }
      svg += '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="' + width + '" height="' + height + '">' + EOL;
      svg += defs + bgrect + modrect;
      svg += '</svg>';
      break;
      
    //Viewbox for responsive use in a browser, thanks to @danioso
    case "svg-viewbox":
      if (xmlDeclaration) {
        svg += '<?xml version="1.0" standalone="yes"?>' + EOL;
      }
      svg += '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 ' + width + ' ' + height + '">' + EOL;
      svg += defs + bgrect + modrect;
      svg += '</svg>';
      break;
      
    
    //Wrapped in group element    
    case "g":
      svg += '<g width="' + width + '" height="' + height + '">' + EOL;
      svg += defs + bgrect + modrect;
      svg += '</g>';
      break;
      
    //Without a container
    default:
      svg += (defs + bgrect + modrect).replace(/^\s+/, ""); //Clear indents on each line
      break;
  }
  
  return svg;
};

/** Writes QR Code image to a file */
QRCode.prototype.save = function(file, callback) {
  var data = this.svg();
  if (typeof callback != "function") {
    callback = function(error, result) { };
  }
  try {
    //Package 'fs' is available in node.js but not in a web browser
    var fs = require$$0;
    fs.writeFile(file, data, callback);
  }
  catch (e) {
    //Sorry, 'fs' is not available
    callback(e);
  }
};

{
  module.exports = QRCode;
}
});

/* src/components/QRMaker.svelte generated by Svelte v3.18.1 */
const file = "src/components/QRMaker.svelte";

// (64:8) {#if urlSvg}
function create_if_block_1(ctx) {
	let img;
	let img_src_value;

	const block = {
		c: function create() {
			img = element("img");
			attr_dev(img, "class", "qrcode w-full h-full");
			attr_dev(img, "alt", /*text*/ ctx[0]);
			attr_dev(img, "title", /*text*/ ctx[0]);
			if (img.src !== (img_src_value = /*urlSvg*/ ctx[1])) attr_dev(img, "src", img_src_value);
			add_location(img, file, 64, 10, 1850);
		},
		m: function mount(target, anchor) {
			insert_dev(target, img, anchor);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*text*/ 1) {
				attr_dev(img, "alt", /*text*/ ctx[0]);
			}

			if (dirty & /*text*/ 1) {
				attr_dev(img, "title", /*text*/ ctx[0]);
			}

			if (dirty & /*urlSvg*/ 2 && img.src !== (img_src_value = /*urlSvg*/ ctx[1])) {
				attr_dev(img, "src", img_src_value);
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(img);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_1.name,
		type: "if",
		source: "(64:8) {#if urlSvg}",
		ctx
	});

	return block;
}

// (72:6) {#if text}
function create_if_block$1(ctx) {
	let div;
	let a0;
	let t0;
	let a0_href_value;
	let t1;
	let a1;
	let t2;
	let a1_href_value;

	const block = {
		c: function create() {
			div = element("div");
			a0 = element("a");
			t0 = text("Download PNG");
			t1 = space();
			a1 = element("a");
			t2 = text("Download SVG");
			attr_dev(a0, "class", "download svelte-7p41mg");
			attr_dev(a0, "download", "qrcode.png");
			attr_dev(a0, "href", a0_href_value = API_BASE + "makeqrpng.js?target=" + /*text*/ ctx[0]);
			add_location(a0, file, 73, 10, 2040);
			attr_dev(a1, "class", "download svelte-7p41mg");
			attr_dev(a1, "download", "qrcode.svg");
			attr_dev(a1, "href", a1_href_value = API_BASE + "makeqrsvg.js?target=" + /*text*/ ctx[0]);
			add_location(a1, file, 79, 10, 2217);
			add_location(div, file, 72, 8, 2024);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, a0);
			append_dev(a0, t0);
			append_dev(div, t1);
			append_dev(div, a1);
			append_dev(a1, t2);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*text*/ 1 && a0_href_value !== (a0_href_value = API_BASE + "makeqrpng.js?target=" + /*text*/ ctx[0])) {
				attr_dev(a0, "href", a0_href_value);
			}

			if (dirty & /*text*/ 1 && a1_href_value !== (a1_href_value = API_BASE + "makeqrsvg.js?target=" + /*text*/ ctx[0])) {
				attr_dev(a1, "href", a1_href_value);
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block$1.name,
		type: "if",
		source: "(72:6) {#if text}",
		ctx
	});

	return block;
}

function create_fragment$1(ctx) {
	let div4;
	let div3;
	let h1;
	let t1;
	let div2;
	let div0;
	let input;
	let t2;
	let div1;
	let t3;
	let dispose;
	let if_block0 = /*urlSvg*/ ctx[1] && create_if_block_1(ctx);
	let if_block1 = /*text*/ ctx[0] && create_if_block$1(ctx);

	const block = {
		c: function create() {
			div4 = element("div");
			div3 = element("div");
			h1 = element("h1");
			h1.textContent = "QRCode generater";
			t1 = space();
			div2 = element("div");
			div0 = element("div");
			input = element("input");
			t2 = space();
			div1 = element("div");
			if (if_block0) if_block0.c();
			t3 = space();
			if (if_block1) if_block1.c();
			add_location(h1, file, 54, 4, 1483);
			attr_dev(input, "class", "shadow appearance-none border rounded w-full py-2 px-3\n          text-gray-700 leading-tight focus:outline-none focus:shadow-outline");
			add_location(input, file, 57, 8, 1539);
			add_location(div0, file, 56, 6, 1525);
			attr_dev(div1, "class", "qrframe border rounded w-full h-auto sm:w-64 sm:h-64 my-4");
			add_location(div1, file, 62, 6, 1747);
			add_location(div2, file, 55, 4, 1513);
			attr_dev(div3, "class", "contents m-5 w-10/12 sm:w-64");
			add_location(div3, file, 53, 2, 1436);
			attr_dev(div4, "class", "flex justify-center");
			add_location(div4, file, 52, 0, 1400);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div4, anchor);
			append_dev(div4, div3);
			append_dev(div3, h1);
			append_dev(div3, t1);
			append_dev(div3, div2);
			append_dev(div2, div0);
			append_dev(div0, input);
			set_input_value(input, /*text*/ ctx[0]);
			append_dev(div2, t2);
			append_dev(div2, div1);
			if (if_block0) if_block0.m(div1, null);
			append_dev(div2, t3);
			if (if_block1) if_block1.m(div2, null);
			dispose = listen_dev(input, "input", /*input_input_handler*/ ctx[8]);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*text*/ 1 && input.value !== /*text*/ ctx[0]) {
				set_input_value(input, /*text*/ ctx[0]);
			}

			if (/*urlSvg*/ ctx[1]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_1(ctx);
					if_block0.c();
					if_block0.m(div1, null);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (/*text*/ ctx[0]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block$1(ctx);
					if_block1.c();
					if_block1.m(div2, null);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div4);
			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$1.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

const API_BASE = "./api/";

function getDataURLFromSVG(svg) {
	return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function blankRectangleSVG(color = "#ffffff", size = 100) {
	return getDataURLFromSVG(`<?xml version="1.0" standalone="yes"?>
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${size}" height="${size}">
    <rect x="0" y="0" width="${size}" height="${size}"  style="fill:${color};" />
    </svg>`);
}

function instance$1($$self, $$props, $$invalidate) {
	let text = "";
	let option = { type: "svg" };
	let color = "#000000";
	let background = "#ffffff";
	let ecl = "M";
	let urlSvg = blankRectangleSVG(background);

	const debounce = (fn, time) => {
		let timeout;

		return function () {
			const functionCall = () => fn.apply(this, arguments);
			clearTimeout(timeout);
			timeout = setTimeout(functionCall, time);
		};
	};

	const textToDataUrlSvg = (source, opt) => {
		return getDataURLFromSVG(new qrcode({
				...opt,
				content: source,
				join: true,
				container: "svg-viewbox"
			}).svg());
	};

	function input_input_handler() {
		text = this.value;
		$$invalidate(0, text);
	}

	$$self.$capture_state = () => {
		return {};
	};

	$$self.$inject_state = $$props => {
		if ("text" in $$props) $$invalidate(0, text = $$props.text);
		if ("option" in $$props) option = $$props.option;
		if ("color" in $$props) $$invalidate(3, color = $$props.color);
		if ("background" in $$props) $$invalidate(4, background = $$props.background);
		if ("ecl" in $$props) $$invalidate(5, ecl = $$props.ecl);
		if ("urlSvg" in $$props) $$invalidate(1, urlSvg = $$props.urlSvg);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*text*/ 1) {
			 debounce(
				async () => {
					$$invalidate(1, urlSvg = text
					? textToDataUrlSvg(text, { color, background, ecl })
					: blankRectangleSVG(background));
				},
				500
			)();
		}
	};

	return [
		text,
		urlSvg,
		option,
		color,
		background,
		ecl,
		debounce,
		textToDataUrlSvg,
		input_input_handler
	];
}

class QRMaker extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "QRMaker",
			options,
			id: create_fragment$1.name
		});
	}
}

let width = 500;
let height = 500;

const value = writable('');
const reading = writable(false);

/**
 * RxStream of qrdata
 * @type {Readable<string>}
 */
const qrdata$ = derived(value, $value => $value);
/**
 * RxStream whether reading or nor
 * @type {Readable<boolean>}
 */
const isReading$ = derived(reading, $reading => $reading);

let video = null;
let _videoElement = null;
let mediaStream = null;

/**
 * setVideo to view camera or capture
 * @param {string | HTMLElement} elm
 * @return {void} 
 */
function setVideoElement(elm) {
  _videoElement = elm;
}

function getVideoElement() {
  if (typeof _videoElement === "string") {
    return document.querySelector(_videoElement);
  } else {
    return _videoElement;
  }

}


async function startAnalyzing(video) {
  const [height, width] = [video.videoHeight, video.videoWidth];
  const canv = document.createElement("canvas");
  canv.height = height;
  canv.width = width;

  const context = canv.getContext("2d");
  let jsQRModule;
  console.log("loaded library...");

  const interval = setInterval(async () => {
    if (!video || video.paused || video.ended) {
      clearInterval(interval);
      return;
    }
    console.log("search .....");
    context.drawImage(video, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);
    jsQRModule = jsQRModule || await import('./jsQR-750c4cd6.js');
    const code = jsQRModule.default(imageData.data, width, height);
    if (code && code.data !== get_store_value(value)) {
      console.log("Found QR code", code, code.data);
      value.set(code.data);
    }
  }, 500);
}


async function startReading(mediaFunc) {
  if (get_store_value(reading)) stop();
  reading.set(true);
  mediaStream = await mediaFunc({
    audio: false,
    video: {
      width,
      height,
      frameRate: { ideal: 5, max: 15 }
    }
  });
  if (getVideoElement()) {
    video = getVideoElement();
  } else {
    video = document.createElement("video");
    video.height = height;
    video.width = width;
  }
  video.srcObject = mediaStream;
  video.onloadedmetadata = () => {
    video.play();
    startAnalyzing(video);
  };
}

function startCamera() {
  console.log("startCamera");
  startReading(navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices));
}

function startCapture() {
  console.log("startCapture");
  startReading(navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices));
}

function stop() {
  if (video) video.pause();
  if (mediaStream)
    mediaStream.getVideoTracks().forEach(track => track.stop());
  mediaStream = null;
  video = null;
  reading.set(false);
  console.log("stopped");
}

function toggleCamera() {
  if (get_store_value(reading)) {
    stop();
  } else {
    startCamera();
  }
}

function toggleCapture() {
  if (get_store_value(reading)) {
    stop();
  } else {
    startCapture();
  }
}

/* src/components/QRCapture.svelte generated by Svelte v3.18.1 */
const file$1 = "src/components/QRCapture.svelte";

// (22:39) {:else}
function create_else_block$1(ctx) {
	let t;

	const block = {
		c: function create() {
			t = text("読み取り開始");
		},
		m: function mount(target, anchor) {
			insert_dev(target, t, anchor);
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(t);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_else_block$1.name,
		type: "else",
		source: "(22:39) {:else}",
		ctx
	});

	return block;
}

// (22:14) {#if $isReading$}
function create_if_block$2(ctx) {
	let t;

	const block = {
		c: function create() {
			t = text("読み取りストップ");
		},
		m: function mount(target, anchor) {
			insert_dev(target, t, anchor);
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(t);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block$2.name,
		type: "if",
		source: "(22:14) {#if $isReading$}",
		ctx
	});

	return block;
}

function create_fragment$2(ctx) {
	let div7;
	let t0;
	let section0;
	let div2;
	let div1;
	let div0;
	let b_message;
	let t1;
	let t2;
	let section1;
	let div6;
	let div5;
	let div4;
	let div3;
	let button;
	let dispose;

	function select_block_type(ctx, dirty) {
		if (/*$isReading$*/ ctx[1]) return create_if_block$2;
		return create_else_block$1;
	}

	let current_block_type = select_block_type(ctx);
	let if_block = current_block_type(ctx);

	const block = {
		c: function create() {
			div7 = element("div");
			t0 = text("QR Code Capture test\n  ");
			section0 = element("section");
			div2 = element("div");
			div1 = element("div");
			div0 = element("div");
			b_message = element("b-message");
			t1 = text(/*$qrdata$*/ ctx[0]);
			t2 = space();
			section1 = element("section");
			div6 = element("div");
			div5 = element("div");
			div4 = element("div");
			div3 = element("div");
			button = element("button");
			if_block.c();
			add_location(b_message, file$1, 10, 10, 235);
			attr_dev(div0, "class", "column");
			add_location(div0, file$1, 9, 8, 204);
			attr_dev(div1, "class", "columns");
			add_location(div1, file$1, 8, 6, 174);
			attr_dev(div2, "class", "container");
			add_location(div2, file$1, 7, 4, 144);
			add_location(section0, file$1, 6, 2, 130);
			attr_dev(button, "class", "button");
			add_location(button, file$1, 20, 12, 523);
			attr_dev(div3, "class", "column");
			add_location(div3, file$1, 19, 10, 490);
			attr_dev(div4, "class", "columns");
			add_location(div4, file$1, 18, 8, 458);
			attr_dev(div5, "class", "container");
			add_location(div5, file$1, 17, 6, 426);
			attr_dev(div6, "class", "hero-body hero-body-hp-main");
			add_location(div6, file$1, 16, 4, 378);
			attr_dev(section1, "class", "hero is-medium has-text-centered");
			add_location(section1, file$1, 15, 2, 323);
			add_location(div7, file$1, 4, 0, 99);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div7, anchor);
			append_dev(div7, t0);
			append_dev(div7, section0);
			append_dev(section0, div2);
			append_dev(div2, div1);
			append_dev(div1, div0);
			append_dev(div0, b_message);
			append_dev(b_message, t1);
			append_dev(div7, t2);
			append_dev(div7, section1);
			append_dev(section1, div6);
			append_dev(div6, div5);
			append_dev(div5, div4);
			append_dev(div4, div3);
			append_dev(div3, button);
			if_block.m(button, null);
			dispose = listen_dev(button, "click", /*click_handler*/ ctx[2], false, false, false);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*$qrdata$*/ 1) set_data_dev(t1, /*$qrdata$*/ ctx[0]);

			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
				if_block.d(1);
				if_block = current_block_type(ctx);

				if (if_block) {
					if_block.c();
					if_block.m(button, null);
				}
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div7);
			if_block.d();
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$2.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$2($$self, $$props, $$invalidate) {
	let $qrdata$;
	let $isReading$;
	validate_store(qrdata$, "qrdata$");
	component_subscribe($$self, qrdata$, $$value => $$invalidate(0, $qrdata$ = $$value));
	validate_store(isReading$, "isReading$");
	component_subscribe($$self, isReading$, $$value => $$invalidate(1, $isReading$ = $$value));
	const click_handler = () => toggleCapture();

	$$self.$capture_state = () => {
		return {};
	};

	$$self.$inject_state = $$props => {
		if ("$qrdata$" in $$props) qrdata$.set($qrdata$ = $$props.$qrdata$);
		if ("$isReading$" in $$props) isReading$.set($isReading$ = $$props.$isReading$);
	};

	return [$qrdata$, $isReading$, click_handler];
}

class QRCapture extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "QRCapture",
			options,
			id: create_fragment$2.name
		});
	}
}

/* src/components/QRCamera.svelte generated by Svelte v3.18.1 */

const file$2 = "src/components/QRCamera.svelte";

// (30:39) {:else}
function create_else_block$2(ctx) {
	let t;

	const block = {
		c: function create() {
			t = text("読み取り開始");
		},
		m: function mount(target, anchor) {
			insert_dev(target, t, anchor);
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(t);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_else_block$2.name,
		type: "else",
		source: "(30:39) {:else}",
		ctx
	});

	return block;
}

// (30:14) {#if $isReading$}
function create_if_block$3(ctx) {
	let t;

	const block = {
		c: function create() {
			t = text("読み取りストップ");
		},
		m: function mount(target, anchor) {
			insert_dev(target, t, anchor);
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(t);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block$3.name,
		type: "if",
		source: "(30:14) {#if $isReading$}",
		ctx
	});

	return block;
}

function create_fragment$3(ctx) {
	let div9;
	let t0;
	let section0;
	let div2;
	let div1;
	let div0;
	let b_message;
	let t1;
	let t2;
	let section1;
	let div8;
	let div7;
	let div4;
	let div3;
	let button;
	let t3;
	let div6;
	let div5;
	let video;
	let dispose;

	function select_block_type(ctx, dirty) {
		if (/*$isReading$*/ ctx[1]) return create_if_block$3;
		return create_else_block$2;
	}

	let current_block_type = select_block_type(ctx);
	let if_block = current_block_type(ctx);

	const block = {
		c: function create() {
			div9 = element("div");
			t0 = text("QR Code Camera test\n  ");
			section0 = element("section");
			div2 = element("div");
			div1 = element("div");
			div0 = element("div");
			b_message = element("b-message");
			t1 = text(/*$qrdata$*/ ctx[0]);
			t2 = space();
			section1 = element("section");
			div8 = element("div");
			div7 = element("div");
			div4 = element("div");
			div3 = element("div");
			button = element("button");
			if_block.c();
			t3 = space();
			div6 = element("div");
			div5 = element("div");
			video = element("video");
			add_location(b_message, file$2, 18, 10, 335);
			attr_dev(div0, "class", "column");
			add_location(div0, file$2, 17, 8, 304);
			attr_dev(div1, "class", "columns");
			add_location(div1, file$2, 16, 6, 274);
			attr_dev(div2, "class", "container");
			add_location(div2, file$2, 15, 4, 244);
			add_location(section0, file$2, 14, 2, 230);
			attr_dev(button, "class", "button");
			add_location(button, file$2, 28, 12, 623);
			attr_dev(div3, "class", "column");
			add_location(div3, file$2, 27, 10, 590);
			attr_dev(div4, "class", "columns");
			add_location(div4, file$2, 26, 8, 558);
			attr_dev(video, "width", /*width*/ ctx[2]);
			attr_dev(video, "height", /*height*/ ctx[3]);
			video.autoplay = true;
			add_location(video, file$2, 35, 12, 864);
			attr_dev(div5, "class", "column");
			add_location(div5, file$2, 34, 10, 831);
			attr_dev(div6, "class", "columns");
			add_location(div6, file$2, 33, 8, 799);
			attr_dev(div7, "class", "container");
			add_location(div7, file$2, 25, 6, 526);
			attr_dev(div8, "class", "hero-body hero-body-hp-main");
			add_location(div8, file$2, 24, 4, 478);
			attr_dev(section1, "class", "hero is-medium has-text-centered");
			add_location(section1, file$2, 23, 2, 423);
			add_location(div9, file$2, 12, 0, 200);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div9, anchor);
			append_dev(div9, t0);
			append_dev(div9, section0);
			append_dev(section0, div2);
			append_dev(div2, div1);
			append_dev(div1, div0);
			append_dev(div0, b_message);
			append_dev(b_message, t1);
			append_dev(div9, t2);
			append_dev(div9, section1);
			append_dev(section1, div8);
			append_dev(div8, div7);
			append_dev(div7, div4);
			append_dev(div4, div3);
			append_dev(div3, button);
			if_block.m(button, null);
			append_dev(div7, t3);
			append_dev(div7, div6);
			append_dev(div6, div5);
			append_dev(div5, video);
			dispose = listen_dev(button, "click", /*click_handler*/ ctx[4], false, false, false);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*$qrdata$*/ 1) set_data_dev(t1, /*$qrdata$*/ ctx[0]);

			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
				if_block.d(1);
				if_block = current_block_type(ctx);

				if (if_block) {
					if_block.c();
					if_block.m(button, null);
				}
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div9);
			if_block.d();
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$3.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$3($$self, $$props, $$invalidate) {
	let $qrdata$;
	let $isReading$;
	validate_store(qrdata$, "qrdata$");
	component_subscribe($$self, qrdata$, $$value => $$invalidate(0, $qrdata$ = $$value));
	validate_store(isReading$, "isReading$");
	component_subscribe($$self, isReading$, $$value => $$invalidate(1, $isReading$ = $$value));
	let width = 500;
	let height = 500;
	setVideoElement("video");
	const click_handler = () => toggleCamera();

	$$self.$capture_state = () => {
		return {};
	};

	$$self.$inject_state = $$props => {
		if ("width" in $$props) $$invalidate(2, width = $$props.width);
		if ("height" in $$props) $$invalidate(3, height = $$props.height);
		if ("$qrdata$" in $$props) qrdata$.set($qrdata$ = $$props.$qrdata$);
		if ("$isReading$" in $$props) isReading$.set($isReading$ = $$props.$isReading$);
	};

	return [$qrdata$, $isReading$, width, height, click_handler];
}

class QRCamera extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "QRCamera",
			options,
			id: create_fragment$3.name
		});
	}
}

const routes = {
  '/': QRMaker,
  '/capture': QRCapture,
  '/camera': QRCamera
};

const params$ = derived(querystring, $querystring => {
  const urlParams = new URLSearchParams($querystring);
  const result = {};
  for (const [key, value] of urlParams) {
    result[key] = value;
  }
  return result;
});

/* src/App.svelte generated by Svelte v3.18.1 */
const file$3 = "src/App.svelte";

function create_fragment$4(ctx) {
	let main;
	let a0;
	let link_action;
	let active_action;
	let t1;
	let a1;
	let link_action_1;
	let active_action_1;
	let t3;
	let a2;
	let link_action_2;
	let active_action_2;
	let t5;
	let current;
	let dispose;
	const router = new Router({ props: { routes }, $$inline: true });

	const block = {
		c: function create() {
			main = element("main");
			a0 = element("a");
			a0.textContent = "make";
			t1 = space();
			a1 = element("a");
			a1.textContent = "camera";
			t3 = space();
			a2 = element("a");
			a2.textContent = "capture";
			t5 = space();
			create_component(router.$$.fragment);
			attr_dev(a0, "href", "/");
			add_location(a0, file$3, 14, 2, 393);
			attr_dev(a1, "href", "/camera");
			add_location(a1, file$3, 15, 2, 436);
			attr_dev(a2, "href", "/capture");
			add_location(a2, file$3, 16, 2, 487);
			attr_dev(main, "class", "overflow-hidden");
			add_location(main, file$3, 13, 0, 360);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, main, anchor);
			append_dev(main, a0);
			append_dev(main, t1);
			append_dev(main, a1);
			append_dev(main, t3);
			append_dev(main, a2);
			append_dev(main, t5);
			mount_component(router, main, null);
			current = true;

			dispose = [
				action_destroyer(link_action = link.call(null, a0)),
				action_destroyer(active_action = active.call(null, a0)),
				action_destroyer(link_action_1 = link.call(null, a1)),
				action_destroyer(active_action_1 = active.call(null, a1)),
				action_destroyer(link_action_2 = link.call(null, a2)),
				action_destroyer(active_action_2 = active.call(null, a2))
			];
		},
		p: noop,
		i: function intro(local) {
			if (current) return;
			transition_in(router.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(router.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(main);
			destroy_component(router);
			run_all(dispose);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$4.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$4($$self) {
	if ("serviceWorker" in navigator) {
		navigator.serviceWorker.register("/service-worker.js");
	}

	params$.subscribe(params => console.log(params));

	$$self.$capture_state = () => {
		return {};
	};

	$$self.$inject_state = $$props => {
		
	};

	return [];
}

class App extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "App",
			options,
			id: create_fragment$4.name
		});
	}
}

const app = new App({
  target: document.body
});

export { commonjsGlobal as a, createCommonjsModule as c, unwrapExports as u };
//# sourceMappingURL=main-60beb085.js.map
