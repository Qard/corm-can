const Ability = require('..')
const corm = require('corm')

const model = corm('localhost/test')
const User = model('users')
const Post = model('posts')
const UserPosts = model('users_posts')

describe('corm-can', function () {
  it('should extrapolate model name from model class', function () {
    Ability.findName(User).should.equal('users')
  })

  it('should extrapolate model name from model instance', function () {
    Ability.findName(new User({ name: 'me' })).should.equal('users')
  })

  it('should attach ability permissions manually', function () {
    function handler (user) {
      return this.name === user.name
    }

    var a = new Ability()
    a.can('view', User, handler)

    Object.keys(a.abilities).should.have.lengthOf(1)
    a.abilities.should.have.property('users')
    a.abilities.users.should.have.property('actions')
    a.abilities.users.actions.should.have.property('view', handler)
  })

  it('should attach ability permissions at instantiation with ability helper', function () {
    function handler (user) {
      return this.name === user.name
    }

    var a = new Ability(function (can) {
      can('view', User, handler)
    })

    Object.keys(a.abilities).should.have.lengthOf(1)
    a.abilities.should.have.property('users')
    a.abilities.users.should.have.property('actions')
    a.abilities.users.actions.should.have.property('view', handler)
  })

  it('should attach can function to model as static and method', function* () {
    Ability.attach(User, function (can) {
      can('view', User, function (user) {
        return user.active === true
      })
    })

    User.should.have.property('can').and.be.a.Function
    User.prototype.should.have.property('can').and.be.a.Function

    var me = new User({ active: true })
    var them = new User({ active: false })

    var canViewMe = yield User.can(me, 'view', me)
    canViewMe.should.eql(true)

    var canViewThem = yield me.can('view', them)
    canViewThem.should.eql(false)
  })

  it('should do sync checks', function* () {
    var a = new Ability(function (can) {
      can('view', User, function (user) {
        return this.name === user.name
      })
    })

    var me = new User({ name: 'me' })
    var them = new User({ name: 'them' })

    var canEditMe = yield a.check(me, 'view', me)
    canEditMe.should.eql(true)

    var canEditThem = yield a.check(me, 'view', them)
    canEditThem.should.eql(false)
  })

  it('should do async checks', function* () {
    var a = new Ability(function (can) {
      can('update', Post, function* (post) {
        return yield UserPosts.count({
          user_id: this._id,
          post_id: post._id
        })
      })
    })

    var me = yield User.create({
      active: true,
      name: 'me'
    })
    var them = yield User.create({
      active: false,
      name: 'them'
    })

    var post = yield Post.create({
      content: 'content'
    })

    yield UserPosts.create({
      post_id: post._id,
      user_id: me._id
    })

    var canIEdit = yield a.check(me, 'update', post)
    canIEdit.should.eql(true)

    var canTheyEdit = yield a.check(them, 'update', post)
    canTheyEdit.should.eql(false)
  })
})
