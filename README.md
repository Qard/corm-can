# corm-can

This module lets you attach a simple `can()` method to a model to perform generator-supported ability checking before doing secured operations. This is handy for things like validating that a user owns a post before allowing them to modify it, or making private messages only readable by those included in the conversation.

Also of note, is that this is actually not tied to corm at all. It should work with any ORM where you can add methods to the prototype of a model. It's simply designed and tested specifically to work with corm.

## Usage

```js
const model = corm('localhost/myapp')
const User = model('users')
const Post = model('posts')
const UserPosts = model('users_posts')

// Attach User.can and User.prototype.can
can.attach(User, function (can) {
  // Anyone can view any user model, unless it's not active
  can('view', User, function* (user) {
    return user.active === true
  })

  // But only you can update or destroy your model
  can(['update','destroy'], User, function* (user) {
    return this.admin === true || this._id.toString() === user._id.toString()
  })

  // Posts are editable by anyone with a pivot table entry
  can('update', Post, function* (post) {
    return yield UserPosts.count({
      user_id: this._id,
      post_id: post._id
    })
  })
})

// Let's try some of that out
co(function* () {
  // This is me
  var me = yield User.create({
    active: true,
    name: 'me'
  })

  // This is someone else
  var them = yield User.create({
    active: false,
    name: 'them'
  })

  // And this is a post
  var post = yield Post.create({
    content: 'content'
  })

  // We both own the post
  yield [
    UserPosts.create({
      post_id: post._id,
      user_id: me._id
    }),
    UserPosts.create({
      post_id: post._id,
      user_id: them._id
    })
  ]

  // I can edit my name
  if (yield me.can('update', me)) {
    me.update({
      name: 'me, the first'
    })
  }

  // I can also edit the post
  if (yield me.can('update', post)) {
    post.update({
      text: 'this is some cool text'
    })
  }

  // But they can too!
  if (yield me.can('update', post)) {
    post.update({
      text: 'lol, replaced your text'
    })
  }

  // Grrr...they wrecked my post.
  // I'll show them by deleting their account.
  // Wait, I don't have access. Foiled again, by decent security!
  if (yield me.can('destroy', them)) {
    them.destroy()
  }
})()
```
