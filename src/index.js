'use strict'

/**
 * @name @haluka/box
 * @author Robin Panta
 * @copyright Robin Panta
 * @license MIT
 */

class Container {

	constructor () {
		this._aliases = new Map()
		this._providers = new Map()
		this._options = new Map()
		this._instances = new Map()

		// Proxify self, to allow [this.<name>]
		return proxify(this)
	}

	alias (alias, provider) {
		this._aliases.set(alias, provider)
	}

	register (opts) {

		opts.provider = this._provider(opts.provider)

		this._providers.set(opts.provider, opts)
		if (opts.opts !== undefined)
			this._options.set(opts.provider, opts.opts)

	}

	bind () {
		return this.register(...arguments)
	}

	registered (name) {
		return this._providers.has(name)
	}

	save (provider, instance) {
		provider = this._provider(provider)
		this._instances.set(provider, instance)
	}

	resolve (name, opts = null) {
		let provider = this._resolveAlias(name)

		if (this._instances.has(provider))
			return this._instances.get(provider)

		if (!provider) throw new BindingResolutionError(name)
		provider = this._providers.get(provider)

		if (!this.registered(provider.provider)) {
			throw new BindingResolutionError(name)
		}

		const Content = provider.content
		const resolution = !isClass(Content) ? Content(this, opts || provider.opts || {}) : this._manufacture(Content, opts || provider.opts || {})

		if (provider.singleton == true) {
			this.save(provider.provider, resolution)
		}
		return resolution
	}

	get () {
		return this.resolve(...arguments)
	}

	use () {
		return this.resolve(...arguments)
	}

	_provider (provider) {
		// set if alias specified
		if (typeof(provider) === 'object') {
			this.alias(provider.alias, provider.name)
			provider = provider.name
		}
		return provider
	}

	_resolveAlias (name) {
		if (this._aliases.has(name)) {
			return this._resolveAlias(this._aliases.get(name))
		}
		return name
	}

	_manufacture (ContentClass, opts) {
		const injector = new Proxy(opts, { get: (target, prop) => {
			if (!(prop in opts)) return this.resolve(prop)
			else return opts[prop]
		}})
		return new ContentClass(injector)
	}

}


class Throwable extends Error {
	constructor (message, code) {
		super(message)
		this.name = this.constructor.name
		this.message = message
		this.code = code
		this.message = message
	}
}


class BindingResolutionError extends Throwable {
	constructor (provider) {
		super(`Provider [${provider}] is not registered.`)
	}
}


function isClass(func) {
	return typeof func === 'function'
		&& /^class\s/.test(Function.prototype.toString.call(func))
}


function proxify (container) {
	return new Proxy(container, {
		get: function (target, prop) {
			if (!(prop in target))
				return target.resolve(prop)
			else
				return Reflect.get(...arguments)
		}
	})
}


exports.Container = Container
exports.BindingResolutionError = BindingResolutionError
