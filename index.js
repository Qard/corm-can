module.exports = Ability


/**
 * Construct an ability definition
 *
 * @class Ability
 * @constructor
 *
 * @param {Function} handler Function to run in context of the definition
 */
function Ability (handler) {
  this.abilities = {}
  if (handler) {
    handler.call(this, this.can.bind(this))
  }
}


/**
 * Define a permission validator.
 *
 *   ability.can(['update','destroy'], User, function* (user) {
 *     return this._id.toString() === user._id.toString()
 *   })
 *
 * @method can
 *
 * @param {String} actions Action names to add permissions for
 * @param {Object} target Scope name, or model to derive name from
 * @param {GeneratorFunction} detector Function to determine permissions between objects
 */
Ability.prototype.can = function (actions, target, detector) {
  var name = Ability.findName(target)

  // Create a target spec
  this.abilities[name] = this.abilities[name] || {
    actions: {}
  }

  // If name and target are different, target is a constructor, track it
  if (name !== target) {
    this.abilities[name].model = target
  }

  // If using single-action mode, convert to an array
  if ( ! Array.isArray(actions)) {
    actions = [actions]
  }

  // Add all the validators
  actions.forEach(function (action) {
    this.abilities[name].actions[action] = detector
  }, this)
}


/**
 * Check that source model has permission to do named action on the target.
 *
 *   var me = User.create({
 *     name: 'me'
 *   })
 *   ability.check(me, 'update', me)
 *
 * @method can
 *
 * @param {String} actions Action names to add permissions for
 * @param {Object} target Scope name, or model to derive name from
 * @param {GeneratorFunction} detector Function to determine permissions between objects
 */
Ability.prototype.check = function* (user, action, target) {
  var name = Ability.findName(target)

  var definition = this.abilities[name]
  var handler = definition.actions[action]

  // Support both generators and regular functions
  var res = handler.call(user, target)
  if (typeof res.next === 'function') {
    res = yield res
  }

  return res
}


/**
 * Instantiation sugar
 *
 * @method ability
 * @static
 *
 * @param {Function} handler Function to run in context of the definition
 */
Ability.ability = function (handler) {
  return new Ability(handler)
}


/**
 * Attach can method to statics and prototype of a model
 *
 * @method attach
 * @static
 *
 * @param {Object} model The model to attach can methods onto
 * @param {Function} handler Function to run in context of the definition
 */
Ability.attach = function (model, handler) {
  var ability = new Ability(handler)

  // Add a static that's just a carbon copy of the check method
  model.can = ability.check.bind(ability)

  // Add a prototype method that curries the instance into the check method
  model.prototype.can = function* (action, target) {
    return yield ability.check(this, action, target)
  }

  return ability
}


/**
 * Extrapolate name from model class or instance. Overrideable.
 *
 * @param {Object} instance The model class or instance
 */
Ability.findName = function (instance) {
  if (typeof instance === 'string') {
    return instance
  }

  if (instance.collection && instance.collection.name) {
    return instance.collection.name
  }

  return instance.name
}
